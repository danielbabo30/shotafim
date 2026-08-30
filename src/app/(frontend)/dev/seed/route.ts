import { NextResponse } from "next/server";
import { runSeed } from "@/seed/seed";

/** GET /dev/seed — זריעת תוכן ברירת מחדל ל-CMS. פיתוח בלבד. */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }
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
