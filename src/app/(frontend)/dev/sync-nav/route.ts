import { devRouteBlocked } from "@/lib/dev-guard";
import { NextResponse } from "next/server";
import { getPayloadClient } from "@/lib/payload";
import { DEFAULT_FOOTER_COLUMNS, DEFAULT_NAV_ITEMS } from "@/lib/cms-defaults";

/**
 * GET /dev/sync-nav — מיישם מחדש את תפריט הניווט ואת עמודות הפוטר מברירות המחדל בקוד.
 * נפרד מ-/dev/seed כדי לא לדרוס תוכן עמודים. פיתוח בלבד.
 */
export async function GET() {
  const blocked = devRouteBlocked();
  if (blocked) return blocked;
  try {
    const payload = await getPayloadClient();
    await payload.updateGlobal({
      slug: "main-navigation",
      data: { items: DEFAULT_NAV_ITEMS },
    });
    // עמודות הפוטר חיות ב-site-settings — מסנכרן גם אותן (רק footerColumns, שאר ההגדרות לא נוגעות)
    await payload.updateGlobal({
      slug: "site-settings",
      data: { footerColumns: DEFAULT_FOOTER_COLUMNS },
    });
    return NextResponse.json({ ok: true, items: DEFAULT_NAV_ITEMS.map((i) => i.label) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
