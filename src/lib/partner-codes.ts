import { randomInt } from "node:crypto";

/**
 * מחוללי קודים ל"תשלום פר רכישה" — refCode ללינק השיוך וקוד קופון ייחודי ליוצר.
 * שרת בלבד (node:crypto). הייחודיות נאכפת ב-DB (@unique) + retry ב-acceptApplication.
 */

// בלי תווים דו-משמעיים (0/O, 1/I/L)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomToken(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** קוד שיוך קצר לשימוש בלינק — למשל "BG7KQ4M2" */
export function generateRefCode(): string {
  return `BG${randomToken(6)}`;
}

/**
 * קוד קופון קריא הנגזר משם היוצר + סיומת אקראית קצרה — למשל "NOA37".
 * נופל חזרה ל-refCode-סטייל אם אין אותיות לטיניות בשם.
 */
export function generateCouponCode(creatorName: string | null | undefined): string {
  const letters = (creatorName ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 5);
  const stem = letters.length >= 2 ? letters : randomToken(4);
  return `${stem}${randomInt(10, 100)}`;
}
