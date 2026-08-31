import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileSetupForm } from "@/components/auth/profile-setup-form";
import { requireRegistrationUser } from "@/lib/registration";
import { getCities } from "@/lib/cities";
import { getPartnerCategoriesForScope } from "@/lib/partner-categories-query";

export const metadata: Metadata = {
  title: "הגדרת פרופיל",
  description: "שלב 3 בהרשמה — הגדרת פרטי הפעילות והתשלום שלך במערכת שותפים.",
};

export default async function RegisterProfilePage() {
  const user = await requireRegistrationUser();
  if (user.status === "ACTIVE") redirect("/dashboard");
  if (user.roleKeys.length === 0) redirect("/register/roles");

  const [cities, brandCategories, creatorCategories] = await Promise.all([
    getCities(),
    getPartnerCategoriesForScope("BRAND"),
    getPartnerCategoriesForScope("CREATOR"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col px-4 pt-12 pb-32 sm:px-6">
      <div className="mb-10 flex justify-center">
        <span className="bg-surface-high text-primary inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-sm font-semibold">
          שלב 3 מתוך 3: הגדרת פרטי פעילות
          <span className="bg-primary-fixed h-1.5 w-16 overflow-hidden rounded-full">
            <span className="bg-primary block h-full w-full" />
          </span>
        </span>
      </div>

      <ProfileSetupForm
        roles={user.roleKeys}
        cities={cities}
        brandCategories={brandCategories.map((c) => ({ slug: c.slug, name: c.name }))}
        creatorCategories={creatorCategories.map((c) => ({ slug: c.slug, name: c.name }))}
      />
    </main>
  );
}
