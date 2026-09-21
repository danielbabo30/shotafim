import type {
  AttributionMethod,
  AttributionMode,
  CommissionBasis,
  CommissionScope,
  CommissionType,
} from "@prisma/client";
import { attributionModeHasCoupon, attributionModeHasLink } from "@/lib/partner-terms";

/**
 * "תשלום פר רכישה" — מנוע שיוך וחישוב עמלה (WP-2). קובץ טהור.
 * אפיון §3 (שיוך: קופון גובר על cookie) + §2/§4 (בסיס העמלה, בלי מע"מ ובלי משלוח).
 */

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const norm = (s: string) => s.trim().toUpperCase();

// ── שיוך ────────────────────────────────────────────────────────────────

export type AttributionInputs = {
  attributionMode: AttributionMode;
  refCode: string;
  couponCode: string | null;
};

export type OrderAttributionSignals = {
  couponCodes: string[];
  refCode: string | null;
};

/**
 * קובע את שיטת השיוך. קופון של השותפות גובר על cookie/refCode (last-click, §3).
 * מחזיר null אם אף אחד לא תואם שותפות פעילה.
 */
export function resolveAttribution(
  program: AttributionInputs,
  order: OrderAttributionSignals,
): AttributionMethod | null {
  if (attributionModeHasCoupon(program.attributionMode) && program.couponCode) {
    const target = norm(program.couponCode);
    if (order.couponCodes.some((c) => norm(c) === target)) return "COUPON";
  }
  if (attributionModeHasLink(program.attributionMode) && order.refCode) {
    if (norm(order.refCode) === norm(program.refCode)) return "COOKIE";
  }
  return null;
}

// ── חישוב עמלה ──────────────────────────────────────────────────────────

export type OrderAmounts = {
  itemsSubtotal: number; // לפני הנחות ומע"מ
  discountTotal: number; // סך ההנחות (חיובי)
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
};

export type OrderLine = {
  lineSubtotal: number; // לפני הנחה, בלי מע"מ
  lineDiscount: number;
  isReferredProduct: boolean;
};

export type CommissionInputs = {
  commissionType: CommissionType;
  commissionValue: number;
  commissionBasis: CommissionBasis;
  commissionScope: CommissionScope;
  platformFeePct: number;
};

export type CommissionResult = {
  commissionableAmount: number;
  commissionAmount: number;
  platformFeeAmount: number;
};

/** הסכום שעליו מחושבת העמלה — לפי basis (PRE/POST discount) ו-scope (מוצר/סל). בלי מע"מ ומשלוח. */
export function commissionableAmount(
  amounts: OrderAmounts,
  lines: OrderLine[],
  basis: CommissionBasis,
  scope: CommissionScope,
): number {
  if (scope === "PRODUCT_ONLY") {
    const referred = lines.filter((l) => l.isReferredProduct);
    const gross = referred.reduce((s, l) => s + l.lineSubtotal, 0);
    const discount = referred.reduce((s, l) => s + l.lineDiscount, 0);
    return round2(Math.max(0, basis === "POST_DISCOUNT" ? gross - discount : gross));
  }
  // WHOLE_CART
  const gross = amounts.itemsSubtotal;
  return round2(Math.max(0, basis === "POST_DISCOUNT" ? gross - amounts.discountTotal : gross));
}

export function computeCommission(
  input: CommissionInputs,
  amounts: OrderAmounts,
  lines: OrderLine[],
): CommissionResult {
  const base = commissionableAmount(amounts, lines, input.commissionBasis, input.commissionScope);
  const commissionAmount =
    input.commissionType === "FIXED"
      ? round2(input.commissionValue)
      : round2(base * (input.commissionValue / 100));
  const platformFeeAmount = round2(commissionAmount * (input.platformFeePct / 100));
  return { commissionableAmount: base, commissionAmount, platformFeeAmount };
}

/** חישוב מחדש פרו-רטה בהחזר חלקי — factor לפי החלק שנותר מההזמנה. */
export function proRateCommission(
  result: CommissionResult,
  grandTotal: number,
  refundedAmount: number,
): CommissionResult {
  if (grandTotal <= 0)
    return { commissionableAmount: 0, commissionAmount: 0, platformFeeAmount: 0 };
  const factor = Math.max(0, Math.min(1, (grandTotal - refundedAmount) / grandTotal));
  return {
    commissionableAmount: round2(result.commissionableAmount * factor),
    commissionAmount: round2(result.commissionAmount * factor),
    platformFeeAmount: round2(result.platformFeeAmount * factor),
  };
}

/** סטטוסי הזמנה גולמיים מ-Woo שנחשבים "יציבים" (מותר לאשר עמלה). */
export const STABLE_ORDER_STATUSES = new Set(["completed", "processing", "paid"]);

export function isStableOrderStatus(raw: string | null | undefined): boolean {
  return raw != null && STABLE_ORDER_STATUSES.has(raw.toLowerCase());
}
