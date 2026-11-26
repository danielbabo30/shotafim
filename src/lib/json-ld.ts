const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

/**
 * סריאליזציה בטוחה של JSON-LD לתוך <script type="application/ld+json">.
 * מחליף את התו "פחות-מ" ברצף escape (וגם מפריד השורות U+2028/2029) כדי שמחרוזת כמו
 * "</script>" מתוכן CMS לא תסגור את התגית ותריץ קוד (SEC-M-06 / SEC-A-18).
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .split(LS)
    .join("\\u2028")
    .split(PS)
    .join("\\u2029");
}
