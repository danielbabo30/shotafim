import "server-only";
import { cache } from "react";
import { getPayloadClient } from "@/lib/payload";
import type { SolutionsAdSpaces } from "@/payload-types";
import { DEFAULT_SOLUTIONS_AD_SPACES } from "@/lib/solutions-ad-spaces-defaults";

/**
 * שכבת קריאה מ-CMS לתוכן עמוד "פתרונות לבעלי שטחי פרסום".
 * cache() מבטל כפילויות באותה בקשה. אם ה-global ריק/לא זמין — נופלים לברירות המחדל.
 */

type SolutionsAdSpacesData = Omit<SolutionsAdSpaces, "id" | "updatedAt" | "createdAt">;

export const getSolutionsAdSpacesData = cache(async (): Promise<SolutionsAdSpacesData> => {
  try {
    const payload = await getPayloadClient();
    const data = (await payload.findGlobal({
      slug: "solutions-ad-spaces",
      depth: 0,
    })) as unknown as SolutionsAdSpaces;

    // ה-global קיים אך טרם נשמר בו תוכן → hero.headingLead יהיה ריק
    if (!data?.hero?.headingLead) return DEFAULT_SOLUTIONS_AD_SPACES;

    return {
      hero: { ...DEFAULT_SOLUTIONS_AD_SPACES.hero, ...data.hero },
      stats: data.stats?.length ? data.stats : DEFAULT_SOLUTIONS_AD_SPACES.stats,
      showcase: {
        ...DEFAULT_SOLUTIONS_AD_SPACES.showcase,
        ...data.showcase,
        items: data.showcase?.items?.length
          ? data.showcase.items
          : DEFAULT_SOLUTIONS_AD_SPACES.showcase.items,
      },
      workflow: {
        ...DEFAULT_SOLUTIONS_AD_SPACES.workflow,
        ...data.workflow,
        steps: data.workflow?.steps?.length
          ? data.workflow.steps
          : DEFAULT_SOLUTIONS_AD_SPACES.workflow.steps,
      },
      cta: { ...DEFAULT_SOLUTIONS_AD_SPACES.cta, ...data.cta },
    };
  } catch {
    return DEFAULT_SOLUTIONS_AD_SPACES;
  }
});
