import { storage } from "@/lib/storage";

/**
 * GET /api/profile-images/<key> — הגשה ציבורית של תמונת פרופיל/רקע של יוצר.
 * תמונות אלה מוצגות למפרסמים באינדקס ובמרקטפלייס — אין צורך באימות.
 * ה-key תמיד תחת התיקייה profile-images/ (נכתב ב-uploadCreatorImage).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const storageKey = `profile-images/${key.join("/")}`;

  const object = await storage.get(storageKey);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.contentType || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(object.size ? { "Content-Length": String(object.size) } : {}),
    },
  });
}
