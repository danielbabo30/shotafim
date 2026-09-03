/**
 * מצב הטופס של חיבור חנות WooCommerce (WP-4) — משותף ל-server action ולרכיב ה-client.
 * קובץ נקי (בלי "use server" / server-only) כי `"use server"` מאפשר export של פונקציות
 * async בלבד, ורכיב ה-client לא יכול לייבא מקובץ server-only.
 */
export type PluginActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  /** `token` = קוד הצימוד `<siteId>.<apiKey>` — מוצג פעם אחת. */
  | { status: "key"; siteUrl: string; token: string };

export const PLUGIN_ACTION_INITIAL: PluginActionState = { status: "idle" };
