import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { GuideArticleHeader } from "@/components/marketing/guide-article-header";
import { GuidePrereqs } from "@/components/marketing/guide-prereqs";
import { GuideBody } from "@/components/marketing/guide-body";
import { GuideHelpCard } from "@/components/marketing/guide-help-card";
import { ArticleToc } from "@/components/marketing/article-toc";
import { ArticleFeedback } from "@/components/marketing/article-feedback";
import { ArrowIcon } from "@/components/marketing/icons";
import { getGuideTocItems } from "@/lib/guide-content";
import { getAllGuides, getGuide } from "@/lib/guides";
import { site } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const guides = await getAllGuides();
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) return {};

  const title = guide.seo.metaTitle ?? guide.title;
  const description = guide.seo.metaDescription ?? guide.excerpt;

  return {
    title,
    description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: { type: "article", title, description },
  };
}

export default async function GuidePage({ params }: Params) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) notFound();

  const toc = getGuideTocItems(guide.body);

  const steps = guide.body
    .filter((b): b is Extract<typeof b, { type: "steps" }> => b.type === "steps")
    .flatMap((b) => b.steps);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: guide.title,
    description: guide.excerpt,
    ...(guide.prerequisites.length
      ? { supply: guide.prerequisites.map((text) => ({ "@type": "HowToSupply", name: text })) }
      : {}),
    ...(steps.length
      ? {
          step: steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.title,
            text: s.body,
          })),
        }
      : {}),
    publisher: { "@type": "Organization", name: site.name },
    mainEntityOfPage: `${site.url}/guides/${guide.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container className="py-12">
        <GuideArticleHeader guide={guide} />

        <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-start">
          <article className="lg:w-2/3">
            <GuidePrereqs items={guide.prerequisites} />
            <GuideBody blocks={guide.body} />
            <ArticleFeedback subject="המדריך" />
          </article>

          <aside className="space-y-8 lg:w-1/3">
            {toc.length > 0 && <ArticleToc items={toc} />}
            <GuideHelpCard variant="sidebar" />

            {guide.nextGuide && (
              <Link
                href={`/guides/${guide.nextGuide.slug}`}
                className="group border-outline-variant/60 bg-surface-lowest hover:border-primary hover:shadow-ambient block rounded-xl border p-5 transition-all"
              >
                <span className="text-on-surface-variant mb-2 block text-xs font-semibold tracking-wide">
                  המדריך הבא
                </span>
                <span className="group-hover:text-primary flex items-center justify-between gap-2 font-bold transition-colors">
                  {guide.nextGuide.title}
                  <ArrowIcon className="size-5 shrink-0" />
                </span>
              </Link>
            )}
          </aside>
        </div>
      </Container>
    </>
  );
}
