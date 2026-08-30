import Link from "next/link";
import { ArrowIcon, ClockIcon, VerifiedIcon } from "@/components/marketing/icons";
import type { GuideDetail } from "@/lib/guides";

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** ראש עמוד המדריך — פירורי לחם, תג רשמי, מטא, H1 ופסקת פתיחה. */
export function GuideArticleHeader({ guide }: { guide: GuideDetail }) {
  return (
    <header className="flex flex-col gap-4">
      <nav
        aria-label="פירורי לחם"
        className="text-on-surface-variant flex flex-wrap items-center gap-2 text-sm"
      >
        <Link href="/guides" className="hover:text-primary transition-colors">
          מרכז העזרה
        </Link>
        <ArrowIcon className="size-4 rotate-180" />
        <span className="text-primary font-medium">{guide.categoryLabel}</span>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        {guide.official && (
          <span className="bg-primary-fixed text-on-primary-fixed inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
            <VerifiedIcon className="size-4" />
            מדריך רשמי
          </span>
        )}
        <span className="text-on-surface-variant flex items-center gap-1.5 text-sm">
          <ClockIcon className="size-4" />
          {guide.readingMinutes} דקות קריאה
        </span>
        <span className="text-on-surface-variant text-sm">
          עודכן לאחרונה: {dateFmt.format(new Date(guide.updatedAt))}
        </span>
      </div>

      <h1 className="text-3xl leading-tight font-bold text-balance sm:text-4xl md:text-5xl">
        {guide.title}
      </h1>
      <p className="text-on-surface-variant max-w-3xl text-lg leading-relaxed">{guide.intro}</p>
    </header>
  );
}
