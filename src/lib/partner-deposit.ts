import type { CommissionType } from "@prisma/client";
import { PARTNERSHIP_PLATFORM_FEE_PCT } from "@/lib/partner-terms";

/**
 * "תשלום פר רכישה" — חישוב הפיקדון הנדרש מהמפרסם.
 *
 * §6 + הכרעת מוצר (Q2):
 *   costPerPurchase = FIXED  ? commissionValue
 *                   : PERCENT ? (commissionValue / 100) × assumedAovILS
 *   requiredDepositILS = round( estimatedPurchases × costPerPurchase × (1 + platformFeePct/100) )
 *
 * היוצר מקבל 100% מהעמלה; הפלטפורמה גובה platformFeePct% נוסף מהמפרסם (על גבה,
 * כמו ב-FIXED_FEE). שכבה פיקטיבית — הסכום נכתב ל-DB בלי PSP אמיתי.
 */

export type DepositInputs = {
  commissionType: CommissionType;
  /** אחוז (0-100) אם PERCENT, ש"ח לרכישה אם FIXED */
  commissionValue: number;
  estimatedPurchases: number;
  /** ערך הזמנה ממוצע (₪) — עוגן התחזית, ובסיס עלות-לרכישה בעמלת אחוז */
  assumedAovILS: number;
  platformFeePct?: number;
};

/** עלות לרכישה בודדת — לפני הכפלה בתחזית ובעמלת הפלטפורמה. */
export function costPerPurchaseILS(inputs: DepositInputs): number {
  if (inputs.commissionType === "FIXED") return inputs.commissionValue;
  return (inputs.commissionValue / 100) * inputs.assumedAovILS;
}

export function computeRequiredDepositILS(inputs: DepositInputs): number {
  const feePct = inputs.platformFeePct ?? PARTNERSHIP_PLATFORM_FEE_PCT;
  const commissionPool = costPerPurchaseILS(inputs) * inputs.estimatedPurchases;
  return Math.round(commissionPool * (1 + feePct / 100));
}
