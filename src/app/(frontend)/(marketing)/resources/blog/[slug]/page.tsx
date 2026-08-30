import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ArticleHero } from "@/components/marketing/article-hero";
import { ArticleBody } from "@/components/marketing/article-body";
import { ArticleToc } from "@/components/marketing/article-toc";
import { ArticleSidebarCta } from "@/components/marketing/article-sidebar-cta";
import { AuthorBio } from "@/components/marketing/author-bio";
import { ArticleFeedback } from "@/components/marketing/article-feedback";
import { RelatedArticles } from "@/components/marketing/related-articles";
import { getTocItems } from "@/lib/post-content";
import { getAllArticles, getArticle, getRelatedArticles } from "@/lib/posts";
import { site } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const articles = await getAllArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getArticle(slug);
  if (!post) return {};

  const title = post.seo.metaTitle ?? post.title;
  const description = post.seo.metaDescription ?? post.excerpt;

  return {
    title,
    description,
    alternates: { canonical: `/resources/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: post.publishedAt,
      authors: [post.author.name],
      ...(post.cover ? { images: [{ url: post.cover.url }] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const post = await getArticle(slug);
  if (!post) notFound();

  const related = await getRelatedArticles(post.slug, post.category);
  const toc = getTocItems(post.body);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    author: { "@type": "Person", name: post.author.name },
    publisher: { "@type": "Organization", name: site.name },
    mainEntityOfPage: `${site.url}/resources/blog/${post.slug}`,
    ...(post.cover ? { image: post.cover.url } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container className="py-12">
        <ArticleHero post={post} />

        {post.cover && (
          <figure className="border-outline-variant/60 mx-auto mt-8 max-w-4xl overflow-hidden rounded-xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover.url} alt={post.cover.alt} className="w-full object-cover" />
          </figure>
        )}

        <div className="mx-auto mt-10 flex max-w-5xl flex-col gap-10 lg:flex-row lg:items-start">
          <article className="lg:w-2/3">
            <ArticleBody blocks={post.body} />
          </article>
          <aside className="space-y-8 lg:w-1/3">
            {toc.length > 0 && <ArticleToc items={toc} />}
            <ArticleSidebarCta />
          </aside>
        </div>
      </Container>

      <div className="border-outline-variant/60 bg-surface-low border-t">
        <Container className="max-w-3xl py-16">
          <AuthorBio author={post.author} />
          <ArticleFeedback />
        </Container>
      </div>

      {related.length > 0 && (
        <Container className="py-16">
          <RelatedArticles posts={related} />
        </Container>
      )}
    </>
  );
}
