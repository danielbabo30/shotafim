import "server-only";
import { cache } from "react";
import { getPayloadClient } from "@/lib/payload";
import type { Homepage } from "@/payload-types";
import { DEFAULT_HOMEPAGE } from "@/lib/homepage-defaults";

/**
 * שכבת קריאה מ-CMS לתוכן עמוד הבית.
 * cache() מבטל כפילויות באותה בקשה. אם ה-global ריק/לא זמין — נופלים לברירות המחדל.
 */

type HomepageData = Omit<Homepage, "id" | "updatedAt" | "createdAt">;

export const getHomepageData = cache(async (): Promise<HomepageData> => {
  try {
    const payload = await getPayloadClient();
    const data = (await payload.findGlobal({
      slug: "homepage",
      depth: 0,
    })) as unknown as Homepage;

    // ה-global קיים אך טרם נשמר בו תוכן → hero.headingLead יהיה ריק
    if (!data?.hero?.headingLead) return DEFAULT_HOMEPAGE;

    return {
      hero: { ...DEFAULT_HOMEPAGE.hero, ...data.hero },
      stats: data.stats?.length ? data.stats : DEFAULT_HOMEPAGE.stats,
      rolesHeading: data.rolesHeading || DEFAULT_HOMEPAGE.rolesHeading,
      rolesSubheading: data.rolesSubheading || DEFAULT_HOMEPAGE.rolesSubheading,
      brandCard: { ...DEFAULT_HOMEPAGE.brandCard, ...data.brandCard },
      influencerCard: { ...DEFAULT_HOMEPAGE.influencerCard, ...data.influencerCard },
      spaceCard: { ...DEFAULT_HOMEPAGE.spaceCard, ...data.spaceCard },
      escrow: { ...DEFAULT_HOMEPAGE.escrow, ...data.escrow },
      articles: { ...DEFAULT_HOMEPAGE.articles, ...data.articles },
    };
  } catch {
    return DEFAULT_HOMEPAGE;
  }
});
