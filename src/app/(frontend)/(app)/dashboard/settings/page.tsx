import type { Metadata } from "next";
import { requireActiveUser } from "@/lib/app-user";
import { getSettingsData } from "@/lib/settings";
import { getCities } from "@/lib/cities";
import { getPartnerCategoriesForScope } from "@/lib/partner-categories-query";
import { AccountForm } from "@/components/app/settings/account-form";
import { BrandForm } from "@/components/app/settings/brand-form";
import { CreatorProfileForm } from "@/components/app/settings/creator-profile-form";
import { CreatorImages } from "@/components/app/settings/creator-images";
import { CreatorChannels } from "@/components/app/settings/creator-channels";
import { CreatorPricingPackages } from "@/components/app/settings/creator-pricing";
import { SpaceOwnerForm } from "@/components/app/settings/space-owner-form";

export const metadata: Metadata = { title: "הגדרות" };

/**
 * מסך הגדרות — סקציית "חשבון" תמיד, ואז סקציה נפרדת לכל תפקיד שיש למשתמש
 * (לא רק activeRole) שיש לו פרופיל תואם. כל הנתונים מ-Prisma, מסוננים למשתמש המחובר.
 */
export default async function SettingsPage() {
  const user = await requireActiveUser();
  const data = await getSettingsData(user.id);

  const needsBrandCategories = data.brand != null;
  const needsCreatorCategories = data.creator != null;
  const needsCities = data.creator != null;

  const [brandCategories, creatorCategories, cities] = await Promise.all([
    needsBrandCategories ? getPartnerCategoriesForScope("BRAND") : Promise.resolve([]),
    needsCreatorCategories ? getPartnerCategoriesForScope("CREATOR") : Promise.resolve([]),
    needsCities ? getCities() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-on-surface text-2xl font-bold">הגדרות</h1>
        <p className="text-on-surface-variant mt-1 max-w-2xl text-sm leading-relaxed">
          ניהול פרטי החשבון ופרופילי התפקידים שלך במערכת.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-on-surface text-lg font-bold">חשבון</h2>
        <AccountForm account={data.account} />
      </section>

      {data.brand && (
        <section className="flex flex-col gap-4">
          <h2 className="text-on-surface text-lg font-bold">פרופיל מפרסם</h2>
          <BrandForm brand={data.brand} categories={brandCategories} />
        </section>
      )}

      {data.creator && (
        <section className="flex flex-col gap-4">
          <h2 className="text-on-surface text-lg font-bold">פרופיל יוצר תוכן</h2>
          <CreatorProfileForm
            creator={data.creator}
            categories={creatorCategories}
            cities={cities}
          />
          <CreatorImages
            avatarUrl={data.creator.avatarUrl}
            coverImageUrl={data.creator.coverImageUrl}
          />
          <CreatorChannels connections={data.creator.socialConnections} />
          <CreatorPricingPackages packages={data.creator.pricingPackages} />
        </section>
      )}

      {data.adSpaceOwner && (
        <section className="flex flex-col gap-4">
          <h2 className="text-on-surface text-lg font-bold">פרופיל בעל שטחי פרסום</h2>
          <SpaceOwnerForm owner={data.adSpaceOwner} />
        </section>
      )}
    </div>
  );
}
