/**
 * "תשלום פר רכישה" — קבועי מנוע המעקב (WP-2). קובץ טהור.
 * אפיון: Artifact "תשלום פר רכישה" §5–§7.
 */

/** ימים מ-orderPlacedAt עד שעמלה PENDING יכולה לעבור ל-APPROVED (חלון החזרות). */
export const COMMISSION_STABILITY_DAYS = 14;

/** ימים אחרי התחנה האחרונה עד שיתרת הפיקדון מוחזרת למפרסם. */
export const DEPOSIT_REFUND_GRACE_DAYS = 14;

/** אחוז ניצול פיקדון שפותח את שער ההחלטה המשותפת (§6). */
export const GATE_THRESHOLD_PCT = 80;

/** מרווח שעון מותר בין כותרת ה-timestamp לשרת (הגנת replay). */
export const HMAC_SKEW_SECONDS = 300;

/** התוסף שולח heartbeat כל 6 שעות. */
export const HEARTBEAT_INTERVAL_HOURS = 6;

/** אין heartbeat יותר מזמן זה + היו קליקים בחלון → התראה. */
export const HEARTBEAT_STALE_HOURS = 12;

/** חלון החסד (שעות) מרגע ההתראה ועד השהיה אוטומטית של השותפות. */
export const MONITOR_GRACE_HOURS = 36;

/** חלון (שעות) לאחור שבו בודקים אם היו קליקים, לצורך זיהוי היעדרות heartbeat. */
export const MONITOR_CLICK_LOOKBACK_HOURS = 24;

/**
 * תקרת ספיגת זנב לא-גבה של הפלטפורמה (§6, §12) — אחוז מפיקדון ה-program.
 * חוב לא-גבוי מעבר לתקרה נשאר חוב של הצד החייב (לרוב חריגת מפרסם).
 */
export const PLATFORM_ABSORPTION_CEILING_PCT = 10;

/** ברירת מחדל לחלון ה-digest אם התוסף לא שלח (ימים). */
export const DIGEST_DEFAULT_WINDOW_DAYS = 7;
