import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { StatsBar } from "@/components/marketing/stats-bar";
import { RoleCards } from "@/components/marketing/role-cards";
import { EscrowSteps } from "@/components/marketing/escrow-steps";
import { ArticleCarousel } from "@/components/marketing/article-carousel";
import { getHomepageData } from "@/lib/homepage";
import { getAllArticles } from "@/lib/posts";

export const metadata: Metadata = {
  title: "מרקטפלייס פרסום פרימיום",
  description:
    "מרקטפלייס לחיבור בין מותגים, יוצרי תוכן ובעלי שטחי פרסום — עם הגנת ארנק נאמנות מבוססת אבני דרך ואנליטיקת קהל מאומתת.",
};

export default async function HomePage() {
  const [home, articles] = await Promise.all([getHomepageData(), getAllArticles()]);

  return (
    <>
      <Hero hero={home.hero} />
      <StatsBar stats={home.stats ?? []} />
      <RoleCards
        heading={home.rolesHeading}
        subheading={home.rolesSubheading}
        brand={home.brandCard}
        influencer={home.influencerCard}
        space={home.spaceCard}
      />
      <EscrowSteps escrow={home.escrow} />
      {home.articles.enabled !== false && articles.length > 0 && (
        <ArticleCarousel
          heading={home.articles.heading}
          subheading={home.articles.subheading}
          ctaLabel={home.articles.ctaLabel}
          ctaHref={home.articles.ctaHref}
          posts={articles.slice(0, 6)}
        />
      )}
    </>
  );
}
