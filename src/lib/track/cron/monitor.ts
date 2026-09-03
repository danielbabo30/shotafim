import "server-only";
import { prisma } from "@/lib/prisma";
import {
  HEARTBEAT_STALE_HOURS,
  MONITOR_CLICK_LOOKBACK_HOURS,
  MONITOR_GRACE_HOURS,
} from "@/lib/partner-constants";
import { decryptApiKey, sha256Hex } from "@/lib/track/crypto";
import { emailSiteAdminTrackingOffline, notifyPartnership } from "@/lib/track/notify";
import { detectAnomalies } from "@/lib/track/anomaly";

/**
 * "תשלום פר רכישה" — monitor cron (WP-2, §5 + §7).
 *  1. זיהוי היעדרות heartbeat → מכונת מצבים ACTIVE→STALE→OFFLINE + התראות + חלון חסד.
 *  2. תום חלון חסד → השהיה אוטומטית של השותפויות.
 *  3. דגלי אנומליה (AnomalyFlag) לתור האדמין.
 */

const H = 3600_000;

export async function runMonitor(): Promise<{
  markedStale: number;
  markedOffline: number;
  autoPaused: number;
  anomalies: number;
}> {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - HEARTBEAT_STALE_HOURS * H);
  const clickWindow = new Date(now.getTime() - MONITOR_CLICK_LOOKBACK_HOURS * H);

  let markedStale = 0;
  let markedOffline = 0;
  let autoPaused = 0;

  const sites = await prisma.trackedSite.findMany({
    where: { status: { in: ["ACTIVE", "STALE"] } },
    select: {
      id: true,
      businessId: true,
      status: true,
      lastHeartbeatAt: true,
      maintenanceWindows: {
        where: { startsAt: { lte: now }, endsAt: { gte: now } },
        select: { id: true },
      },
    },
  });

  for (const site of sites) {
    if (site.maintenanceWindows.length > 0) continue; // חלון תחזוקה מוצהר — לא מפעיל התראה
    const last = site.lastHeartbeatAt;
    const overdue = !last || last < staleThreshold;
    if (!overdue) continue;

    // האם היו קליקים בחלון? (אחרת סתם אתר לא פעיל — לא מטרידים)
    const recentClicks = await prisma.affiliateClick.count({
      where: {
        occurredAt: { gte: clickWindow },
        program: { contract: { businessId: site.businessId } },
      },
    });
    if (recentClicks === 0 && site.status === "ACTIVE") {
      await prisma.trackedSite.update({
        where: { id: site.id },
        data: { status: "STALE", staleAt: now },
      });
      markedStale++;
      continue;
    }
    if (recentClicks === 0) continue;

    if (site.status === "ACTIVE") {
      await prisma.trackedSite.update({
        where: { id: site.id },
        data: { status: "STALE", staleAt: now },
      });
      markedStale++;
    } else {
      // STALE → OFFLINE: התראה + מייל + חלון חסד
      const programs = await prisma.partnerProgram.findMany({
        where: { contract: { businessId: site.businessId }, status: { in: ["ACTIVE", "GATE_80"] } },
        select: { id: true },
      });
      const graceEndsAt = new Date(now.getTime() + MONITOR_GRACE_HOURS * H);
      await prisma.$transaction(async (tx) => {
        await tx.trackedSite.update({
          where: { id: site.id },
          data: { status: "OFFLINE", offlineAt: now },
        });
        await tx.pluginAlert.create({
          data: {
            siteId: site.id,
            programId: programs[0]?.id ?? null,
            type: "HEARTBEAT_ABSENT",
            detail: `no heartbeat since ${last?.toISOString() ?? "never"}; ${recentClicks} clicks in window`,
            notifiedAt: now,
            graceEndsAt,
          },
        });
      });
      for (const p of programs) {
        await notifyPartnership(p.id, "TRACKING_OFFLINE", {}, "both");
        await notifyPartnership(p.id, "TRACKING_OFFLINE", {}, "admin");
      }
      await emailSiteAdminTrackingOffline(site.id);
      markedOffline++;
    }
  }

  // ── תום חלון חסד → השהיה אוטומטית ──
  const expiredAlerts = await prisma.pluginAlert.findMany({
    where: {
      resolvedAt: null,
      autoPausedAt: null,
      graceEndsAt: { lte: now },
      type: { in: ["HEARTBEAT_ABSENT", "DEACTIVATED"] },
    },
    select: { id: true, siteId: true, site: { select: { businessId: true } } },
  });
  for (const alert of expiredAlerts) {
    const programs = await prisma.partnerProgram.findMany({
      where: {
        contract: { businessId: alert.site.businessId },
        status: { in: ["ACTIVE", "GATE_80"] },
      },
      select: { id: true },
    });
    await prisma.$transaction(async (tx) => {
      await tx.partnerProgram.updateMany({
        where: { id: { in: programs.map((p) => p.id) } },
        data: { status: "PAUSED", pausedAt: now, pauseReason: "tracking_offline" },
      });
      await tx.pluginAlert.update({ where: { id: alert.id }, data: { autoPausedAt: now } });
    });
    for (const p of programs) await notifyPartnership(p.id, "PARTNERSHIP_PAUSED", {});
    autoPaused += programs.length;
  }

  // ── דגלי אנומליה ──
  const activePrograms = await prisma.partnerProgram.findMany({
    where: { status: { in: ["ACTIVE", "GATE_80", "PAUSED"] } },
    select: {
      id: true,
      couponCode: true,
      contract: {
        select: {
          providerId: true,
          provider: { select: { email: true } },
          businessId: true,
        },
      },
    },
  });

  let anomalies = 0;
  for (const prog of activePrograms) {
    // customerHash של היוצר — לזיהוי רכישה עצמית
    let creatorCustomerHashes: string[] = [];
    if (prog.contract.provider.email) {
      const site = await prisma.trackedSite.findFirst({
        where: { businessId: prog.contract.businessId },
        select: { apiKeyEnc: true },
      });
      if (site) {
        try {
          const apiKey = decryptApiKey(site.apiKeyEnc);
          const pepper = sha256Hex(`pepper:${apiKey}`);
          creatorCustomerHashes = [
            sha256Hex(prog.contract.provider.email.trim().toLowerCase() + pepper),
          ];
        } catch {
          /* ignore */
        }
      }
    }
    anomalies += await detectAnomalies(prog.id, creatorCustomerHashes);
  }

  return { markedStale, markedOffline, autoPaused, anomalies };
}
