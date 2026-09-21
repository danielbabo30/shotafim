import "server-only";
import { cache } from "react";
import type {
  AnomalySeverity,
  AnomalyType,
  CompensationModel,
  DisputeReason,
  DisputeStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ANOMALY_TYPE_META: Record<AnomalyType, string> = {
  CLICK_ORDER_RATIO_DROP: "יחס קליקים→הזמנות צנח",
  RETURN_RATE_SPIKE: "שיעור החזרות חריג",
  VELOCITY_SPIKE: "קפיצת קצב הזמנות",
  VELOCITY_DROP: "צניחת קצב הזמנות",
  SELF_PURCHASE: "רכישה עצמית (הקונה = היוצר)",
  POST_CHECKPOINT_RETURN: "החזרה אחרי תחנת תשלום",
};

export const ANOMALY_SEVERITY_META: Record<AnomalySeverity, { label: string; className: string }> =
  {
    LOW: { label: "נמוכה", className: "bg-surface-container text-on-surface-variant" },
    MEDIUM: { label: "בינונית", className: "bg-warning-container text-warning" },
    HIGH: { label: "גבוהה", className: "bg-error-container text-on-error-container" },
  };

/**
 * שכבת נתונים למחלוקות — לתור האדמין ולתיק המחלוקת עם ראיות מצורפות (§7 באפיון).
 * הפעולות (openDispute / resolveDispute / issueEnforcement) ב-actions/dispute-actions.ts.
 */

export const DISPUTE_REASON_META: Record<
  DisputeReason,
  { label: string; group: "delivery" | "revenue" }
> = {
  MISSED_DEADLINE: { label: "חריגה מדד-ליין", group: "delivery" },
  LOW_QUALITY: { label: "איכות ירודה", group: "delivery" },
  BRIEF_DEVIATION: { label: "סטייה מהבריף", group: "delivery" },
  NON_RESPONSIVE: { label: "היעדר היענות", group: "delivery" },
  UNDERREPORTED_SALES: { label: "חשד לדיווח חסר של מכירות", group: "revenue" },
  FRAUDULENT_ORDERS: { label: "חשד להזמנות מזויפות", group: "revenue" },
  ATTRIBUTION_DISPUTE: { label: "חילוקי דעות על שיוך מכירה", group: "revenue" },
  PLUGIN_NOT_REPORTING: { label: "התוסף אינו מדווח כנדרש", group: "revenue" },
};

export const DISPUTE_STATUS_META: Record<
  DisputeStatus,
  { label: string; className: string; open: boolean }
> = {
  OPEN: {
    label: "פתוחה",
    className: "bg-warning-container text-warning",
    open: true,
  },
  UNDER_ARBITRATION: {
    label: "בבוררות",
    className: "bg-primary/10 text-primary",
    open: true,
  },
  RESOLVED_PAYOUT: {
    label: "הוכרעה — תשלום לספק",
    className: "bg-success-container text-success",
    open: false,
  },
  RESOLVED_REFUND: {
    label: "הוכרעה — החזר למפרסם",
    className: "bg-success-container text-success",
    open: false,
  },
  SPLIT: {
    label: "הוכרעה — פיצול",
    className: "bg-success-container text-success",
    open: false,
  },
};

/** אילו עילות מחלוקת רלוונטיות לחוזה לפי מודל התגמול שלו. */
export function reasonsForCompensationModel(model: CompensationModel): DisputeReason[] {
  const group = model === "REVENUE_SHARE" ? "revenue" : "delivery";
  return (Object.keys(DISPUTE_REASON_META) as DisputeReason[]).filter(
    (r) => DISPUTE_REASON_META[r].group === group,
  );
}

export type ContractDisputeContext = {
  compensationModel: CompensationModel;
  reasons: { value: DisputeReason; label: string }[];
  existing: { id: string; status: DisputeStatus } | null;
  canOpen: boolean;
};

const DISPUTE_OPENABLE = ["ACTIVE", "SUBMITTED_FOR_REVIEW"];

/**
 * הקשר לרכיב "פתח מחלוקת" בחדר העבודה. הצופה כבר אומת כצד בחוזה ע"י getContractRoom.
 */
export async function getContractDisputeContext(
  contractId: string,
): Promise<ContractDisputeContext | null> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      status: true,
      compensationModel: true,
      dispute: { select: { id: true, status: true } },
    },
  });
  if (!contract) return null;

  return {
    compensationModel: contract.compensationModel,
    reasons: reasonsForCompensationModel(contract.compensationModel).map((value) => ({
      value,
      label: DISPUTE_REASON_META[value].label,
    })),
    existing: contract.dispute,
    canOpen: !contract.dispute && DISPUTE_OPENABLE.includes(contract.status),
  };
}

