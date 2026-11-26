import type { Metadata } from "next";
import { requireActiveUser, requireRole } from "@/lib/app-user";
import {
  BusinessDirectoryCard,
  BusinessDirectoryEmptyState,
  BusinessDirectorySearchForm,
} from "@/components/app/businesses/business-directory";
import { getBusinessDirectory } from "@/lib/business-directory";
import {
  getPartnerCategoriesForScope,
  getPartnerCategoryLabels,
} from "@/lib/partner-categories-query";
import { ActionErrorBanner } from "@/components/app/action-error-banner";
import { getCities } from "@/lib/cities";

export const metadata: Metadata = { title: "חיפוש עסקים" };

export default async function BusinessesDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; city?: string; err?: string }>;
}) {
  const user = await requireActiveUser();
  requireRole(user, ["creator", "space"]);

  const { q = "", category = "", city = "", err } = await searchParams;

  const [businesses, categories, categoryLabels, cities] = await Promise.all([
    getBusinessDirectory({
      q: q || undefined,
      category: category || undefined,
      city: city || undefined,
    }),
    getPartnerCategoriesForScope("BRAND"),
    getPartnerCategoryLabels(),
    getCities(),
  ]);

  const cityLabelById = new Map(cities.map((c) => [c.id, c.nameHe]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-on-surface text-2xl font-bold">חיפוש עסקים</h1>
        <p className="text-on-surface-variant mt-1 max-w-2xl text-sm leading-relaxed">
          חפשו עסקים פעילים במערכת לפי שם, קטגוריה או עיר, וצרו איתם קשר ישירות.
        </p>
      </div>

      <ActionErrorBanner code={err} />

      <BusinessDirectorySearchForm
        query={q}
        categoryOptions={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        cityOptions={cities}
        selectedCategory={category}
        selectedCity={city}
      />

      {businesses.length === 0 ? (
        <BusinessDirectoryEmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <BusinessDirectoryCard
              key={b.id}
              business={b}
              categoryLabels={categoryLabels}
              cityLabel={b.cityId ? (cityLabelById.get(b.cityId) ?? null) : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
