import "server-only";
import { cache } from "react";
import { getPayloadClient } from "@/lib/payload";
import type { SolutionsBrands } from "@/payload-types";
import { DEFAULT_SOLUTIONS_BRANDS } from "@/lib/solutions-brands-defaults";

/**
 * שכבת קריאה מ-CMS לתוכן עמוד "פתרונות לעסקים".
 * cache() מבטל כפילויות באותה בקשה. אם ה-global ריק/לא זמין — נופלים לברירות המחדל.
 */

type SolutionsBrandsData = Omit<SolutionsBrands, "id" | "updatedAt" | "createdAt">;

export const getSolutionsBrandsData = cache(async (): Promise<SolutionsBrandsData> => {
  try {
    const payload = await getPayloadClient();
    const data = (await payload.findGlobal({
      slug: "solutions-brands",
      depth: 0,
    })) as unknown as SolutionsBrands;

    // ה-global קיים אך טרם נשמר בו תוכן → hero.headingLead יהיה ריק
    if (!data?.hero?.headingLead) return DEFAULT_SOLUTIONS_BRANDS;

    return {
      hero: { ...DEFAULT_SOLUTIONS_BRANDS.hero, ...data.hero },
      stats: data.stats?.length ? data.stats : DEFAULT_SOLUTIONS_BRANDS.stats,
      showcase: {
        ...DEFAULT_SOLUTIONS_BRANDS.showcase,
        ...data.showcase,
        items: data.showcase?.items?.length
          ? data.showcase.items
          : DEFAULT_SOLUTIONS_BRANDS.showcase.items,
      },
      workflow: {
        ...DEFAULT_SOLUTIONS_BRANDS.workflow,
        ...data.workflow,
        steps: data.workflow?.steps?.length
          ? data.workflow.steps
          : DEFAULT_SOLUTIONS_BRANDS.workflow.steps,
      },
      cta: { ...DEFAULT_SOLUTIONS_BRANDS.cta, ...data.cta },
    };
  } catch {
    return DEFAULT_SOLUTIONS_BRANDS;
  }
});
