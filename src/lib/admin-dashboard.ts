import "server-only";
import { cache } from "react";
import type { AnomalySeverity, PluginAlertType, SiteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDisputeQueue, ANOMALY_TYPE_META } from "@/lib/disputes";

/**
 * נתוני לוח הבקרה של האדמין (§8 באפיון): בריאות ניטור התוסף לכל אתר,
 * התראות פתוחות, הזמנות חסרות מ-digests (= PluginAlert WEBHOOK_MISMATCH),
 * ותור המחלוקות.
 */

export const SITE_STATUS_META: Record<SiteStatus, { label: string; className: string }> = {
  ACTIVE: { label: "מדווח", className: "bg-success-container text-success" },
  STALE: { label: "אין heartbeat > 12ש'", className: "bg-warning-container text-warning" },
  OFFLINE: {
    label: "אופליין — התראה נורתה",
    className: "bg-error-container text-on-error-container",
  },
  DEACTIVATED: { label: "התוסף בוטל", className: "bg-surface-container text-on-surface-variant" },
};

export const PLUGIN_ALERT_META: Record<PluginAlertType, string> = {
  DEACTIVATED: "התוסף בוטל",
  HEARTBEAT_ABSENT: "אין heartbeat",
  WEBHOOK_MISMATCH: "פער בין digest להזמנות שנקלטו",
};

const STUCK_ORDER_DAYS = 3;

export type AdminDashboardData = {
  siteHealth: {
    counts: Record<SiteStatus, number>;
    needsAttention: {
      id: string;
      siteUrl: string;
      businessName: string;
      status: SiteStatus;
      lastHeartbeatAt: Date | null;
      openAlerts: number;
    }[];
  };
  openAlerts: { total: number; byType: Partial<Record<PluginAlertType, number>> };
  webhookMismatches: { siteUrl: string; businessName: string; detectedAt: Date }[];
  stuckOrders: number;
  disputes: {
    openCount: number;
    recent: { id: string; reasonLabel: string; businessName: string; createdAt: Date }[];
  };
  anomalies: {
    openCount: number;
    bySeverity: Partial<Record<AnomalySeverity, number>>;
    recent: {
      id: string;
      typeLabel: string;
      severity: AnomalySeverity;
      detail: string;
      detectedAt: Date;
    }[];
  };
  enforcementLast30d: number;
};

const EMPTY_COUNTS: Record<SiteStatus, number> = {
  ACTIVE: 0,
  STALE: 0,
  OFFLINE: 0,
  DEACTIVATED: 0,
};

export const getAdminDashboardData = cache(async (): Promise<AdminDashboardData> => {
  const since30d = new Date(Date.now() - 30 * 864e5);
  const stuckSince = new Date(Date.now() - STUCK_ORDER_DAYS * 864e5);

  const [
    siteGroups,
    needsAttentionRows,
    alertGroups,
    mismatchRows,
    stuckOrders,
    queue,
    enforcementLast30d,
    anomalyGroups,
    anomalyRecent,
  ] = await Promise.all([
    prisma.trackedSite.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.trackedSite.findMany({
      where: { status: { not: "ACTIVE" } },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: {
        id: true,
        siteUrl: true,
        status: true,
        lastHeartbeatAt: true,
        business: { select: { name: true } },
        _count: { select: { pluginAlerts: { where: { resolvedAt: null } } } },
      },
    }),
    prisma.pluginAlert.groupBy({
      by: ["type"],
      where: { resolvedAt: null },
      _count: { _all: true },
    }),
    prisma.pluginAlert.findMany({
      where: { resolvedAt: null, type: "WEBHOOK_MISMATCH" },
      orderBy: { detectedAt: "desc" },
      take: 10,
      select: {
        detectedAt: true,
        site: { select: { siteUrl: true, business: { select: { name: true } } } },
      },
    }),
    prisma.attributedOrder.count({
      where: { status: "PENDING", orderPlacedAt: { lt: stuckSince } },
    }),
    getDisputeQueue(),
    prisma.enforcementAction.count({ where: { createdAt: { gte: since30d } } }),
    prisma.anomalyFlag.groupBy({
      by: ["severity"],
      where: { resolvedAt: null },
      _count: { _all: true },
    }),
    prisma.anomalyFlag.findMany({
      where: { resolvedAt: null },
      orderBy: [{ severity: "desc" }, { detectedAt: "desc" }],
      take: 8,
      select: { id: true, type: true, severity: true, detail: true, detectedAt: true },
    }),
  ]);

  const counts = { ...EMPTY_COUNTS };
  for (const g of siteGroups) counts[g.status] = g._count._all;

  const byType: Partial<Record<PluginAlertType, number>> = {};
  let alertTotal = 0;
  for (const g of alertGroups) {
    byType[g.type] = g._count._all;
    alertTotal += g._count._all;
  }

  const openDisputes = queue.filter((d) => d.status === "OPEN" || d.status === "UNDER_ARBITRATION");

  const anomalyBySeverity: Partial<Record<AnomalySeverity, number>> = {};
  let anomalyOpen = 0;
  for (const g of anomalyGroups) {
    anomalyBySeverity[g.severity] = g._count._all;
    anomalyOpen += g._count._all;
  }

  return {
    siteHealth: {
      counts,
      needsAttention: needsAttentionRows.map((s) => ({
        id: s.id,
        siteUrl: s.siteUrl,
        businessName: s.business.name,
        status: s.status,
        lastHeartbeatAt: s.lastHeartbeatAt,
        openAlerts: s._count.pluginAlerts,
      })),
    },
    openAlerts: { total: alertTotal, byType },
    webhookMismatches: mismatchRows.map((a) => ({
      siteUrl: a.site.siteUrl,
      businessName: a.site.business.name,
      detectedAt: a.detectedAt,
    })),
    stuckOrders,
    disputes: {
      openCount: openDisputes.length,
      recent: openDisputes.slice(0, 6).map((d) => ({
        id: d.id,
        reasonLabel: d.reasonLabel,
        businessName: d.businessName,
        createdAt: d.createdAt,
      })),
    },
    anomalies: {
      openCount: anomalyOpen,
      bySeverity: anomalyBySeverity,
      recent: anomalyRecent.map((a) => ({
        id: a.id,
        typeLabel: ANOMALY_TYPE_META[a.type],
        severity: a.severity,
        detail: a.detail,
        detectedAt: a.detectedAt,
      })),
    },
    enforcementLast30d,
  };
});
