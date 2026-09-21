import type { Metadata } from "next";
import { requireActiveUser } from "@/lib/app-user";
import { getPartnerCategoriesForScope } from "@/lib/partner-categories-query";
import { getMarketplaceCreators } from "@/lib/marketplace-query";
import { listBrandOpenCampaigns } from "@/lib/campaigns";
import { MarketplaceBrowser } from "@/components/app/marketplace/marketplace-browser";

export const metadata: Metadata = { title: "מרקטפלייס יוצרים" };

export default async function MarketplacePage() {
  const user = await requireActiveUser();

  if (user.activeRole !== "brand") {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-on-surface text-2xl font-bold sm:text-3xl">
          מרקטפלייס יוצרים
        </h1>
        <div className="border-outline-variant bg-surface-lowest text-on-surface-variant rounded-xl border p-8 text-sm leading-relaxed">
          החיבור ליוצרים ומשפיענים זמין בכובע «מפרסם». החליפו למצב מפרסם מהסרגל העליון.
        </div>
      </div>
    );
  }

  const [creators, categories, openCampaigns] = await Promise.all([
    getMarketplaceCreators(),
    getPartnerCategoriesForScope("CREATOR"),
    listBrandOpenCampaigns("CREATOR"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-on-surface text-2xl font-bold sm:text-3xl">
          חיבור ליוצרים ומשפיענים
        </h1>
        <p className="text-on-surface-variant text-sm">
          סננו לפי תחום, פלטפורמה, טווח עוקבים ותקציב — והזמינו יוצרים ישירות לבריף פעיל.
        </p>
      </header>

      <MarketplaceBrowser
        creators={creators}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        openCampaigns={openCampaigns.map((c) => ({ id: c.id, title: c.title }))}
      />
    </div>
  );
}
