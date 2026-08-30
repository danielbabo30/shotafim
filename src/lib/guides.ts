import "server-only";
import { cache } from "react";
import { getPayloadClient } from "@/lib/payload";
import type { Guide, GuideBlock } from "@/payload-types";
import {
  GUIDE_CATEGORIES,
  GUIDE_CATEGORY_LABELS,
  GUIDE_AUDIENCE_LABELS,
  type GuideCategory,
  type GuideAudience,
} from "@/lib/guide-categories";
import { toGuideRenderBlocks, type GuideRenderBlock } from "@/lib/guide-content";
import { GUIDE_SEEDS, type GuideSeed } from "@/lib/guides-defaults";

/**
 * שכבת קריאה מ-CMS למדריכים. cache() מבטל כפילויות באותה בקשה
 * (לובי + [slug] + "המדריך הבא" קוראים fetch אחד). אם ה-collection ריק/לא זמין —
 * נופלים למדריכי ברירת המחדל שב-guides-defaults.ts.
 */

export type GuideListItem = {
  slug: string;
  title: string;
  excerpt: string;
  category: GuideCategory;
  categoryLabel: string;
  audience: GuideAudience;
  audienceLabel: string;
  readingMinutes: number;
  updatedAt: string;
  official: boolean;
  popular: boolean;
  stepsBadge: string | null;
};

export type GuideDetail = GuideListItem & {
  intro: string;
  prerequisites: string[];
  body: GuideRenderBlock[];
  nextGuide: { slug: string; title: string } | null;
  seo: { metaTitle: string | null; metaDescription: string | null };
};

export type GuideCategoryGroup = {
  value: GuideCategory;
  label: string;
  description: string;
  icon: (typeof GUIDE_CATEGORIES)[number]["icon"];
  guides: GuideListItem[];
};

function countSteps(body: GuideBlock[]): number {
  return body
    .filter((b): b is Extract<GuideBlock, { blockType: "steps" }> => b.blockType === "steps")
    .reduce((sum, b) => sum + (b.steps?.length ?? 0), 0);
}

function deriveBadge(explicit: string | null | undefined, stepCount: number): string | null {
  if (explicit) return explicit;
  return stepCount > 0 ? `מדריך ב-${stepCount} שלבים` : null;
}

function listItem(source: {
  slug: string;
  title: string;
  excerpt: string;
  category: GuideCategory;
  audience: GuideAudience;
  readingMinutes: number;
  updatedAt: string;
  official: boolean;
  popular: boolean;
  stepsBadge: string | null;
}): GuideListItem {
  return {
    ...source,
    categoryLabel: GUIDE_CATEGORY_LABELS[source.category] ?? source.category,
    audienceLabel: GUIDE_AUDIENCE_LABELS[source.audience] ?? source.audience,
  };
}

function listItemFromDoc(doc: Guide): GuideListItem {
  return listItem({
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt,
    category: doc.category,
    audience: doc.audience,
    readingMinutes: doc.readingMinutes,
    updatedAt: doc.updatedAt,
    official: doc.official ?? true,
    popular: Boolean(doc.popular),
    stepsBadge: deriveBadge(doc.stepsBadge, countSteps(doc.body)),
  });
}

function listItemFromSeed(seed: GuideSeed): GuideListItem {
  const body = seed.body as unknown as GuideBlock[];
  return listItem({
    slug: seed.slug,
    title: seed.title,
    excerpt: seed.excerpt,
    category: seed.category,
    audience: seed.audience,
    readingMinutes: seed.readingMinutes,
    updatedAt: new Date(seed.publishedAt).toISOString(),
    official: seed.official ?? true,
    popular: Boolean(seed.popular),
    stepsBadge: deriveBadge(seed.stepsBadge, countSteps(body)),
  });
}

function detailFromDoc(doc: Guide, all: GuideListItem[]): GuideDetail {
  return {
    ...listItemFromDoc(doc),
    intro: doc.intro,
    prerequisites: (doc.prerequisites ?? []).map((p) => p.text),
    body: toGuideRenderBlocks(doc.body),
    nextGuide: resolveNext(doc.nextGuideSlug, all),
    seo: {
      metaTitle: doc.seo?.metaTitle ?? null,
      metaDescription: doc.seo?.metaDescription ?? null,
    },
  };
}

function detailFromSeed(seed: GuideSeed, all: GuideListItem[]): GuideDetail {
  return {
    ...listItemFromSeed(seed),
    intro: seed.intro,
    prerequisites: (seed.prerequisites ?? []).map((p) => p.text),
    body: toGuideRenderBlocks(seed.body as unknown as GuideBlock[]),
    nextGuide: resolveNext(seed.nextGuideSlug, all),
    seo: {
      metaTitle: seed.seo?.metaTitle ?? null,
      metaDescription: seed.seo?.metaDescription ?? null,
    },
  };
}

function resolveNext(
  slug: string | null | undefined,
  all: GuideListItem[],
): { slug: string; title: string } | null {
  if (!slug) return null;
  const found = all.find((g) => g.slug === slug);
  return found ? { slug: found.slug, title: found.title } : null;
}

const fetchGuides = cache(async (): Promise<Guide[] | null> => {
  try {
    const payload = await getPayloadClient();
    const res = await payload.find({
      collection: "guides",
      depth: 2,
      limit: 200,
      sort: "-publishedAt",
    });
    return (res.docs as unknown as Guide[]) ?? null;
  } catch {
    return null;
  }
});

const seedSorted = (): GuideSeed[] =>
  [...GUIDE_SEEDS].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));

export const getAllGuides = cache(async (): Promise<GuideListItem[]> => {
  const docs = await fetchGuides();
  if (docs?.length) return docs.map(listItemFromDoc);
  return seedSorted().map(listItemFromSeed);
});

export const getGuide = cache(async (slug: string): Promise<GuideDetail | null> => {
  const all = await getAllGuides();
  const docs = await fetchGuides();
  if (docs?.length) {
    const doc = docs.find((d) => d.slug === slug);
    return doc ? detailFromDoc(doc, all) : null;
  }
  const seed = GUIDE_SEEDS.find((g) => g.slug === slug);
  return seed ? detailFromSeed(seed, all) : null;
});

export const getPopularGuides = cache(async (): Promise<GuideListItem[]> => {
  const all = await getAllGuides();
  const popular = all.filter((g) => g.popular);
  return (popular.length ? popular : all).slice(0, 3);
});

/** מדריכים מקובצים לפי קטגוריה — לפי סדר `GUIDE_CATEGORIES`. קטגוריות ריקות מושמטות. */
export const getGuidesByCategory = cache(async (): Promise<GuideCategoryGroup[]> => {
  const all = await getAllGuides();
  return GUIDE_CATEGORIES.map((c) => ({
    value: c.value,
    label: c.he,
    description: c.description,
    icon: c.icon,
    guides: all.filter((g) => g.category === c.value),
  })).filter((group) => group.guides.length > 0);
});
