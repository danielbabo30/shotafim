import type { ArticleDetail } from "@/lib/posts";

/** כרטיס "על הכותב" בתחתית המאמר. כותרת H2 מוסתרת ויזואלית לשמירת היררכיה. */
export function AuthorBio({ author }: { author: ArticleDetail["author"] }) {
  return (
    <section className="border-outline-variant/60 bg-surface-lowest shadow-ambient-sm flex flex-col items-center gap-5 rounded-xl border p-6 text-center sm:flex-row sm:items-start sm:text-start">
      <h2 className="sr-only">על הכותב</h2>
      {author.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={author.avatar.url}
          alt={author.avatar.alt}
          className="size-20 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="bg-primary-fixed text-on-primary-fixed flex size-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold">
          {author.name.charAt(0)}
        </span>
      )}
      <div>
        <p className="text-xl font-bold">{author.name}</p>
        {author.role && <p className="text-primary mt-0.5 text-sm font-semibold">{author.role}</p>}
        {author.bio && (
          <p className="text-on-surface-variant mt-3 text-sm leading-relaxed">{author.bio}</p>
        )}
      </div>
    </section>
  );
}
