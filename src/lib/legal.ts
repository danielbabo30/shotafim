import "server-only";
import { cache } from "react";
import { getPayloadClient } from "@/lib/payload";
import type { LegalPage, PostBlock } from "@/payload-types";
import { toRenderBlocks, type RenderBlock } from "@/lib/post-content";
import { LEGAL_PAGES, legalPageLabel, type LegalPageSlug } from "@/lib/legal-pages";
import { LEGAL_SEEDS, type LegalSeed } from "@/lib/legal-defaults";

/**
 * שכבת קריאה מ-CMS למסמכים המשפטיים. cache() מבטל כפילויות באותה בקשה.
 * אם ה-collection ריק/לא זמין — נופלים לתוכן ברירת המחדל שב-legal-defaults.ts.
 */

export type LegalDoc = {
  slug: LegalPageSlug;
  label: string;
  title: string;
  intro: string;
  body: RenderBlock[];
  updatedAt: string | null;
  seo: { metaTitle: string | null; metaDescription: string | null };
};

function docFromRecord(doc: LegalPage): LegalDoc {
  return {
    slug: doc.slug,
    label: legalPageLabel(doc.slug),
    title: doc.title,
    intro: doc.intro ?? "",
    body: toRenderBlocks(doc.body),
    updatedAt: doc.updatedAt ?? null,
    seo: {
      metaTitle: doc.seo?.metaTitle ?? null,
      metaDescription: doc.seo?.metaDescription ?? null,
    },
  };
}

function docFromSeed(seed: LegalSeed): LegalDoc {
  return {
    slug: seed.slug,
    label: legalPageLabel(seed.slug),
    title: seed.title,
    intro: seed.intro,
    body: toRenderBlocks(seed.body as unknown as PostBlock[]),
    updatedAt: new Date(seed.updatedAt).toISOString(),
    seo: {
      metaTitle: seed.seo?.metaTitle ?? null,
      metaDescription: seed.seo?.metaDescription ?? null,
    },
  };
}

const fetchLegalPages = cache(async (): Promise<LegalPage[] | null> => {
  try {
    const payload = await getPayloadClient();
    const res = await payload.find({
      collection: "legal-pages",
      depth: 1,
      limit: 20,
    });
    return (res.docs as unknown as LegalPage[]) ?? null;
  } catch {
    return null;
  }
});

/** מסמך משפטי בודד לפי slug. CMS קודם, אחרת ברירת המחדל. */
export const getLegalPage = cache(async (slug: string): Promise<LegalDoc | null> => {
  const docs = await fetchLegalPages();
  const doc = docs?.find((d) => d.slug === slug);
  if (doc) return docFromRecord(doc);

  const seed = LEGAL_SEEDS.find((s) => s.slug === slug);
  return seed ? docFromSeed(seed) : null;
});

/** כל המסמכים לפי סדר הטאבים הקבוע — לניווט וללינקים. */
export const getLegalPages = cache(async (): Promise<{ slug: LegalPageSlug; label: string }[]> => {
  return LEGAL_PAGES.map((p) => ({ slug: p.slug, label: p.label }));
});
