import { storage } from "@/lib/storage";

/**
 * GET /api/profile-images/<key> — הגשה ציבורית של תמונת פרופיל/רקע של יוצר.
 * תמונות אלה מוצגות למפרסמים באינדקס ובמרקטפלייס — אין צורך באימות.
 * ה-key תמיד תחת התיקייה profile-images/ (נכתב ב-uploadCreatorImage).
 */
const SAFE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const storageKey = `profile-images/${key.join("/")}`;

  if (storageKey.endsWith(".meta.json")) {
    return new Response("Not found", { status: 404 });
  }

  const object = await storage.get(storageKey);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  // מגישים רק סוגי תמונה בטוחים (לא SVG/HTML) — אחרת octet-stream
  const contentType = SAFE_IMAGE_TYPES.has(object.contentType)
    ? object.contentType
    : "application/octet-stream";

  return new Response(object.body, {
    headers: {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(object.size ? { "Content-Length": String(object.size) } : {}),
    },
  });
}
