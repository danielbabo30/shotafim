import "server-only";
import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

/**
 * "תשלום פר רכישה" — התראות שותפות (WP-2). תמיד יוצר Notification ב-DB;
 * מייל נשלח רק כשמבקשים ורק אם Resend מוגדר (אחרת no-op).
 */

type PartnerNotificationType = Extract<
  NotificationType,
  "TRACKING_OFFLINE" | "DEPOSIT_LOW" | "PARTNERSHIP_PAUSED" | "COMMISSION_ACCRUED"
>;

const COPY: Record<PartnerNotificationType, { title: string; body: (m: Meta) => string }> = {
  COMMISSION_ACCRUED: {
    title: "עמלה חדשה בשותפות",
    body: (m) =>
      m.reversal
        ? "עמלה בוטלה בעקבות החזרה/ביטול הזמנה."
        : `עמלה של ₪${fmt(m.commissionAmount)} נצברה מרכישה משויכת.`,
  },
  DEPOSIT_LOW: {
    title: "פיקדון השותפות חצה 80%",
    body: (m) => `נוצלו ${m.utilizationPct ?? 80}% מהפיקדון. יש להחליט: להטעין ולהמשיך, או לעצור.`,
  },
  PARTNERSHIP_PAUSED: {
    title: "השותפות הושהתה",
    body: () => "הלינק והקופון הושהו לקליקים חדשים. פנייה מהירה בחדר העבודה תשחרר אותם.",
  },
  TRACKING_OFFLINE: {
    title: "תוסף המעקב אינו מדווח",
    body: () => "לא ניתן לדגום רכישות בשותפות זו. אם התוסף לא יחזור לפעול — הלינק יושהה אוטומטית.",
  },
};

type Meta = {
  reversal?: boolean;
  commissionAmount?: number;
  utilizationPct?: number;
  orderId?: string;
  [k: string]: unknown;
};

const fmt = (n?: number) => (n ?? 0).toLocaleString("he-IL");

/**
 * שולח התראה לשני צדדי השותפות (ולאדמינים כשרלוונטי).
 * `audience`: "both" (ברירת מחדל) / "provider" / "brand" / "admin".
 */
export async function notifyPartnership(
  programId: string,
  type: PartnerNotificationType,
  meta: Meta = {},
  audience: "both" | "provider" | "brand" | "admin" = "both",
): Promise<void> {
  const program = await prisma.partnerProgram.findUnique({
    where: { id: programId },
    select: {
      contractId: true,
      contract: {
        select: {
          providerId: true,
          business: { select: { userId: true } },
        },
      },
    },
  });
  if (!program) return;

  const recipients = new Set<string>();
  if (audience === "both" || audience === "provider") recipients.add(program.contract.providerId);
  if (audience === "both" || audience === "brand") {
    recipients.add(program.contract.business.userId);
  }
  if (audience === "admin") {
    const admins = await prisma.user.findMany({
      where: { roles: { has: "ADMIN" }, status: "ACTIVE" },
      select: { id: true },
    });
    for (const a of admins) recipients.add(a.id);
  }

  const copy = COPY[type];
  const message = copy.body(meta);
  const actionUrl = `/dashboard/contracts/${program.contractId}`;

  await prisma.notification.createMany({
    data: [...recipients].map((userId) => ({
      userId,
      title: copy.title,
      message,
      type,
      actionUrl,
    })),
  });
}

/**
 * מייל אזהרה למנהל האתר על תוסף מעקב אופליין (§5). Notification נוצר בנפרד ע"י notifyPartnership.
 */
export async function emailSiteAdminTrackingOffline(siteId: string): Promise<void> {
  const site = await prisma.trackedSite.findUnique({
    where: { id: siteId },
    select: {
      siteUrl: true,
      business: { select: { billingEmail: true, contactName: true } },
    },
  });
  if (!site?.business.billingEmail) return;

  await sendEmail({
    to: site.business.billingEmail,
    subject: "תוסף המעקב של BridgeAd אינו מדווח",
    text: [
      `שלום ${site.business.contactName ?? ""},`,
      "",
      `תוסף המעקב של BridgeAd באתר ${site.siteUrl} לא שלח אות חיים ביותר מ-12 שעות, בזמן שהיו קליקים על לינק שותפות.`,
      "לא ניתן לדגום רכישות בינתיים, והלינקים בסכנת השהיה אוטומטית תוך 24–48 שעות.",
      "",
      "בדקו שהתוסף פעיל: לוח הבקרה של WordPress → תוספים → BridgeAd, ולחצו על 'בדיקת חיבור'.",
      "אם הצהרתם על חלון תחזוקה — אין צורך בפעולה, ההתראה תיסגר אוטומטית.",
    ].join("\n"),
  });
}