export type DisputeQueueItem = {
  id: string;
  reason: DisputeReason;
  reasonLabel: string;
  status: DisputeStatus;
  createdAt: Date;
  contractId: string;
  campaignTitle: string;
  businessName: string;
  providerName: string | null;
  compensationModel: CompensationModel;
  anomalyCount: number;
  messageCount: number;
};

/** תור המחלוקות לאדמין — הפתוחות קודם, החדשות למעלה. */
export const getDisputeQueue = cache(async (): Promise<DisputeQueueItem[]> => {
  const rows = await prisma.dispute.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      reason: true,
      status: true,
      createdAt: true,
      contractId: true,
      contract: {
        select: {
          compensationModel: true,
          campaign: { select: { title: true } },
          business: { select: { name: true } },
          provider: { select: { name: true } },
          partnerProgram: {
            select: { _count: { select: { anomalyFlags: { where: { resolvedAt: null } } } } },
          },
        },
      },
      _count: { select: { messages: true } },
    },
  });

  return rows.map((d) => ({
    id: d.id,
    reason: d.reason,
    reasonLabel: DISPUTE_REASON_META[d.reason].label,
    status: d.status,
    createdAt: d.createdAt,
    contractId: d.contractId,
    campaignTitle: d.contract.campaign.title,
    businessName: d.contract.business.name,
    providerName: d.contract.provider.name,
    compensationModel: d.contract.compensationModel,
    anomalyCount: d.contract.partnerProgram?._count.anomalyFlags ?? 0,
    messageCount: d._count.messages,
  }));
});

export type DisputeEvidence = {
  eventLog: { at: Date; action: string; entityType: string; actorName: string | null }[];
  program: {
    refCode: string;
    status: string;
    orders: { total: number; pending: number; approved: number; reversed: number; paid: number };
    grossCommissionILS: number;
    reversalsILS: number;
    clickCount: number;
    checkpoints: { scheduledFor: Date; status: string; paidILS: number }[];
  } | null;
  sites: {
    siteUrl: string;
    status: string;
    lastHeartbeatAt: Date | null;
    openAlerts: { type: string; detectedAt: Date }[];
  }[];
  anomalies: {
    id: string;
    type: AnomalyType;
    typeLabel: string;
    severity: AnomalySeverity;
    detail: string;
    detectedAt: Date;
  }[];
};

export type DisputeDetail = {
  id: string;
  reason: DisputeReason;
  reasonLabel: string;
  description: string;
  status: DisputeStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  arbitratorName: string | null;
  contractId: string;
  campaignTitle: string;
  compensationModel: CompensationModel;
  business: { name: string; userId: string };
  provider: { name: string | null; userId: string };
  initiatorName: string | null;
  agreedPriceILS: number;
  messages: { id: string; senderName: string | null; message: string; createdAt: Date }[];
  enforcementActions: {
    id: string;
    type: string;
    reason: string;
    targetName: string | null;
    amountILS: number | null;
    createdAt: Date;
  }[];
  evidence: DisputeEvidence;
};

