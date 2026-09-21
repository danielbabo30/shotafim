import type { AuthPanel } from "@/payload-types";

/**
 * תוכן ברירת מחדל לפאנל הצדדי של מסכי ההרשמה/כניסה — משמש גם כ-seed הראשוני
 * ל-global `auth-panel`, וגם כ-fallback אם ה-CMS עדיין ריק או לא זמין.
 * לאחר seed, העריכה נעשית מ-/admin.
 */

type AuthPanelData = Omit<AuthPanel, "id" | "updatedAt" | "createdAt">;

export const DEFAULT_AUTH_PANEL: AuthPanelData = {
  statusLabel: "מערכת פעילה",
  heading: {
    lead: "ביטחון פיננסי מלא",
    highlight: "לכל קמפיין בישראל",
  },
  body: "מערכת הנאמנות (Escrow) של שותפים מבטיחה שהתקציב שלך מוגן עד להשלמת העבודה לשביעות רצונך.",
  metric: {
    label: "יתרות בנאמנות פעילה",
    value: "₪1,842,500",
    steps: [
      { icon: "lock", label: "הפקדה בטוחה" },
      { icon: "video", label: "אישור וידאו" },
      { icon: "payments", label: "שחרור כספים" },
    ],
    trustText: "+850 יוצרים מאומתים",
    trustAvatars: [],
  },
  testimonial: {
    quote:
      "שותפים שינתה לחלוטין את הדרך בה אנו עובדים מול יוצרי תוכן. הביטחון שהתקציב מוגן מאפשר לנו לעבוד בראש שקט.",
    name: "תומר לוי",
    photo: null,
  },
};
