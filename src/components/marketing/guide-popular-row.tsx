import Link from "next/link";
import { BoltIcon } from "@/components/marketing/icons";
import type { GuideListItem } from "@/lib/guides";

/** שורת "מדריכים נפוצים ביותר" — כרטיסים מקושרים עם תווית סוג. */
export function GuidePopularRow({ guides }: { guides: GuideListItem[] }) {
  if (!guides.length) return null;

  return (
    <section>
      <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold">
        <BoltIcon className="text-primary size-6" />
        מדריכים נפוצים ביותר
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {guides.map((g) => (
          <Link
            key={g.slug}
            href={`/guides/${g.slug}`}
            className="group border-outline-variant/60 bg-surface-lowest hover:border-primary/50 hover:shadow-ambient flex flex-col rounded-xl border p-5 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="group-hover:text-primary text-base leading-snug font-bold transition-colors">
                {g.title}
              </h3>
              {g.stepsBadge && (
                <span className="bg-surface-container text-primary shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold whitespace-nowrap">
                  {g.stepsBadge}
                </span>
              )}
            </div>
            <p className="text-on-surface-variant mt-2 line-clamp-2 text-sm leading-relaxed">
              {g.excerpt}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
