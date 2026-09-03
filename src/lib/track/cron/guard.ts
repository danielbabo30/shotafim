import "server-only";
import { NextResponse } from "next/server";
import { env } from "@/env";

/**
 * הגנה על endpoints של cron. בפרודקשן — חובה `Authorization: Bearer <CRON_SECRET>`
 * (או הכותרת `x-vercel-cron` ש-Vercel Cron שולח). בפיתוח, כשאין CRON_SECRET — פתוח,
 * כדי לאפשר הרצה ידנית של הבדיקות.
 */
export function authorizeCron(request: Request): NextResponse | null {
  if (!env.CRON_SECRET) {
    if (env.NODE_ENV === "production") {
      return NextResponse.json({ error: "cron not configured" }, { status: 503 });
    }
    return null; // dev — allow
  }
  const auth = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") != null;
  if (auth === `Bearer ${env.CRON_SECRET}` || isVercelCron) return null;
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
