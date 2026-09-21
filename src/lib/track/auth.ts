import "server-only";
import type { TrackedSite } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { HMAC_SKEW_SECONDS } from "@/lib/partner-constants";
import { decryptApiKey, safeSignatureEqual, sha256Hex, trackSignature } from "@/lib/track/crypto";

/**
 * "תשלום פר רכישה" — אימות בקשת קליטה מתוסף ה-WooCommerce (WP-2).
 * כותרות: X-BridgeAd-Site / X-BridgeAd-Timestamp / X-BridgeAd-Signature: sha256=<hex>.
 * חתימה = HMAC-SHA256(timestamp + "." + rawBody, apiKey). skew מותר 300 שניות.
 *
 * חובה לקרוא ל-request.text() פעם אחת בלבד ולהעביר את הגוף הגולמי לכאן, כי
 * החתימה מחושבת על ה-bytes המדויקים שנשלחו.
 */

export type TrackAuthResult =
  { ok: true; site: TrackedSite; rawBody: string } | { ok: false; status: number; error: string };

export async function authenticateTrackRequest(request: Request): Promise<TrackAuthResult> {
  const siteId = request.headers.get("x-bridgead-site");
  const timestamp = request.headers.get("x-bridgead-timestamp");
  const signature = request.headers.get("x-bridgead-signature");

  if (!siteId || !timestamp || !signature) {
    return { ok: false, status: 401, error: "חסרות כותרות אימות." };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > HMAC_SKEW_SECONDS) {
    return { ok: false, status: 401, error: "חותמת זמן פגה או לא תקינה." };
  }

  const rawBody = await request.text();

  const site = await prisma.trackedSite.findUnique({ where: { id: siteId } });
  if (!site || site.status === "DEACTIVATED") {
    return { ok: false, status: 401, error: "אתר לא מוכר או מנותק." };
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey(site.apiKeyEnc);
  } catch {
    return { ok: false, status: 500, error: "שגיאת תצורת מפתח בשרת." };
  }

  // דחייה מוקדמת אם ה-hash לא תואם (הגנה מפני apiKeyEnc שגוי)
  if (sha256Hex(apiKey) !== site.apiKeyHash) {
    return { ok: false, status: 500, error: "אי-התאמת מפתח בשרת." };
  }

  const expected = trackSignature(apiKey, timestamp, rawBody);
  if (!safeSignatureEqual(expected, signature)) {
    return { ok: false, status: 401, error: "חתימת HMAC לא תקינה." };
  }

  // אימות דומיין: ה-Origin/Referer (אם קיים) חייב להתאים ל-host הרשום
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (origin) {
    try {
      const reqHost = new URL(origin).host;
      const siteHost = new URL(site.siteUrl).host;
      if (reqHost !== siteHost) {
        return { ok: false, status: 409, error: "אי-התאמת דומיין — נדרש צימוד מחדש." };
      }
    } catch {
      /* origin לא ניתן לפירוק — מדלגים על בדיקת הדומיין */
    }
  }

  return { ok: true, site, rawBody };
}
