import Link from "next/link";
import { cn } from "@/lib/cn";
import { ClockIcon, GridIcon } from "@/components/marketing/icons";
import type { ArticleListItem } from "@/lib/posts";

/**
 * כרטיס מאמר לרשת — עמוד המשאבים ומקטע "מאמרים נוספים".
 * `titleAs` שולט ברמת הכותרת לשמירה על היררכיית SEO תקינה בהקשר של העמוד.
 */
export function ArticleCard({
  post,
  titleAs: Title = "h3",
  className,
}: {
  post: ArticleListItem;
  titleAs?: "h2" | "h3" | "h4";
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group border-outline-variant/60 bg-surface-lowest shadow-ambient-sm hover:shadow-ambient flex flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1",
        className,
      )}
    >
      <Link href={`/resources/blog/${post.slug}`} className="flex h-full flex-col">
        <div className="bg-surface-container relative aspect-[16/9] overflow-hidden">
          {post.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.cover.url}
              alt={post.cover.alt}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="from-surface-high to-surface-container flex size-full items-center justify-center bg-gradient-to-br">
              <GridIcon className="text-primary/25 size-12" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <span className="text-primary text-xs font-semibold">{post.categoryLabel}</span>
          <Title className="group-hover:text-primary mt-2 text-lg leading-snug font-bold transition-colors">
            {post.title}
          </Title>
          <p className="text-on-surface-variant mt-2 line-clamp-2 text-sm leading-relaxed">
            {post.excerpt}
          </p>

          <div className="border-outline-variant/60 text-on-surface-variant mt-auto flex items-center justify-between border-t pt-4 text-xs">
            <span className="flex items-center gap-1.5">
              <ClockIcon className="size-4" />
              {post.readingMinutes} דקות קריאה
            </span>
            <span className="text-on-surface font-semibold">{post.author.name}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
