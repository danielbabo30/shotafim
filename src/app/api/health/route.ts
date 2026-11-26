/**
 * GET /api/health — בדיקת חיות ל-Cloud Run (startup/liveness probe).
 * בכוונה בלי DB, בלי סודות ובלי rate limit — רק מוכיח שהתהליך מגיב.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
