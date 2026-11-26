import type { Access, CollectionConfig, GlobalConfig } from "payload";

/**
 * כללי גישה משותפים ל-Payload (SEC-M-03).
 *
 * קריאה ציבורית (`read: true`) מותרת **רק** לתוכן שיווקי שמוצג באתר הציבורי
 * (מאמרים, מדריכים, עמודי חוק, קטגוריות, מדיה, globals של האתר). אין בהם drafts/versions
 * ולא שדות פנימיים. כתיבה/מחיקה — רק למשתמש CMS מחובר (עורך). אם יתווסף שדה פנימי
 * או drafts לאוסף — יש להחליף את `read` של אותו אוסף ל-`published only` / field-level access.
 */

export const isCmsUser: Access = ({ req }) => Boolean(req.user);

export const publicContentAccess: NonNullable<CollectionConfig["access"]> = {
  read: () => true,
  create: isCmsUser,
  update: isCmsUser,
  delete: isCmsUser,
};

export const publicGlobalAccess: NonNullable<GlobalConfig["access"]> = {
  read: () => true,
  update: isCmsUser,
};

/** אוסף משתמשי ה-CMS: הכול דורש משתמש CMS מחובר (אין read ציבורי) */
export const cmsUsersOnlyAccess: NonNullable<CollectionConfig["access"]> = {
  read: isCmsUser,
  create: isCmsUser,
  update: isCmsUser,
  delete: isCmsUser,
};
