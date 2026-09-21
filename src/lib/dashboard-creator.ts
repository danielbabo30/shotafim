import "server-only";
import { cache } from "react";
import type { ContractStatus, DeliverableType, SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import { formatShekels } from "@/lib/dashboard-brand";
import { deliverableLabel } from "@/lib/campaign-brief";
import { getPartnerCategoryLabels } from "@/lib/partner-categories-query";

/**
 * נתוני לוח-הבקרה של היוצר (כובע "יוצר תוכן") — נתונים אמיתיים מ-Prisma
 * (ראה CLAUDE.md §"האזור האישי"), מסונן למשתמש המחובר דרך requireActiveUser().
 *
 * היוצר הוא הספק (Contract.providerId): הכסף נעול בנאמנות אצל המפרסם עד
 * שהסקיצה מאושרת. מעברי סטטוס של EscrowHold עדיין ידניים/אדמין עד חיבור PSP.
 */

export { formatShekels };

export type CreatorKpis = {
  /** זמין למשיכה מיידית — Escrow ששוחרר לספק פחות משיכות שבוצעו */
  availableToWithdraw: number;
  /** מובטח בנאמנות — Escrow נעול על חוזים פעילים */
  escrowGuaranteed: number;
  /** הצעות שהוגשו וממתינות למענה */
  pendingApplications: number;
  /** ציון אמינות והשלמה (0–100) */
  reliabilityScore: number;
};

/** שלב ב-stepper של החוזה (1 → 4) */
export type ContractStep = 1 | 2 | 3 | 4;

export type CreatorContractVM = {
  /** מזהה החוזה — קישור לחדר העבודה */
  id: string;
  brandName: string;
  campaignTitle: string;
  deliverables: string[];
  escrowAmount: number;
  escrowFunded: boolean;
  status: ContractStatus;
  deadlineLabel: string;
  /** מצב ה-timeline: 1 אישור חוזה · 2 העלאת סקיצה · 3 אישור מותג · 4 פרסום ותשלום */
  step: ContractStep;
  stepHint: string;
  cta: { label: string; href: string; primary: boolean };
};

export type CreatorBriefVM = {
  id: string;
  brandName: string;
  title: string;
  description: string;
  categoryLabel: string | null;
  budgetLabel: string;
  href: string;
};

export type CreatorDashboardData = {
  name: string | null;
  hasProfile: boolean;
  headlineHint: string;
  kpis: CreatorKpis;
  contracts: CreatorContractVM[];
  briefs: CreatorBriefVM[];
};

export const CONTRACT_STEPS = ["אישור חוזה", "העלאת סקיצה", "אישור מותג", "פרסום ותשלום"] as const;

const heDeadline = (deadline: Date, now: Date): string => {
  const days = Math.ceil((deadline.getTime() - now.getTime()) / 864e5);
  if (days < 0) return `${Math.abs(days)} ימים באיחור`;
  if (days === 0) return "המועד היום";
  if (days === 1) return "נותר יום אחד";
  return `נותרו ${days} ימים`;
};

type ContractRow = {
  id: string;
  status: ContractStatus;
  deadline: Date;
  agreedPriceILS: unknown;
  campaign: {
    title: string;
    deliverables: DeliverableType[];
    business: { name: string };
  };
  escrowHold: { amountILS: unknown; status: string; fundedAt: Date | null } | null;
  submissions: { status: SubmissionStatus; version: number }[];
};

function toContractVM(c: ContractRow, now: Date): CreatorContractVM {
  const latest = c.submissions[0] ?? null;
  const escrowFunded = c.escrowHold?.fundedAt != null;
  const escrowAmount = Number(c.escrowHold?.amountILS ?? c.agreedPriceILS);

  let step: ContractStep;
  let stepHint: string;
  let cta: CreatorContractVM["cta"];
  const room = {
    label: "מעבר לחדר עבודה וצ׳אט",
    href: `/dashboard/contracts/${c.id}`,
    primary: false,
  };

  if (c.status === "AWAITING_ESCROW" || !escrowFunded) {
    step = 1;
    stepHint = "ממתין להפקדה לנאמנות";
    cta = room;
  } else if (c.status === "SUBMITTED_FOR_REVIEW" || latest?.status === "PENDING_REVIEW") {
    step = 3;
    stepHint = latest ? `סקיצה v${latest.version} בבדיקת המותג` : "הסקיצה בבדיקת המותג";
    cta = room;
  } else if (latest?.status === "REVISION_REQUESTED") {
    step = 2;
    stepHint = `נדרש תיקון לסקיצה v${latest.version}`;
    cta = {
      label: "העלה גרסה מתוקנת",
      href: `/dashboard/contracts/${c.id}`,
      primary: true,
    };
  } else if (c.status === "APPROVED") {
    step = 4;
    stepHint = "אושר — התשלום בדרך לארנק";
    cta = room;
  } else {
    // ACTIVE ללא סקיצה פתוחה
    step = 2;
    stepHint = "מוכן להעלאת סקיצה ראשונה";
    cta = {
      label: "העלה סקיצה ראשונה לבדיקה",
      href: `/dashboard/contracts/${c.id}`,
      primary: true,
    };
  }

  return {
    id: c.id,
    brandName: c.campaign.business.name,
    campaignTitle: c.campaign.title,
    deliverables: c.campaign.deliverables.map(deliverableLabel),
    escrowAmount,
    escrowFunded,
    status: c.status,
    deadlineLabel: heDeadline(c.deadline, now),
    step,
    stepHint,
    cta,
  };
}

const EMPTY_KPIS: CreatorKpis = {
  availableToWithdraw: 0,
  escrowGuaranteed: 0,
  pendingApplications: 0,
  reliabilityScore: 0,
};

export const getCreatorDashboardData = cache(async (): Promise<CreatorDashboardData> => {
  const user = await requireActiveUser();
  const now = new Date();

  if (!user.roleKeys.includes("creator")) {
    return {
      name: user.name,
      hasProfile: false,
      headlineHint: "לוח היוצר זמין לאחר הוספת כובע יוצר תוכן.",
      kpis: EMPTY_KPIS,
      contracts: [],
      briefs: [],
    };
  }

  const [
    profile,
    releasedAgg,
    withdrawnAgg,
    heldAgg,
    pendingApplications,
    contractRows,
    briefRows,
    categoryLabels,
  ] = await Promise.all([
    prisma.creatorProfile.findUnique({
      where: { userId: user.id },
      select: { displayName: true, reliabilityScore: true },
    }),
    prisma.escrowHold.aggregate({
      _sum: { amountILS: true },
      where: { status: "RELEASED_TO_PROVIDER", contract: { providerId: user.id } },
    }),
    prisma.transaction.aggregate({
      _sum: { amountILS: true },
      where: { userId: user.id, type: "WITHDRAWAL", status: "SUCCESS" },
    }),
    prisma.escrowHold.aggregate({
      _sum: { amountILS: true },
      where: { status: "HELD", contract: { providerId: user.id } },
    }),
    prisma.campaignApplication.count({
      where: { applicantId: user.id, status: "SUBMITTED" },
    }),
    prisma.contract.findMany({
      where: {
        providerId: user.id,
        status: { in: ["AWAITING_ESCROW", "ACTIVE", "SUBMITTED_FOR_REVIEW"] },
      },
      orderBy: { deadline: "asc" },
      take: 8,
      select: {
        id: true,
        status: true,
        deadline: true,
        agreedPriceILS: true,
        campaign: {
          select: {
            title: true,
            deliverables: true,
            business: { select: { name: true } },
          },
        },
        escrowHold: { select: { amountILS: true, status: true, fundedAt: true } },
        submissions: {
          orderBy: { version: "desc" },
          take: 1,
          select: { status: true, version: true },
        },
      },
    }),
    prisma.campaign.findMany({
      where: {
        status: "OPEN_FOR_PITCHES",
        targetType: { in: ["CREATOR", "BOTH"] },
        applications: { none: { applicantId: user.id } },
        business: { userId: { not: user.id } },
      },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        title: true,
        description: true,
        totalBudgetILS: true,
        business: { select: { name: true } },
        categories: { select: { categorySlug: true }, take: 1 },
      },
    }),
    getPartnerCategoryLabels(),
  ]);

  const released = Number(releasedAgg._sum.amountILS ?? 0);
  const withdrawn = Number(withdrawnAgg._sum.amountILS ?? 0);
  const escrowGuaranteed = Number(heldAgg._sum.amountILS ?? 0);

  const contracts = (contractRows as ContractRow[]).map((c) => toContractVM(c, now));
  const draftsToUpload = contracts.filter((c) => c.step === 2).length;

  const briefs: CreatorBriefVM[] = briefRows.map((c) => {
    const slug = c.categories[0]?.categorySlug ?? null;
    return {
      id: c.id,
      brandName: c.business.name,
      title: c.title,
      description: c.description,
      categoryLabel: slug ? (categoryLabels[slug] ?? slug) : null,
      budgetLabel: formatShekels(Number(c.totalBudgetILS)),
      href: `/dashboard/campaigns/${c.id}`,
    };
  });

  const hintParts: string[] = [];
  if (draftsToUpload > 0) {
    hintParts.push(`${draftsToUpload} ${draftsToUpload === 1 ? "סקיצה להגשה" : "סקיצות להגשה"}`);
  }
  if (escrowGuaranteed > 0) {
    hintParts.push(`${formatShekels(escrowGuaranteed)} נעולים בנאמנות שממתינים לשחרור`);
  }
  const headlineHint =
    hintParts.length > 0
      ? `יש לך ${hintParts.join(" ו-")}.`
      : "אין משימות דחופות כרגע — עיינו בבריפים החדשים.";

  return {
    name: profile?.displayName ?? user.name,
    hasProfile: profile != null,
    headlineHint,
    kpis: {
      availableToWithdraw: Math.max(0, released - withdrawn),
      escrowGuaranteed,
      pendingApplications,
      reliabilityScore: Math.round(profile?.reliabilityScore ?? 0),
    },
    contracts,
    briefs,
  };
});
