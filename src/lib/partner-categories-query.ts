import "server-only";
import { cache } from "react";
import { getPayloadClient } from "@/lib/payload";
import type { Category } from "@/payload-types";
import {
  isCategoryScope,
  type CategoryScope,
  type PartnerCategory,
} from "@/lib/partner-categories";
import { PARTNER_CATEGORY_SEEDS } from "@/lib/partner-categories-defaults";

/**
 * שכבת קריאה לקטגוריות הדומיין מ-Payload. cache() מבטל כפילויות באותה בקשה.
 * אם ה-collection ריק/לא זמין — נופלים ל-PARTNER_CATEGORY_SEEDS.
 */

function fromSeeds(): PartnerCategory[] {
  return PARTNER_CATEGORY_SEEDS.map((seed, i) => ({
    slug: seed.slug,
    name: seed.name,
    scopes: seed.scopes,
    iconName: seed.iconName ?? null,
    parentSlug: seed.parentSlug ?? null,
    sortOrder: i,
  }));
}

function normalize(doc: Category): PartnerCategory {
  const parent = doc.parent;
  return {
    slug: doc.slug,
    name: doc.name,
    scopes: (doc.scopes ?? []).filter(isCategoryScope),
    iconName: doc.iconName ?? null,
    parentSlug: parent && typeof parent === "object" ? parent.slug : null,
    sortOrder: doc.sortOrder ?? 0,
  };
}

const fetchAll = cache(async (): Promise<PartnerCategory[]> => {
  try {
    const payload = await getPayloadClient();
    const res = await payload.find({
      collection: "categories",
      where: { isActive: { not_equals: false } },
      sort: "sortOrder",
      depth: 1,
      limit: 500,
      pagination: false,
    });
    const docs = res.docs as unknown as Category[];
    if (docs.length) return docs.map(normalize);
  } catch {
    // ה-collection לא זמין (בנייה / DB) — נופלים לברירות המחדל
  }
  return fromSeeds();
});

/** כל הקטגוריות הפעילות, ממוינות. */
export async function getPartnerCategories(): Promise<PartnerCategory[]> {
  return fetchAll();
}

/** קטגוריות פעילות המוצעות ל-scope מסוים (מותגים / יוצרים / שטחי פרסום). */
export async function getPartnerCategoriesForScope(
  scope: CategoryScope,
): Promise<PartnerCategory[]> {
  const all = await fetchAll();
  return all.filter((c) => c.scopes.includes(scope));
}

/** מיפוי slug → שם לתצוגה (כולל קטגוריות לא פעילות, לרינדור שיוכים היסטוריים). */
export const getPartnerCategoryLabels = cache(async (): Promise<Record<string, string>> => {
  try {
    const payload = await getPayloadClient();
    const res = await payload.find({
      collection: "categories",
      sort: "sortOrder",
      limit: 500,
      pagination: false,
    });
    const docs = res.docs as unknown as Category[];
    if (docs.length) {
      return Object.fromEntries(docs.map((d) => [d.slug, d.name]));
    }
  } catch {
    // fallthrough
  }
  return Object.fromEntries(PARTNER_CATEGORY_SEEDS.map((s) => [s.slug, s.name]));
});
