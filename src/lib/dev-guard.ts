import { NextResponse } from "next/server";

/**
 * Guard משותף לכל ה-routes תחת /dev/* (login, seed-*, sync-nav).
 * הנתיבים האלה יוצרים sessions / כותבים ל-DB ללא אימות — לכן חסומים בכל סביבה
 * שאינה `NODE_ENV === "development"`, וגם בכל פריסה של Vercel (גם אם בטעות הורצה
 * עם NODE_ENV=development).
 *
 * שימוש בראש כל handler:
 *   const blocked = devRouteBlocked();
 *   if (blocked) return blocked;
 */
export function devRouteBlocked(): NextResponse | null {
  const isDev = process.env.NODE_ENV === "development";
  const isHosted = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (!isDev || isHosted) {
    return NextResponse.json({ error: "not available" }, { status: 404 });
  }
  return null;
}
