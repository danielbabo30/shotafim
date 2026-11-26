import { devRouteBlocked } from "@/lib/dev-guard";
import { NextResponse } from "next/server";
import { runSeed } from "@/seed/seed";

/** GET /dev/seed — זריעת תוכן ברירת מחדל ל-CMS. פיתוח בלבד. */
export async function GET() {
  const blocked = devRouteBlocked();
  if (blocked) return blocked;
  try {
    const log = await runSeed();
    return NextResponse.json({ ok: true, log });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
