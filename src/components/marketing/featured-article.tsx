import Link from "next/link";
import { ClockIcon, GridIcon } from "@/components/marketing/icons";
import type { ArticleListItem } from "@/lib/posts";

/** כרטיס "מאמר מרכזי" בראש עמוד המשאבים. הכותרת תמיד H2 (מתחת ל-H1 של העמוד). */
export function FeaturedArticle({ post }: { post: ArticleListItem }) {
  return (
    <article className="group border-outline-variant/60 bg-surface-lowest shadow-ambient-sm hover:shadow-ambient overflow-hidden rounded-xl border transition-shadow duration-300">
      <Link href={`/resources/blog/${post.slug}`} className="flex flex-col md:flex-row">
        <div className="bg-surface-container relative aspect-[16/9] overflow-hidden md:aspect-auto md:w-3/5">
          {post.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.cover.url}
              alt={post.cover.alt}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="from-surface-high via-surface-container to-primary-fixed/40 flex size-full min-h-56 items-center justify-center bg-gradient-to-br">
              <GridIcon className="text-primary/25 size-20" />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center gap-4 p-6 md:w-2/5 md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-surface-highest text-primary rounded-full px-3 py-1 text-xs font-semibold">
              מאמר מרכזי
            </span>
            <span className="text-on-surface-variant flex items-center gap-1.5 text-xs">
              <ClockIcon className="size-4" />
              {post.readingMinutes} דקות קריאה
            </span>
          </div>

          <h2 className="group-hover:text-primary text-2xl leading-tight font-bold transition-colors sm:text-3xl">
            {post.title}
          </h2>
          <p className="text-on-surface-variant leading-relaxed">{post.excerpt}</p>

          <div className="mt-2 flex items-center gap-3">
            <span className="bg-primary-fixed text-on-primary-fixed flex size-10 items-center justify-center rounded-full text-sm font-bold">
              {post.author.name.charAt(0)}
            </span>
            <div className="text-sm">
              <p className="font-semibold">{post.author.name}</p>
              {post.author.role && (
                <p className="text-on-surface-variant text-xs">{post.author.role}</p>
              )}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
