import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTrackRequest } from "@/lib/track/auth";
import { orderStatusPayloadSchema } from "@/lib/track/schemas";
import { reverseCommission } from "@/lib/track/ingest";
import { isStableOrderStatus } from "@/lib/track/commission";
import { badRequest, fromThrown, ok, parseJsonBody } from "@/lib/track/http";

/** POST /api/track/order-status — refund / cancel / completed (§4). חשבונאות אוטומטית, לא מחלוקת. */
export async function POST(request: Request) {
  const auth = await authenticateTrackRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = orderStatusPayloadSchema.safeParse(parseJsonBody(auth.rawBody));
  if (!parsed.success) return badRequest(parsed.error);
  const { externalOrderId, newStatus, refundedAmount } = parsed.data;

  const order = await prisma.attributedOrder.findUnique({
    where: { siteId_externalOrderId: { siteId: auth.site.id, externalOrderId } },
    select: { id: true, status: true },
  });
  if (!order) return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });

  try {
    if (newStatus === "refunded" || newStatus === "cancelled" || newStatus === "failed") {
      await reverseCommission(order.id, `woo:${newStatus}`);
      return ok({ commissionStatus: "REVERSED" });
    }
    if (newStatus === "partially-refunded") {
      await reverseCommission(order.id, "woo:partially-refunded", refundedAmount);
      const after = await prisma.attributedOrder.findUnique({
        where: { id: order.id },
        select: { status: true, commissionAmount: true },
      });
      return ok({
        commissionStatus: after?.status,
        commissionAmount: Number(after?.commissionAmount ?? 0),
      });
    }
    // completed / paid / processing — סיגנל יציבות; מאיץ אישור אם כבר עבר חלון ההחזרות
    await prisma.attributedOrder.update({
      where: { id: order.id },
      data: { orderStatusRaw: newStatus },
    });
    return ok({ commissionStatus: order.status, stable: isStableOrderStatus(newStatus) });
  } catch (e) {
    return fromThrown(e);
  }
}
