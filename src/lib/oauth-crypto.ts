import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/env";

/**
 * חיבור OAuth אמיתי לפלטפורמות יוצרים (יוטיוב וכו') — WP-5.
 * הצפנת טוקני refresh לפני שמירה ב-DB (CreatorChannel.oauthRefreshTokenEnc).
 *
 * אותה תבנית בדיוק כמו src/lib/track/crypto.ts (encryptApiKey/decryptApiKey):
 *   AES-256-GCM, פורמט מאוחסן "<iv b64>:<tag b64>:<ciphertext b64>",
 *   אך עם סוד ייעודי (OAUTH_TOKEN_SECRET) — משפחת סודות נפרדת מ-TRACK_KEY_SECRET.
 */

function secretKey(): Buffer {
  if (!env.OAUTH_TOKEN_SECRET) {
    throw new Error(
      "OAUTH_TOKEN_SECRET חסר — לא ניתן להצפין/לפענח טוקני OAuth. הוסף ל-.env (openssl rand -base64 32).",
    );
  }
  const raw = Buffer.from(env.OAUTH_TOKEN_SECRET, "base64");
  if (raw.length !== 32) {
    throw new Error("OAUTH_TOKEN_SECRET חייב להיות 32 בייטים ב-base64 (openssl rand -base64 32).");
  }
  return raw;
}

/** מחזיר "<iv b64>:<tag b64>:<ciphertext b64>" */
export function encryptOAuthToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptOAuthToken(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("oauthRefreshTokenEnc פגום");
  const decipher = createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
