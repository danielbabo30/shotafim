import "server-only";
import type { TrackedSite } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
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

/** תקרות גוף בקשה (SEC-P-07): digest עד 2MB, שאר ה-endpoints עד 256KB */
const MAX_BODY_BYTES = 256 * 1024;
const MAX_DIGEST_BODY_BYTES = 2 * 1024 * 1024;
/** מגבלות קצב: לפי IP לפני כל גישה ל-DB, ולפי אתר אחרי אימות (בקשות/דקה) */
const IP_LIMIT_PER_MIN = 300;
const SITE_LIMIT_PER_MIN = 1200;

export async function authenticateTrackRequest(request: Request): Promise<TrackAuthResult> {
  // rate limit לפי IP — לפני כל עבודה (SEC-P-07). ראו src/lib/rate-limit.ts (in-memory).
  const ipRes = await rateLimit(
    `track|${clientIpFromHeaders(request.headers)}`,
    IP_LIMIT_PER_MIN,
    60,
  );
  if (!ipRes.ok) {
    return { ok: false, status: 429, error: "יותר מדי בקשות." };
  }

  const maxBytes = new URL(request.url).pathname.endsWith("/digest")
    ? MAX_DIGEST_BODY_BYTES
    : MAX_BODY_BYTES;
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, status: 413, error: "גוף הבקשה גדול מדי." };
  }

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
  if (rawBody.length > maxBytes) {
    return { ok: false, status: 413, error: "גוף הבקשה גדול מדי." };
  }

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

  // throttle לפי אתר — רק אחרי חתימה תקפה (כדי ש-siteId ידוע לא ישמש לשריפת המכסה)
  const siteRes = await rateLimit(`track-site|${site.id}`, SITE_LIMIT_PER_MIN, 60);
  if (!siteRes.ok) {
    return { ok: false, status: 429, error: "יותר מדי בקשות מהאתר." };
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
