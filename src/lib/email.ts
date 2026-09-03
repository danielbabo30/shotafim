import "server-only";
import { env, hasEmail } from "@/env";

/**
 * שליחת מייל טרנזקציוני דרך Resend REST API.
 * כשאין מפתח (פיתוח) — no-op + log, לא זורק. שולחי המייל תמיד יוצרים גם Notification
 * ב-DB, כך שהיעדר מייל לא מפיל זרימות.
 */

export type OutboundEmail = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(msg: OutboundEmail): Promise<{ sent: boolean; id?: string }> {
  if (!hasEmail) {
    console.info(`[email] skipped (no AUTH_RESEND_KEY): "${msg.subject}" → ${String(msg.to)}`);
    return { sent: false };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.AUTH_RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        subject: msg.subject,
        text: msg.text,
        ...(msg.html ? { html: msg.html } : {}),
      }),
    });
    if (!res.ok) {
      console.error(`[email] Resend ${res.status}: ${await res.text()}`);
      return { sent: false };
    }
    const data = (await res.json()) as { id?: string };
    return { sent: true, id: data.id };
  } catch (e) {
    console.error("[email] send failed:", e);
    return { sent: false };
  }
}
