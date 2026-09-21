import { NextResponse } from "next/server";
import { authenticateTrackRequest } from "@/lib/track/auth";
import { clickPayloadSchema } from "@/lib/track/schemas";
import { recordClick } from "@/lib/track/ingest";
import { accepted, badRequest, fromThrown, parseJsonBody } from "@/lib/track/http";

/** POST /api/track/click — קליק על לינק שיוך (§4). server-side, HMAC. */
export async function POST(request: Request) {
  const auth = await authenticateTrackRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = clickPayloadSchema.safeParse(parseJsonBody(auth.rawBody));
  if (!parsed.success) return badRequest(parsed.error);

  try {
    const res = await recordClick(auth.site, parsed.data);
    return accepted(res);
  } catch (e) {
    return fromThrown(e);
  }
}
