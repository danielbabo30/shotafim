import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/track/cron/guard";
import { runDueCheckpoints } from "@/lib/track/cron/checkpoints";

/** GET /api/cron/checkpoints — יומי. מעבד תחנות תשלום שהגיע מועדן. */
export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const result = await runDueCheckpoints();
  return NextResponse.json({ ok: true, ...result });
}
