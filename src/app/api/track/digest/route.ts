import { NextResponse } from "next/server";
import { authenticateTrackRequest } from "@/lib/track/auth";
import { digestPayloadSchema } from "@/lib/track/schemas";
import { processDigest } from "@/lib/track/ingest";
import { badRequest, fromThrown, ok, parseJsonBody } from "@/lib/track/http";

/** POST /api/track/digest — reconciliation לילי (§4). תופס webhooks שנפלו. */
export async function POST(request: Request) {
  const auth = await authenticateTrackRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = digestPayloadSchema.safeParse(parseJsonBody(auth.rawBody));
  if (!parsed.success) return badRequest(parsed.error);

  try {
    const res = await processDigest(auth.site, parsed.data);
    return ok(res);
  } catch (e) {
    return fromThrown(e);
  }
}
