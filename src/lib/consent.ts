/**
 * הסכמת עוגיות (צד לקוח). הבחירה נשמרת ב-cookie first-party `bridgead_consent`.
 * נטול server-only בכוונה — נקרא מרכיבי לקוח. בשרת כל הפונקציות מחזירות "אין הסכמה".
 * הוספת קטגוריה / שינוי נוסח → להעלות CONSENT_VERSION כדי לבקש הסכמה מחדש.
 */

export const CONSENT_COOKIE = "bridgead_consent";
/** מעלים כשמשתנה נוסח המדיניות או קבוצת הקטגוריות. */
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 183; // ~6 חודשים
export const CONSENT_EVENT = "bridgead:consent-change";
export const CONSENT_OPEN_EVENT = "bridgead:consent-open";

export type ConsentCategory = "necessary" | "analytics" | "marketing";

export type ConsentRecord = {
  v: number;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  ts: string;
};

export function readConsentRaw(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  return m ? m[1] : "";
}

export function parseConsent(raw: string): ConsentRecord | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentRecord>;
    if (d.v !== CONSENT_VERSION || typeof d.ts !== "string") return null;
    return {
      v: d.v,
      necessary: true,
      analytics: d.analytics === true,
      marketing: d.marketing === true,
      ts: d.ts,
    };
  } catch {
    return null;
  }
}

/** הבחירה התקפה הנוכחית, או null אם לא נבחר / הגרסה התיישנה. */
export function getConsent(): ConsentRecord | null {
  return parseConsent(readConsentRaw());
}

export function hasConsent(category: ConsentCategory): boolean {
  if (category === "necessary") return true;
  return getConsent()?.[category] === true;
}

export function saveConsent(choice: { analytics: boolean; marketing: boolean }): void {
  const record: ConsentRecord = {
    v: CONSENT_VERSION,
    necessary: true,
    analytics: choice.analytics,
    marketing: choice.marketing,
    ts: new Date().toISOString(),
  };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(record))}` +
    `; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function subscribeConsent(cb: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, cb);
  return () => window.removeEventListener(CONSENT_EVENT, cb);
}

export function openConsentSettings(): void {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
