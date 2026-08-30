import { NextResponse } from "next/server";
import { getPayloadClient } from "@/lib/payload";
import { DEFAULT_NAV_ITEMS } from "@/lib/cms-defaults";

/**
 * GET /dev/sync-nav — מיישם מחדש את תפריט הניווט מברירות המחדל בקוד.
 * נפרד מ-/dev/seed כדי לא לדרוס תוכן עמודים. פיתוח בלבד.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }
  try {
    const payload = await getPayloadClient();
    await payload.updateGlobal({
      slug: "main-navigation",
      data: { items: DEFAULT_NAV_ITEMS },
    });
    return NextResponse.json({ ok: true, items: DEFAULT_NAV_ITEMS.map((i) => i.label) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
