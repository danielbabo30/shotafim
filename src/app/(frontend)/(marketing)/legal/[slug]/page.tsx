import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { LegalNav } from "@/components/marketing/legal-nav";
import { ProseBlock } from "@/components/marketing/prose-blocks";
import { LEGAL_PAGES } from "@/lib/legal-pages";
import { getLegalPage } from "@/lib/legal";

type Params = { params: Promise<{ slug: string }> };

// קבוצה סגורה — רק 4 ה-slugs מ-LEGAL_PAGES תקפים.
export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getLegalPage(slug);
  if (!doc) return {};

  const title = doc.seo.metaTitle ?? doc.title;
  const description = doc.seo.metaDescription ?? doc.intro;

  return {
    title,
    description,
    alternates: { canonical: `/legal/${doc.slug}` },
  };
}

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function LegalDocumentPage({ params }: Params) {
  const { slug } = await params;
  const doc = await getLegalPage(slug);
  if (!doc) notFound();

  return (
    <Container className="py-12 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <header>
          <p className="text-primary text-sm font-semibold">מסמכים משפטיים</p>
          <h1 className="mt-3 text-3xl leading-tight font-bold text-balance sm:text-4xl">
            {doc.title}
          </h1>
          {doc.updatedAt && (
            <p className="text-on-surface-variant mt-3 text-sm">
              עודכן לאחרונה: {dateFmt.format(new Date(doc.updatedAt))}
            </p>
          )}
        </header>

        <div className="mt-8">
          <LegalNav active={doc.slug} />
        </div>

        <article className="mt-10 max-w-none">
          {doc.intro && (
            <p className="text-on-surface-variant mb-8 text-lg leading-relaxed font-medium">
              {doc.intro}
            </p>
          )}
          {doc.body.map((block, i) => (
            <ProseBlock key={i} block={block} />
          ))}
        </article>
      </div>
    </Container>
  );
}
