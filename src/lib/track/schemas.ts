import { z } from "zod";

/**
 * "תשלום פר רכישה" — סכמות ולידציה ל-payloads של תוסף המעקב (WP-2).
 * תואם למסמך "BridgeAd Tracking API" (draft-1).
 */

const isoDateTime = z
  .string()
  .max(40)
  .refine((v) => !Number.isNaN(Date.parse(v)), "תאריך ISO לא תקין");

export const clickPayloadSchema = z.object({
  refCode: z.string().trim().min(1).max(64),
  occurredAt: isoDateTime,
  landingUrl: z.string().trim().min(1).max(2048),
  ipHash: z.string().trim().min(8).max(128),
  uaHash: z.string().trim().max(128).optional(),
  country: z.string().trim().length(2).optional(),
  /** גרסת אלגוריתם ה-hash (SEC-P-13). חסר/1 = ישן; 2 = HMAC עם privacyKey וקידומת "v2:". */
  hashVersion: z.union([z.literal(1), z.literal(2)]).optional(),
});
export type ClickPayload = z.infer<typeof clickPayloadSchema>;

/** hashVersion=2 מחייב ערכי hash בפורמט "v2:<64 hex>" (SEC-P-13) */
const V2_RE = /^v2:[0-9a-f]{64}$/;
export function validateClickHashes(p: ClickPayload): string | null {
  if (p.hashVersion !== 2) return null;
  if (!V2_RE.test(p.ipHash)) return "ipHash אינו בפורמט v2.";
  if (p.uaHash && !V2_RE.test(p.uaHash)) return "uaHash אינו בפורמט v2.";
  return null;
}

/**
 * תקרת שפיות טכנית (SEC-P-08) — מונעת ערכים כמו 1e30 ששוברים את Decimal(12,2) ב-DB.
 * ⚠️ זו לא תקרת עסקית/אנטי-הונאה (SEC-P-01 — מחוץ לתחום סבב זה).
 */
const MAX_AMOUNT = 100_000_000;
const money = () => z.number().nonnegative().max(MAX_AMOUNT);

const amountsSchema = z.object({
  itemsSubtotal: money(),
  discountTotal: money().default(0),
  taxTotal: money().default(0),
  shippingTotal: money().default(0),
  grandTotal: money(),
});

const lineItemSchema = z.object({
  sku: z.string().trim().max(120).optional(),
  productId: z.union([z.string().max(60), z.number()]).optional(),
  name: z.string().trim().max(300).optional(),
  quantity: z.number().int().positive().max(100_000).default(1),
  lineSubtotal: money(),
  lineDiscount: money().default(0),
  isReferredProduct: z.boolean().default(false),
});

export const orderPayloadSchema = z.object({
  externalOrderId: z.string().trim().min(1).max(120),
  orderPlacedAt: isoDateTime,
  currency: z.string().trim().toUpperCase().max(8),
  orderStatus: z.string().trim().min(1).max(40),
  amounts: amountsSchema,
  lineItems: z.array(lineItemSchema).min(1).max(200),
  couponCodes: z.array(z.string().trim().max(64)).max(20).default([]),
  refCode: z.string().trim().max(64).optional().nullable(),
  customerHash: z.string().trim().min(8).max(128),
  isNewCustomer: z.boolean().default(true),
  /** ראו clickPayloadSchema.hashVersion */
  hashVersion: z.union([z.literal(1), z.literal(2)]).optional(),
});
export type OrderPayload = z.infer<typeof orderPayloadSchema>;

export function validateOrderHashes(p: OrderPayload): string | null {
  if (p.hashVersion !== 2) return null;
  if (!V2_RE.test(p.customerHash)) return "customerHash אינו בפורמט v2.";
  return null;
}

export const orderStatusPayloadSchema = z.object({
  externalOrderId: z.string().trim().min(1).max(120),
  newStatus: z.enum([
    "completed",
    "processing",
    "paid",
    "refunded",
    "partially-refunded",
    "cancelled",
    "failed",
    "on-hold",
  ]),
  refundedAmount: money().optional(),
  occurredAt: isoDateTime,
});
export type OrderStatusPayload = z.infer<typeof orderStatusPayloadSchema>;

export const heartbeatPayloadSchema = z.object({
  pluginVersion: z.string().trim().min(1).max(40),
  wooVersion: z.string().trim().min(1).max(40),
  wpVersion: z.string().trim().max(40).optional(),
  phpVersion: z.string().trim().max(40).optional(),
  ordersSinceLast: z.number().int().nonnegative().max(10_000_000).default(0),
  stuckWebhookQueue: z.number().int().nonnegative().max(10_000_000).default(0),
  sentAt: isoDateTime,
  /** תוסף 0.2.0+: מבקש את privacyKey (SEC-P-13) כשעדיין אין לו */
  needsPrivacyKey: z.boolean().optional(),
});
export type HeartbeatPayload = z.infer<typeof heartbeatPayloadSchema>;

export const deactivatedPayloadSchema = z.object({
  deactivatedAt: isoDateTime,
  reason: z.string().trim().max(200).optional(),
});

export const digestPayloadSchema = z.object({
  periodStart: isoDateTime,
  periodEnd: isoDateTime,
  orders: z
    .array(
      z.object({
        externalOrderId: z.string().trim().min(1).max(120),
        orderPlacedAt: isoDateTime,
        grandTotal: money(),
        status: z.string().trim().min(1).max(40),
        refCode: z.string().trim().max(64).optional().nullable(),
        couponCodes: z.array(z.string().trim().max(64)).max(20).default([]),
      }),
    )
    .max(2000)
    .default([]),
  totals: z.object({
    orderCount: z.number().int().nonnegative().max(10_000_000),
    grossAmount: z.number().nonnegative().max(1_000_000_000_000),
  }),
});
export type DigestPayload = z.infer<typeof digestPayloadSchema>;
