import "server-only";
import { cache } from "react";
import { getPayloadClient } from "@/lib/payload";
import type { SolutionsCreators } from "@/payload-types";
import { DEFAULT_SOLUTIONS_CREATORS } from "@/lib/solutions-creators-defaults";

/**
 * שכבת קריאה מ-CMS לתוכן עמוד "פתרונות — ליוצרי תוכן".
 * cache() מבטל כפילויות באותה בקשה. אם ה-global ריק/לא זמין — נופלים לברירות המחדל.
 */

type SolutionsCreatorsData = Omit<SolutionsCreators, "id" | "updatedAt" | "createdAt">;

export const getSolutionsCreatorsData = cache(async (): Promise<SolutionsCreatorsData> => {
  try {
    const payload = await getPayloadClient();
    const data = (await payload.findGlobal({
      slug: "solutions-creators",
      depth: 0,
    })) as unknown as SolutionsCreators;

    // ה-global קיים אך טרם נשמר בו תוכן → hero.headingLead יהיה ריק
    if (!data?.hero?.headingLead) return DEFAULT_SOLUTIONS_CREATORS;

    return {
      hero: { ...DEFAULT_SOLUTIONS_CREATORS.hero, ...data.hero },
      stats: data.stats?.length ? data.stats : DEFAULT_SOLUTIONS_CREATORS.stats,
      showcase: {
        ...DEFAULT_SOLUTIONS_CREATORS.showcase,
        ...data.showcase,
        items: data.showcase?.items?.length
          ? data.showcase.items
          : DEFAULT_SOLUTIONS_CREATORS.showcase.items,
      },
      workflow: {
        ...DEFAULT_SOLUTIONS_CREATORS.workflow,
        ...data.workflow,
        steps: data.workflow?.steps?.length
          ? data.workflow.steps
          : DEFAULT_SOLUTIONS_CREATORS.workflow.steps,
      },
      cta: { ...DEFAULT_SOLUTIONS_CREATORS.cta, ...data.cta },
    };
  } catch {
    return DEFAULT_SOLUTIONS_CREATORS;
  }
});
