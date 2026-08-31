import "server-only";
import { cache } from "react";
import { getPayloadClient } from "@/lib/payload";
import type { AuthPanel } from "@/payload-types";
import { DEFAULT_AUTH_PANEL } from "@/lib/auth-panel-defaults";

/**
 * שכבת קריאה מ-CMS לתוכן הפאנל הצדדי של מסכי ההרשמה/כניסה.
 * cache() מבטל כפילויות באותה בקשה. אם ה-global ריק/לא זמין — נופלים לברירות המחדל.
 * depth: 1 — כדי לקבל את אובייקטי המדיה (אווטרים, תמונת ממליץ) ולא רק מזהים.
 */

type AuthPanelData = Omit<AuthPanel, "id" | "updatedAt" | "createdAt">;

export const getAuthPanelData = cache(async (): Promise<AuthPanelData> => {
  try {
    const payload = await getPayloadClient();
    const data = (await payload.findGlobal({
      slug: "auth-panel",
      depth: 1,
    })) as unknown as AuthPanel;

    // ה-global קיים אך טרם נשמר בו תוכן → heading.lead יהיה ריק
    if (!data?.heading?.lead) return DEFAULT_AUTH_PANEL;

    return {
      statusLabel: data.statusLabel || DEFAULT_AUTH_PANEL.statusLabel,
      heading: { ...DEFAULT_AUTH_PANEL.heading, ...data.heading },
      body: data.body || DEFAULT_AUTH_PANEL.body,
      metric: {
        ...DEFAULT_AUTH_PANEL.metric,
        ...data.metric,
        steps: data.metric?.steps?.length ? data.metric.steps : DEFAULT_AUTH_PANEL.metric.steps,
        trustAvatars: data.metric?.trustAvatars ?? [],
      },
      testimonial: { ...DEFAULT_AUTH_PANEL.testimonial, ...data.testimonial },
    };
  } catch {
    return DEFAULT_AUTH_PANEL;
  }
});
