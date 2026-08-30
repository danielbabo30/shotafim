import { ArticleCard } from "@/components/marketing/article-card";
import type { ArticleListItem } from "@/lib/posts";

/** מקטע "מאמרים נוספים" בתחתית עמוד המאמר. H2 + כרטיסים עם כותרת H3. */
export function RelatedArticles({ posts }: { posts: ArticleListItem[] }) {
  if (!posts.length) return null;

  return (
    <section>
      <h2 className="mb-6 text-2xl font-bold">מאמרים נוספים שיעניינו אותך</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <ArticleCard key={post.slug} post={post} titleAs="h3" />
        ))}
      </div>
    </section>
  );
}
