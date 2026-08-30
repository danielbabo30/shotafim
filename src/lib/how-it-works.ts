import "server-only";
import { cache } from "react";
import { getPayloadClient } from "@/lib/payload";
import type { HowItWorks } from "@/payload-types";
import { DEFAULT_HOW_IT_WORKS } from "@/lib/how-it-works-defaults";

/**
 * שכבת קריאה מ-CMS לתוכן עמוד "איך זה עובד".
 * cache() מבטל כפילויות באותה בקשה. אם ה-global ריק/לא זמין — נופלים לברירות המחדל.
 */

type HowItWorksData = Omit<HowItWorks, "id" | "updatedAt" | "createdAt">;

export const getHowItWorksData = cache(async (): Promise<HowItWorksData> => {
  try {
    const payload = await getPayloadClient();
    const data = (await payload.findGlobal({
      slug: "how-it-works",
      depth: 0,
    })) as unknown as HowItWorks;

    // ה-global קיים אך טרם נשמר בו תוכן → hero.headingLead יהיה ריק
    if (!data?.hero?.headingLead) return DEFAULT_HOW_IT_WORKS;

    return {
      hero: { ...DEFAULT_HOW_IT_WORKS.hero, ...data.hero },
      timeline: {
        ...DEFAULT_HOW_IT_WORKS.timeline,
        ...data.timeline,
        steps: data.timeline?.steps?.length
          ? data.timeline.steps
          : DEFAULT_HOW_IT_WORKS.timeline.steps,
      },
      comparison: {
        ...DEFAULT_HOW_IT_WORKS.comparison,
        ...data.comparison,
        oldWay: {
          ...DEFAULT_HOW_IT_WORKS.comparison.oldWay,
          ...data.comparison?.oldWay,
          points: data.comparison?.oldWay?.points?.length
            ? data.comparison.oldWay.points
            : DEFAULT_HOW_IT_WORKS.comparison.oldWay.points,
        },
        newWay: {
          ...DEFAULT_HOW_IT_WORKS.comparison.newWay,
          ...data.comparison?.newWay,
          points: data.comparison?.newWay?.points?.length
            ? data.comparison.newWay.points
            : DEFAULT_HOW_IT_WORKS.comparison.newWay.points,
        },
      },
      faq: {
        ...DEFAULT_HOW_IT_WORKS.faq,
        ...data.faq,
        items: data.faq?.items?.length ? data.faq.items : DEFAULT_HOW_IT_WORKS.faq.items,
      },
    };
  } catch {
    return DEFAULT_HOW_IT_WORKS;
  }
});
