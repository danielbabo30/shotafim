import { z } from "zod";

/**
 * "תשלום פר רכישה" — סכמות ולידציה ל-payloads של תוסף המעקב (WP-2).
 * תואם למסמך "BridgeAd Tracking API" (draft-1).
 */

const isoDateTime = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "תאריך ISO לא תקין");

export const clickPayloadSchema = z.object({
  refCode: z.string().trim().min(1),
  occurredAt: isoDateTime,
  landingUrl: z.string().trim().min(1).max(2048),
  ipHash: z.string().trim().min(8).max(128),
  uaHash: z.string().trim().max(128).optional(),
  country: z.string().trim().length(2).optional(),
});
export type ClickPayload = z.infer<typeof clickPayloadSchema>;

const amountsSchema = z.object({
  itemsSubtotal: z.number().nonnegative(),
  discountTotal: z.number().nonnegative().default(0),
  taxTotal: z.number().nonnegative().default(0),
  shippingTotal: z.number().nonnegative().default(0),
  grandTotal: z.number().nonnegative(),
});

const lineItemSchema = z.object({
  sku: z.string().trim().optional(),
  productId: z.union([z.string(), z.number()]).optional(),
  name: z.string().trim().optional(),
  quantity: z.number().int().positive().default(1),
  lineSubtotal: z.number().nonnegative(),
  lineDiscount: z.number().nonnegative().default(0),
  isReferredProduct: z.boolean().default(false),
});

export const orderPayloadSchema = z.object({
  externalOrderId: z.string().trim().min(1).max(120),
  orderPlacedAt: isoDateTime,
  currency: z.string().trim().toUpperCase(),
  orderStatus: z.string().trim().min(1),
  amounts: amountsSchema,
  lineItems: z.array(lineItemSchema).min(1),
  couponCodes: z.array(z.string().trim()).default([]),
  refCode: z.string().trim().optional().nullable(),
  customerHash: z.string().trim().min(8).max(128),
  isNewCustomer: z.boolean().default(true),
});
export type OrderPayload = z.infer<typeof orderPayloadSchema>;

export const orderStatusPayloadSchema = z.object({
  externalOrderId: z.string().trim().min(1),
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
  refundedAmount: z.number().nonnegative().optional(),
  occurredAt: isoDateTime,
});
export type OrderStatusPayload = z.infer<typeof orderStatusPayloadSchema>;

export const heartbeatPayloadSchema = z.object({
  pluginVersion: z.string().trim().min(1).max(40),
  wooVersion: z.string().trim().min(1).max(40),
  wpVersion: z.string().trim().max(40).optional(),
  phpVersion: z.string().trim().max(40).optional(),
  ordersSinceLast: z.number().int().nonnegative().default(0),
  stuckWebhookQueue: z.number().int().nonnegative().default(0),
  sentAt: isoDateTime,
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
        externalOrderId: z.string().trim().min(1),
        orderPlacedAt: isoDateTime,
        grandTotal: z.number().nonnegative(),
        status: z.string().trim().min(1),
        refCode: z.string().trim().optional().nullable(),
        couponCodes: z.array(z.string().trim()).default([]),
      }),
    )
    .default([]),
  totals: z.object({
    orderCount: z.number().int().nonnegative(),
    grossAmount: z.number().nonnegative(),
  }),
});
export type DigestPayload = z.infer<typeof digestPayloadSchema>;
