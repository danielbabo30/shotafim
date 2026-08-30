import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { FeaturedArticle } from "@/components/marketing/featured-article";
import { ArticleCard } from "@/components/marketing/article-card";
import { getAllArticles, getFeaturedArticle } from "@/lib/posts";

export const metadata: Metadata = {
  title: "משאבים ובלוג",
  description:
    "תובנות, מדריכים וחדשות על שיווק משפיענים מבוסס תוצאות, ארנקי נאמנות וניהול קמפיינים שקוף — מהצוות של שותפים.",
};

export default async function BlogIndexPage() {
  const [articles, featured] = await Promise.all([getAllArticles(), getFeaturedArticle()]);
  const rest = articles.filter((a) => a.slug !== featured?.slug);

  return (
    <Container className="py-16">
      <header className="mb-12 max-w-2xl">
        <h1 className="text-4xl font-bold sm:text-5xl">משאבים ובלוג</h1>
        <p className="text-on-surface-variant mt-3 text-lg leading-relaxed">
          תובנות, מדריכים וחדשות מהעולם של שיווק משפיענים מבוסס תוצאות וניהול קמפיינים שקוף.
        </p>
      </header>

      {featured && (
        <div className="mb-16">
          <FeaturedArticle post={featured} />
        </div>
      )}

      <h2 className="sr-only">כל המאמרים</h2>
      {rest.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <ArticleCard key={post.slug} post={post} titleAs="h3" />
          ))}
        </div>
      ) : (
        <p className="text-on-surface-variant">בקרוב יתפרסמו כאן מאמרים נוספים.</p>
      )}
    </Container>
  );
}
