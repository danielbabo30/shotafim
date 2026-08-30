import "server-only";
import { cache } from "react";
import { getPayloadClient } from "@/lib/payload";
import type { Post, PostBlock } from "@/payload-types";
import { POST_CATEGORY_LABELS, type PostCategory } from "@/lib/post-categories";
import { toRenderBlocks, type RenderBlock } from "@/lib/post-content";
import { DEFAULT_POSTS, type PostSeed } from "@/lib/posts-defaults";

/**
 * שכבת קריאה מ-CMS למאמרים. cache() מבטל כפילויות באותה בקשה
 * (index + [slug] + related קוראים fetch אחד). אם ה-collection ריק/לא זמין —
 * נופלים למאמרי ברירת המחדל שב-posts-defaults.ts.
 */

export type ArticleImage = { url: string; alt: string };

export type ArticleListItem = {
  slug: string;
  title: string;
  excerpt: string;
  category: PostCategory;
  categoryLabel: string;
  readingMinutes: number;
  publishedAt: string;
  featured: boolean;
  cover: ArticleImage | null;
  author: { name: string; role: string | null };
};

export type ArticleDetail = {
  slug: string;
  title: string;
  excerpt: string;
  category: PostCategory;
  categoryLabel: string;
  readingMinutes: number;
  publishedAt: string;
  cover: ArticleImage | null;
  author: { name: string; role: string | null; bio: string | null; avatar: ArticleImage | null };
  body: RenderBlock[];
  seo: { metaTitle: string | null; metaDescription: string | null };
};

function toImage(m: unknown, fallbackAlt: string): ArticleImage | null {
  if (m && typeof m === "object" && "url" in m && (m as { url?: string }).url) {
    const media = m as { url: string; alt?: string | null };
    return { url: media.url, alt: media.alt || fallbackAlt };
  }
  return null;
}

function listItemFromPost(doc: Post): ArticleListItem {
  return {
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt,
    category: doc.category,
    categoryLabel: POST_CATEGORY_LABELS[doc.category] ?? doc.category,
    readingMinutes: doc.readingMinutes,
    publishedAt: doc.publishedAt,
    featured: Boolean(doc.featured),
    cover: toImage(doc.coverImage, doc.title),
    author: { name: doc.author.name, role: doc.author.role ?? null },
  };
}

function detailFromPost(doc: Post): ArticleDetail {
  return {
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt,
    category: doc.category,
    categoryLabel: POST_CATEGORY_LABELS[doc.category] ?? doc.category,
    readingMinutes: doc.readingMinutes,
    publishedAt: doc.publishedAt,
    cover: toImage(doc.coverImage, doc.title),
    author: {
      name: doc.author.name,
      role: doc.author.role ?? null,
      bio: doc.author.bio ?? null,
      avatar: toImage(doc.author.avatar, doc.author.name),
    },
    body: toRenderBlocks(doc.body),
    seo: {
      metaTitle: doc.seo?.metaTitle ?? null,
      metaDescription: doc.seo?.metaDescription ?? null,
    },
  };
}

function listItemFromSeed(seed: PostSeed): ArticleListItem {
  return {
    slug: seed.slug,
    title: seed.title,
    excerpt: seed.excerpt,
    category: seed.category,
    categoryLabel: POST_CATEGORY_LABELS[seed.category] ?? seed.category,
    readingMinutes: seed.readingMinutes,
    publishedAt: new Date(seed.publishedAt).toISOString(),
    featured: Boolean(seed.featured),
    cover: null,
    author: { name: seed.author.name, role: seed.author.role ?? null },
  };
}

function detailFromSeed(seed: PostSeed): ArticleDetail {
  return {
    slug: seed.slug,
    title: seed.title,
    excerpt: seed.excerpt,
    category: seed.category,
    categoryLabel: POST_CATEGORY_LABELS[seed.category] ?? seed.category,
    readingMinutes: seed.readingMinutes,
    publishedAt: new Date(seed.publishedAt).toISOString(),
    cover: null,
    author: {
      name: seed.author.name,
      role: seed.author.role ?? null,
      bio: seed.author.bio ?? null,
      avatar: null,
    },
    body: toRenderBlocks(seed.body as PostBlock[]),
    seo: {
      metaTitle: seed.seo?.metaTitle ?? null,
      metaDescription: seed.seo?.metaDescription ?? null,
    },
  };
}

const fetchPosts = cache(async (): Promise<Post[] | null> => {
  try {
    const payload = await getPayloadClient();
    const res = await payload.find({
      collection: "posts",
      depth: 2,
      limit: 100,
      sort: "-publishedAt",
    });
    return (res.docs as unknown as Post[]) ?? null;
  } catch {
    return null;
  }
});

const seedSorted = (): PostSeed[] =>
  [...DEFAULT_POSTS].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));

export const getAllArticles = cache(async (): Promise<ArticleListItem[]> => {
  const docs = await fetchPosts();
  if (docs?.length) return docs.map(listItemFromPost);
  return seedSorted().map(listItemFromSeed);
});

export const getArticle = cache(async (slug: string): Promise<ArticleDetail | null> => {
  const docs = await fetchPosts();
  if (docs?.length) {
    const doc = docs.find((d) => d.slug === slug);
    return doc ? detailFromPost(doc) : null;
  }
  const seed = DEFAULT_POSTS.find((p) => p.slug === slug);
  return seed ? detailFromSeed(seed) : null;
});

export const getFeaturedArticle = cache(async (): Promise<ArticleListItem | null> => {
  const all = await getAllArticles();
  return all.find((a) => a.featured) ?? all[0] ?? null;
});

export const getRelatedArticles = cache(
  async (slug: string, category: PostCategory): Promise<ArticleListItem[]> => {
    const all = (await getAllArticles()).filter((a) => a.slug !== slug);
    const sameCat = all.filter((a) => a.category === category);
    const others = all.filter((a) => a.category !== category);
    return [...sameCat, ...others].slice(0, 3);
  },
);
