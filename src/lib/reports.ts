import "server-only";
import { cache } from "react";
import type { ChipTone } from "@/lib/dashboard-brand";

/**
 * נתוני עמוד הדוחות של המפרסם — מעקב תקציבים נעולים בנאמנות (Escrow),
 * יומן תנועות וריכוז חשבוניות מס.
 *
 * ⚠️ PLACEHOLDER — שכבת הכסף (Escrow / תנועות / חשבוניות) היא השלב האחרון
 * בתוכנית (ראה dashboard-brand.ts). כרגע מוחזרים נתוני-דמה קבועים כדי לבנות
 * ולבדוק את ה-UI. כשהמודלים יחוברו, להחליף את גוף הפונקציה בשאילתות Prisma
 * (EscrowHold / Transaction / TaxInvoice) המסוננות לפי המפרסם המחובר —
 * חתימת הפונקציה והטיפוסים אמורים להישאר.
 */

export type ReportsKpis = {
  /** תקציב נעול בנאמנות, ממתין לשחרור או אישור קמפיינים */
  escrowLocked: number;
  /** יתרה זמינה להקצאה מיידית */
  availableBalance: number;
  /** סה״כ שוחרר ליוצרים בחודש הנוכחי */
  releasedThisMonth: number;
  /** שורת מגמה מול החודש הקודם */
  releasedTrend: string;
};

export type EscrowStatus = "held" | "released" | "refunded";

export type LedgerTxn = {
  id: string;
  /** מזהה עסקה להצגה (למשל ‎#TRX-9821) */
  ref: string;
  /** שם הקמפיין / התנועה */
  campaign: string;
  /** הצד השני — יוצר / בעל שטח / ספק */
  counterparty: string;
  counterpartyKind: "campaign" | "space" | "video";
  /** תאריך הפקדה, מפורמט להצגה */
  depositedAt: string;
  /** סכום התנועה בשקלים */
  amount: number;
  status: EscrowStatus;
  /** חדר העבודה / הקמפיין המקושר (אופציונלי) */
  href?: string;
};

export type TaxInvoice = {
  id: string;
  /** מספר חשבונית הספק */
  number: string;
  /** שם העוסק / החברה שהפיקה את החשבונית */
  issuedBy: string;
  issuedAt: string;
  amount: number;
};

export type ReportsData = {
  kpis: ReportsKpis;
  ledger: LedgerTxn[];
  /** סה״כ תנועות (לפני חיתוך לעמוד) — placeholder */
  ledgerTotal: number;
  invoices: TaxInvoice[];
  /** החודש שאליו מתייחס קובץ ריכוז החשבוניות */
  bundleMonthLabel: string;
};

/** תווית + גוון תגית לכל סטטוס נאמנות (משותף לעמוד ולאיון הלקוח) */
export const ESCROW_STATUS_META: Record<
  EscrowStatus,
  { label: string; short: string; tone: ChipTone }
> = {
  held: { label: "נעול בנאמנות (HELD)", short: "נעול בנאמנות", tone: "warning" },
  released: { label: "שוחרר לספק (RELEASED)", short: "שוחרר לספק", tone: "success" },
  refunded: { label: "הוחזר בזיכוי (REFUNDED)", short: "הוחזר בזיכוי", tone: "neutral" },
};

const PLACEHOLDER: ReportsData = {
  kpis: {
    escrowLocked: 34200,
    availableBalance: 8500,
    releasedThisMonth: 52000,
    releasedTrend: "+12% מהחודש הקודם",
  },
  ledger: [
    {
      id: "t1",
      ref: "#TRX-9821",
      campaign: "קמפיין קיץ",
      counterparty: "@daniel_foodie",
      counterpartyKind: "campaign",
      depositedAt: "14/08/2026",
      amount: 3500,
      status: "held",
      href: "/dashboard/campaigns",
    },
    {
      id: "t2",
      ref: "#TRX-9704",
      campaign: "מסך עזריאלי",
      counterparty: "מדיה פלוס",
      counterpartyKind: "space",
      depositedAt: "02/08/2026",
      amount: 18500,
      status: "released",
    },
    {
      id: "t3",
      ref: "#TRX-9611",
      campaign: "סרטון סקירה",
      counterparty: "טק ישראל",
      counterpartyKind: "video",
      depositedAt: "28/07/2026",
      amount: 2000,
      status: "refunded",
    },
    {
      id: "t4",
      ref: "#TRX-9560",
      campaign: "קמפיין השקה — סתיו",
      counterparty: "@noa.style",
      counterpartyKind: "campaign",
      depositedAt: "21/07/2026",
      amount: 6200,
      status: "released",
    },
    {
      id: "t5",
      ref: "#TRX-9498",
      campaign: "שילוט אוטובוסים — קו 18",
      counterparty: "אאוטדור מדיה",
      counterpartyKind: "space",
      depositedAt: "09/07/2026",
      amount: 9800,
      status: "held",
      href: "/dashboard/campaigns",
    },
  ],
  ledgerTotal: 42,
  invoices: [
    {
      id: "i1",
      number: "INV-2026-084",
      issuedBy: 'מדיה פלוס בע"מ',
      issuedAt: "05/08/2026",
      amount: 18500,
    },
    {
      id: "i2",
      number: "INV-2026-071",
      issuedBy: "טק ישראל",
      issuedAt: "12/07/2026",
      amount: 2000,
    },
    {
      id: "i3",
      number: "INV-2026-063",
      issuedBy: "נועה סטייל (עוסק מורשה)",
      issuedAt: "22/07/2026",
      amount: 6200,
    },
  ],
  bundleMonthLabel: "יולי 2026",
};

export const getReportsData = cache(async (brandUserId: string): Promise<ReportsData> => {
  void brandUserId; // TODO: שאילתות Prisma (EscrowHold / Transaction / TaxInvoice) מסוננות למפרסם הזה
  return PLACEHOLDER;
});
