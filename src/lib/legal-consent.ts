import type { ConsentDocumentType } from "@prisma/client";

/**
 * גרסת מסמכי התנאים שהמשתמש מאשר בהרשמה.
 * קבוע בקוד לעת עתה; כשמסמכי `legal-pages` ב-CMS יקבלו שדה גרסה — יימשך משם.
 * כל שינוי כאן → משתמשים חדשים יתעדו הסכמה לגרסה החדשה (רשומות ישנות נשמרות as-is).
 */
export const LEGAL_VERSION = "v1.0";

/** המסמכים שכל נרשם מאשר בשלב 1 (checkbox "אני מסכים/ה לתנאי השימוש ולמדיניות הפרטיות"). */
export const REGISTRATION_CONSENT_DOCUMENTS: ConsentDocumentType[] = [
  "TERMS_OF_SERVICE",
  "PRIVACY_POLICY",
];

/**
 * גרסת הסכם השותפות מבוססת-הביצועים ("תשלום פר רכישה").
 * מתועד כ-LegalConsent לשני הצדדים בעת הקמת השותפות (acceptApplication).
 * מסמך התנאים עצמו יתווסף כדף `legal-pages` ייעודי בהמשך; כאן שומרים את הגרסה.
 */
export const PARTNERSHIP_AGREEMENT_VERSION = "v1.0";
