import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "@/env";

/**
 * "תשלום פר רכישה" — הצפנה ו-hashing למפתחות ה-API של תוסף המעקב (WP-2).
 * מפתח ה-API של אתר נוצר פעם אחת בצימוד, נשמר:
 *   • apiKeyHash = sha256(key)  — לחיפוש/דחייה מוקדמת
 *   • apiKeyEnc  = AES-256-GCM(key)  — לאימות HMAC (דורש את המפתח עצמו)
 */

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

/** מפתח API חדש — 32 בייטים אקראיים ב-base32 (ללא תווים דו-משמעיים) */
export function generateApiKey(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(40);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function secretKey(): Buffer {
  if (!env.TRACK_KEY_SECRET) {
    throw new Error(
      "TRACK_KEY_SECRET חסר — לא ניתן להצפין/לפענח מפתחות תוסף. הוסף ל-.env (openssl rand -base64 32).",
    );
  }
  const raw = Buffer.from(env.TRACK_KEY_SECRET, "base64");
  if (raw.length !== 32) {
    throw new Error("TRACK_KEY_SECRET חייב להיות 32 בייטים ב-base64 (openssl rand -base64 32).");
  }
  return raw;
}

/** מחזיר "<iv b64>:<tag b64>:<ciphertext b64>" */
export function encryptApiKey(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptApiKey(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("apiKeyEnc פגום");
  const decipher = createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** חתימת HMAC-SHA256 של payload קליטה: hmac(timestamp + "." + rawBody, apiKey) */
export function trackSignature(apiKey: string, timestamp: string, rawBody: string): string {
  return "sha256=" + createHmac("sha256", apiKey).update(`${timestamp}.${rawBody}`).digest("hex");
}

/** השוואת חתימות ב-constant time (מקבל את הפורמט "sha256=<hex>") */
export function safeSignatureEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// ── פרטיות (SEC-P-13): מפתח פרטיות נפרד מ-apiKey + HMAC לזיהויים ──────────

/** גרסת אלגוריתם ה-hash הנוכחית. v1 = sha256 ישן (ip+salt / email+pepper). */
export const PRIVACY_HASH_VERSION = 2;
export const HASH_V2_PREFIX = "v2:";
const HASH_V2_RE = /^v2:[0-9a-f]{64}$/;

/**
 * privacyKey של אתר: HKDF-SHA256(ikm = TRACK_KEY_SECRET, salt = siteId, info = "bridgead/privacy/v2").
 * לא נגזר מ-apiKey ולא נשמר ב-DB: נגזר מחדש בשרת לפי הצורך, ונמסר לתוסף פעם אחת בקוד הצימוד.
 * הערה: סיבוב TRACK_KEY_SECRET משנה אותו (כמו שהוא שובר את apiKeyEnc).
 */
export function derivePrivacyKey(siteId: string): string {
  const okm = hkdfSync(
    "sha256",
    secretKey(),
    Buffer.from(siteId, "utf8"),
    "bridgead/privacy/v2",
    32,
  );
  return Buffer.from(okm).toString("hex");
}

/** תת-מפתח לפי הקשר ("ip" | "ua" | "customer") — הפרדת דומיינים. */
function privacySubKey(privacyKey: string, purpose: string): Buffer {
  return createHmac("sha256", privacyKey).update(purpose).digest();
}

/** customerHash v2 — HMAC-SHA256(lowercase+trim email, subkey("customer")), עם קידומת "v2:". */
export function customerHashV2(privacyKey: string, email: string): string {
  const h = createHmac("sha256", privacySubKey(privacyKey, "customer"))
    .update(email.trim().toLowerCase())
    .digest("hex");
  return HASH_V2_PREFIX + h;
}

/** customerHash v1 (ישן) — נשמר רק לזיהוי רכישה עצמית מתוסף שעדיין שולח v1. */
export function customerHashV1(apiKey: string, email: string): string {
  const pepper = sha256Hex(`pepper:${apiKey}`);
  return sha256Hex(email.trim().toLowerCase() + pepper);
}

/** האם הערך בפורמט hash v2 תקין (קידומת + 64 hex). */
export function isHashV2(value: string): boolean {
  return HASH_V2_RE.test(value);
}

/**
 * צמצום IP (IPv4 → /24, IPv6 → /48; IPv4-mapped כ-IPv4) — מימוד ייחוס שזהה ל-PHP
 * `Bridgead_Api::truncate_ip`. השרת אינו רואה IP גולמי; הפונקציות משמשות לבדיקות/וקטורים.
 * ממומש ל-IPv4 בלבד (a.b.c.0); IPv6 נבדק ב-PHP בלבד.
 */
export function truncateIpBytes(ip: string): Buffer | null {
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!v4) return null;
  const bytes = v4.slice(1).map(Number);
  if (bytes.some((n) => n > 255)) return null;
  return Buffer.from([bytes[0], bytes[1], bytes[2], 0]);
}

/** ipHash v2 מיוחס (לבדיקות בלבד, IPv4): "v2:" + HMAC(subkey(ip), "YYYY-MM-DD|a.b.c.0") */
export function ipHashV2ForTest(privacyKey: string, ipv4: string, dateUtc: string): string {
  const b = truncateIpBytes(ipv4);
  const canon = b ? Array.from(b).join(".") : "";
  const h = createHmac("sha256", privacySubKey(privacyKey, "ip"))
    .update(`${dateUtc}|${canon}`)
    .digest("hex");
  return HASH_V2_PREFIX + h;
}