/** תיק מחלוקת מלא לאדמין — כולל אגרגציית ראיות. */
export async function getDisputeDetail(id: string): Promise<DisputeDetail | null> {
  const d = await prisma.dispute.findUnique({
    where: { id },
    select: {
      id: true,
      reason: true,
      description: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      resolutionNotes: true,
      arbitrator: { select: { name: true } },
      initiator: { select: { name: true } },
      contractId: true,
      contract: {
        select: {
          compensationModel: true,
          agreedPriceILS: true,
          campaign: { select: { title: true } },
          business: { select: { id: true, name: true, userId: true } },
          provider: { select: { id: true, name: true } },
          providerId: true,
          partnerProgram: {
            select: {
              id: true,
              refCode: true,
              status: true,
              checkpoints: {
                orderBy: { scheduledFor: "asc" },
                select: { scheduledFor: true, status: true, paidILS: true },
              },
              _count: { select: { clicks: true } },
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          message: true,
          createdAt: true,
          sender: { select: { name: true } },
        },
      },
      enforcementActions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          reason: true,
          amountILS: true,
          createdAt: true,
          target: { select: { name: true } },
        },
      },
    },
  });
  if (!d) return null;

  const c = d.contract;
  const program = c.partnerProgram;

  // ── ראיות ──
  const entityIds = [d.contractId, program?.id].filter((v): v is string => Boolean(v));
  const auditRows = await prisma.auditLog.findMany({
    where: { entityId: { in: entityIds } },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      createdAt: true,
      action: true,
      entityType: true,
      user: { select: { name: true } },
    },
  });

  let programEvidence: DisputeEvidence["program"] = null;
  if (program) {
    const grouped = await prisma.attributedOrder.groupBy({
      by: ["status"],
      where: { programId: program.id },
      _count: { _all: true },
      _sum: { commissionAmount: true },
    });
    const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
    const gross = grouped.reduce((s, g) => s + Number(g._sum.commissionAmount ?? 0), 0);
    const reversed = grouped
      .filter((g) => g.status === "REVERSED")
      .reduce((s, g) => s + Number(g._sum.commissionAmount ?? 0), 0);
    programEvidence = {
      refCode: program.refCode,
      status: program.status,
      orders: {
        total: grouped.reduce((s, g) => s + g._count._all, 0),
        pending: byStatus.PENDING ?? 0,
        approved: byStatus.APPROVED ?? 0,
        reversed: byStatus.REVERSED ?? 0,
        paid: byStatus.PAID ?? 0,
      },
      grossCommissionILS: Math.round(gross),
      reversalsILS: Math.round(reversed),
      clickCount: program._count.clicks,
      checkpoints: program.checkpoints.map((cp) => ({
        scheduledFor: cp.scheduledFor,
        status: cp.status,
        paidILS: Number(cp.paidILS),
      })),
    };
  }

  const anomalyRows = program
    ? await prisma.anomalyFlag.findMany({
        where: { programId: program.id, resolvedAt: null },
        orderBy: [{ severity: "desc" }, { detectedAt: "desc" }],
        select: { id: true, type: true, severity: true, detail: true, detectedAt: true },
      })
    : [];

  const siteRows = await prisma.trackedSite.findMany({
    where: { businessId: c.business.id },
    select: {
      siteUrl: true,
      status: true,
      lastHeartbeatAt: true,
      pluginAlerts: {
        where: { resolvedAt: null },
        orderBy: { detectedAt: "desc" },
        select: { type: true, detectedAt: true },
      },
    },
  });

  return {
    id: d.id,
    reason: d.reason,
    reasonLabel: DISPUTE_REASON_META[d.reason].label,
    description: d.description,
    status: d.status,
    createdAt: d.createdAt,
    resolvedAt: d.resolvedAt,
    resolutionNotes: d.resolutionNotes,
    arbitratorName: d.arbitrator?.name ?? null,
    contractId: d.contractId,
    campaignTitle: c.campaign.title,
    compensationModel: c.compensationModel,
    business: { name: c.business.name, userId: c.business.userId },
    provider: { name: c.provider.name, userId: c.providerId },
    initiatorName: d.initiator.name,
    agreedPriceILS: Number(c.agreedPriceILS),
    messages: d.messages.map((m) => ({
      id: m.id,
      senderName: m.sender.name,
      message: m.message,
      createdAt: m.createdAt,
    })),
    enforcementActions: d.enforcementActions.map((e) => ({
      id: e.id,
      type: e.type,
      reason: e.reason,
      targetName: e.target.name,
      amountILS: e.amountILS != null ? Number(e.amountILS) : null,
      createdAt: e.createdAt,
    })),
    evidence: {
      eventLog: auditRows.map((a) => ({
        at: a.createdAt,
        action: a.action,
        entityType: a.entityType,
        actorName: a.user?.name ?? null,
      })),
      program: programEvidence,
      sites: siteRows.map((s) => ({
        siteUrl: s.siteUrl,
        status: s.status,
        lastHeartbeatAt: s.lastHeartbeatAt,
        openAlerts: s.pluginAlerts.map((al) => ({ type: al.type, detectedAt: al.detectedAt })),
      })),
      anomalies: anomalyRows.map((a) => ({
        id: a.id,
        type: a.type,
        typeLabel: ANOMALY_TYPE_META[a.type],
        severity: a.severity,
        detail: a.detail,
        detectedAt: a.detectedAt,
      })),
    },
  };
}
