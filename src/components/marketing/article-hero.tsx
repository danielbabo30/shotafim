import Link from "next/link";
import { ArrowIcon } from "@/components/marketing/icons";
import { ShareButtons } from "@/components/marketing/share-buttons";
import type { ArticleDetail } from "@/lib/posts";

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** ראש עמוד המאמר — פירורי לחם, קטגוריה, H1, שורת מטא של הכותב וכפתורי שיתוף. */
export function ArticleHero({ post }: { post: ArticleDetail }) {
  const meta = [
    post.author.role,
    dateFmt.format(new Date(post.publishedAt)),
    `${post.readingMinutes} דקות קריאה`,
  ].filter(Boolean);

  return (
    <header className="mx-auto max-w-3xl">
      <nav
        aria-label="פירורי לחם"
        className="text-on-surface-variant flex flex-wrap items-center gap-2 text-sm"
      >
        <Link href="/" className="hover:text-primary transition-colors">
          דף הבית
        </Link>
        <ArrowIcon className="size-4 rotate-180" />
        <Link href="/resources/blog" className="hover:text-primary transition-colors">
          משאבים ובלוג
        </Link>
        <ArrowIcon className="size-4 rotate-180" />
        <span className="text-primary font-medium">{post.categoryLabel}</span>
      </nav>

      <span className="bg-surface-highest text-primary mt-6 inline-block rounded-full px-3 py-1 text-xs font-semibold">
        {post.categoryLabel}
      </span>

      <h1 className="mt-4 text-3xl leading-tight font-bold text-balance sm:text-4xl md:text-5xl">
        {post.title}
      </h1>

      <div className="border-outline-variant/60 mt-6 flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-3">
          {post.author.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.author.avatar.url}
              alt={post.author.avatar.alt}
              className="size-12 rounded-full object-cover"
            />
          ) : (
            <span className="bg-primary-fixed text-on-primary-fixed flex size-12 items-center justify-center rounded-full font-bold">
              {post.author.name.charAt(0)}
            </span>
          )}
          <div className="text-sm">
            <p className="text-on-surface font-bold">{post.author.name}</p>
            <p className="text-on-surface-variant text-xs">{meta.join(" · ")}</p>
          </div>
        </div>

        <ShareButtons title={post.title} />
      </div>
    </header>
  );
}
