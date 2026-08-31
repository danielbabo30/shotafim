import "server-only";
import { cache } from "react";

/**
 * נתוני לוח-הבקרה של המפרסם.
 *
 * ⚠️ PLACEHOLDER — שכבת הכסף (Escrow / קמפיינים / תנועות) היא השלב האחרון בתוכנית.
 * כרגע מוחזרים נתוני-דמה קבועים כדי לבנות ולבדוק את ה-UI. כשהמודלים יחוברו,
 * להחליף את גוף הפונקציה בשאילתות Prisma (Campaign / EscrowHold / Transaction /
 * CampaignApplication / DeliverableSubmission) המסוננות לפי המפרסם המחובר —
 * חתימת הפונקציה והטיפוסים אמורים להישאר.
 */

export type ChipTone = "primary" | "neutral" | "warning" | "success";

export type BrandKpis = {
  /** תקציב נעול בנאמנות (Escrow) */
  escrowLocked: number;
  escrowDeals: number;
  /** קמפיינים פעילים */
  activeCampaigns: number;
  activeCampaignsBreakdown: string;
  /** הצעות חדשות שממתינות למענה */
  pendingApplications: number;
  /** תוצרים שממתינים לאישור המפרסם */
  pendingDeliverables: number;
  pendingDeliverablesHint: string;
};

export type CampaignRow = {
  id: string;
  title: string;
  /** שורת מטא — יוצרים + תקציב */
  meta: string;
  status: { label: string; tone: ChipTone };
  href: string;
};

export type LedgerEntry = {
  id: string;
  direction: "in" | "out";
  title: string;
  timestamp: string;
  /** סכום התנועה בשקלים (חיובי; הכיוון נקבע ב-direction) */
  amount: number;
};

export type BrandDashboardData = {
  kpis: BrandKpis;
  campaigns: CampaignRow[];
  ledger: LedgerEntry[];
};

const PLACEHOLDER: BrandDashboardData = {
  kpis: {
    escrowLocked: 28400,
    escrowDeals: 3,
    activeCampaigns: 4,
    activeCampaignsBreakdown: "2 באוויר, 2 בהפקת תוכן",
    pendingApplications: 12,
    pendingDeliverables: 2,
    pendingDeliverablesHint: "סקיצות v2 מוכנות",
  },
  campaigns: [
    {
      id: "c1",
      title: "קמפיין משקאות קיץ 2024",
      meta: "3 יוצרים • תקציב: ₪15,000",
      status: { label: "אישור סקיצה סופית", tone: "warning" },
      href: "/dashboard/campaigns/c1",
    },
    {
      id: "c2",
      title: "השקת סדרת טיפוח חדשה",
      meta: "יוצר אחד • תקציב: ₪8,500",
      status: { label: "ממתין להוכחת שידור", tone: "primary" },
      href: "/dashboard/campaigns/c2",
    },
    {
      id: "c3",
      title: "אתגר כושר אביב — ציוד",
      meta: "בריף פתוח • תקציב משוער: ₪25,000",
      status: { label: "פתוח להצעות", tone: "success" },
      href: "/dashboard/campaigns/c3",
    },
  ],
  ledger: [
    {
      id: "t1",
      direction: "in",
      title: "הפקדה לחשבון נאמנות",
      timestamp: "היום, 10:45",
      amount: 4500,
    },
    {
      id: "t2",
      direction: "out",
      title: "שחרור תשלום ליוצר",
      timestamp: "אתמול, 15:20 • ‎@daniel_foodie",
      amount: 2500,
    },
    {
      id: "t3",
      direction: "in",
      title: "הפקדה לחשבון נאמנות",
      timestamp: "12 באוקטובר, 09:00",
      amount: 12000,
    },
  ],
};

export const getBrandDashboardData = cache(
  async (brandUserId: string): Promise<BrandDashboardData> => {
    void brandUserId; // TODO: שאילתות Prisma מסוננות למפרסם הזה
    return PLACEHOLDER;
  },
);

/** ‎₪12,000 — פורמט קצר, ספרות בלבד, ללא אגורות */
export const formatShekels = (amount: number): string =>
  `₪${Math.round(amount).toLocaleString("en-US")}`;
