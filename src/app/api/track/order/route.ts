import { NextResponse } from "next/server";
import { authenticateTrackRequest } from "@/lib/track/auth";
import { orderPayloadSchema } from "@/lib/track/schemas";
import { ingestOrder } from "@/lib/track/ingest";
import { accepted, badRequest, fromThrown, ok, parseJsonBody } from "@/lib/track/http";

/** POST /api/track/order — הזמנה משויכת מ-woocommerce_payment_complete (§4). idempotent. */
export async function POST(request: Request) {
  const auth = await authenticateTrackRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = orderPayloadSchema.safeParse(parseJsonBody(auth.rawBody));
  if (!parsed.success) return badRequest(parsed.error);

  try {
    const res = await ingestOrder(auth.site, parsed.data);
    if (!res.attributed) return accepted({ attributed: false });
    const body = {
      attributed: true,
      created: res.created,
      attributionMethod: res.attributionMethod,
      commissionAmount: Number(res.order?.commissionAmount ?? 0),
      status: res.order?.status,
    };
    return res.created ? accepted(body) : ok(body);
  } catch (e) {
    return fromThrown(e);
  }
}
