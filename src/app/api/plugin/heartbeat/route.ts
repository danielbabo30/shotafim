import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTrackRequest, authErrorBody } from "@/lib/track/auth";
import { heartbeatPayloadSchema } from "@/lib/track/schemas";
import { derivePrivacyKey } from "@/lib/track/crypto";
import { badRequest, ok, parseJsonBody } from "@/lib/track/http";

/** POST /api/plugin/heartbeat — אות חיים כל 6 שעות (§5). מחזיר אתר ל-ACTIVE. */
export async function POST(request: Request) {
  const auth = await authenticateTrackRequest(request);
  if (!auth.ok) return NextResponse.json(authErrorBody(auth), { status: auth.status });

  const parsed = heartbeatPayloadSchema.safeParse(parseJsonBody(auth.rawBody));
  if (!parsed.success) return badRequest(parsed.error);
  const hb = parsed.data;

  const now = new Date();
  const wasDeactivated = auth.site.status === "DEACTIVATED"; // עבר auth ⇒ כבוי ע"י התוסף (B-1)
  const wasDown = auth.site.status === "STALE" || auth.site.status === "OFFLINE" || wasDeactivated;

  // batch transaction (לא interactive) — לא נכשל ב-timeout של 5s כשה-DB איטי
  await prisma.$transaction([
    prisma.trackedSite.update({
      where: { id: auth.site.id },
      data: {
        lastHeartbeatAt: now,
        pluginVersion: hb.pluginVersion,
        wooVersion: hb.wooVersion,
        wpVersion: hb.wpVersion ?? null,
        phpVersion: hb.phpVersion ?? null,
        status: "ACTIVE",
        staleAt: null,
        offlineAt: null,
      },
    }),
    ...(wasDown
      ? [
          prisma.pluginAlert.updateMany({
            where: {
              siteId: auth.site.id,
              type: { in: ["HEARTBEAT_ABSENT", "DEACTIVATED"] },
              resolvedAt: null,
            },
            data: { resolvedAt: now },
          }),
        ]
      : []),
  ]);

  const linksLive = await prisma.partnerProgram.count({
    where: {
      contract: { businessId: auth.site.businessId },
      status: { in: ["ACTIVE", "GATE_80"] },
    },
  });

  // SEC-P-13: מפתח פרטיות נמסר רק לבקשה חתומה שמבקשת אותו (פעם אחת, מעל TLS)
  let privacyKey: string | undefined;
  if (hb.needsPrivacyKey) {
    try {
      privacyKey = derivePrivacyKey(auth.site.id);
    } catch {
      privacyKey = undefined;
    }
  }

  return ok({
    ...(privacyKey ? { privacyKey } : {}),
    siteStatus: "ACTIVE",
    linksLive,
    serverTime: now.toISOString(),
    recoveredFrom: wasDown ? auth.site.status : null,
  });
}
