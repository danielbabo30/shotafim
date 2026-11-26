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
import { PluginSection } from "@/components/app/plugin/plugin-section";

export const metadata: Metadata = { title: "הגדרות" };

/**
 * מסך הגדרות — סקציית "חשבון" תמיד, ואז סקציה נפרדת לכל תפקיד שיש למשתמש
 * (לא רק activeRole) שיש לו פרופיל תואם. כל הנתונים מ-Prisma, מסוננים למשתמש המחובר.
 */
const OAUTH_PLATFORM_LABEL = { youtube: "יוטיוב", facebook: "פייסבוק / אינסטגרם" } as const;

const OAUTH_ERROR_REASONS: Record<string, string> = {
  "state-mismatch": "בקשת החיבור פגה או לא תקינה — נסו להתחבר שוב.",
  "missing-code": "לא התקבל אישור מהפלטפורמה — נסו שוב.",
  "not-configured": "החיבור לפלטפורמה אינו מוגדר כרגע.",
  "token-exchange-failed": "החלפת ההרשאה נכשלה — נסו שוב.",
  "no-refresh-token": "לא התקבלה הרשאה מתמשכת — אשרו את כל ההרשאות ונסו שוב.",
  "channel-fetch-failed": "לא הצלחנו לקרוא את נתוני הערוץ.",
  "no-pages": "לא נמצא עמוד עסקי מחובר בחשבון.",
  "no-creator": "החיבור זמין לחשבון יוצר בלבד.",
  "network-error": "תקלת תקשורת מול הפלטפורמה — נסו שוב בעוד רגע.",
};

/** משוב לחזרה מזרימת OAuth (?youtube= / ?facebook=) */
function oauthFeedback(sp: Record<string, string | undefined>) {
  for (const key of ["youtube", "facebook"] as const) {
    const v = sp[key];
    if (!v) continue;
    const label = OAUTH_PLATFORM_LABEL[key];
    if (v === "connected") return { tone: "success" as const, text: `החיבור ל${label} הושלם.` };
    if (v === "cancelled") return { tone: "neutral" as const, text: `החיבור ל${label} בוטל.` };
    if (v === "consent-required") {
      return { tone: "error" as const, text: `לפני החיבור ל${label} יש לאשר את תיבת ההסכמה.` };
    }
    if (v === "error") {
      const reason = sp.reason ? OAUTH_ERROR_REASONS[sp.reason] : undefined;
      return { tone: "error" as const, text: `החיבור ל${label} נכשל. ${reason ?? "נסו שוב."}` };
    }
  }
  return null;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireActiveUser();
  const feedback = oauthFeedback(await searchParams);
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

      {feedback && (
        <p
          role="status"
          className={
            feedback.tone === "success"
              ? "bg-success-container text-success rounded-lg p-3 text-sm"
              : feedback.tone === "error"
                ? "bg-error-container text-on-error-container rounded-lg p-3 text-sm"
                : "bg-surface-container text-on-surface-variant rounded-lg p-3 text-sm"
          }
        >
          {feedback.text}
        </p>
      )}

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

      {user.roleKeys.includes("brand") && <PluginSection />}

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
