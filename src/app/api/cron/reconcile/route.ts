import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/track/cron/guard";
import { runReconcile } from "@/lib/track/cron/reconcile";

/** GET /api/cron/reconcile — יומי. PENDING→APPROVED אחרי חלון ההחזרות + החזר יתרת פיקדון. */
export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  const result = await runReconcile();
  return NextResponse.json({ ok: true, ...result });
}
