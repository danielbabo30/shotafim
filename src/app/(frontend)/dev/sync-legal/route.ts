import { devRouteBlocked } from "@/lib/dev-guard";
import { NextResponse, type NextRequest } from "next/server";
import { getPayloadClient } from "@/lib/payload";
import { LEGAL_SEEDS } from "@/lib/legal-defaults";

/**
 * GET /dev/sync-legal?slug=cookies — מיישם מחדש מסמך משפטי אחד מברירות המחדל בקוד
 * (דורס את התוכן הקיים של אותו slug בלבד). נפרד מ-/dev/seed, שלא דורס תוכן קיים. פיתוח בלבד.
 */
export async function GET(request: NextRequest) {
  const blocked = devRouteBlocked();
  if (blocked) return blocked;

  const slug = request.nextUrl.searchParams.get("slug") ?? "cookies";
  const seed = LEGAL_SEEDS.find((l) => l.slug === slug);
  if (!seed) {
    return NextResponse.json(
      { ok: false, error: `אין ברירת מחדל ל-slug "${slug}"` },
      { status: 404 },
    );
  }

  try {
    const payload = await getPayloadClient();
    const found = await payload.find({
      collection: "legal-pages",
      where: { slug: { equals: slug } },
      limit: 1,
    });
    const existing = found.docs[0];
    if (existing) {
      await payload.update({ collection: "legal-pages", id: existing.id, data: seed });
    } else {
      await payload.create({ collection: "legal-pages", data: seed });
    }
    return NextResponse.json({ ok: true, slug, action: existing ? "updated" : "created" });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
