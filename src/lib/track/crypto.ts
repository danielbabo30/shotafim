import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
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
