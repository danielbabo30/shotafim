import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/track/cron/guard";
import { runMonitor } from "@/lib/track/cron/monitor";

/** GET /api/cron/monitor — כל שעה. זיהוי היעדרות heartbeat, השהיה אוטומטית, דגלי אנומליה. */
export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const result = await runMonitor();
  return NextResponse.json({ ok: true, ...result });
}
