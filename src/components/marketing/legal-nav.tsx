import Link from "next/link";
import { cn } from "@/lib/cn";
import { LEGAL_PAGES, type LegalPageSlug } from "@/lib/legal-pages";

/**
 * ניווט בין המסמכים המשפטיים — נראה כטאבים, אך כל טאב הוא קישור ל-URL נפרד
 * (/legal/<slug>). Server Component; ה-slug הפעיל מגיע כ-prop מהעמוד.
 */
export function LegalNav({ active }: { active: LegalPageSlug }) {
  return (
    <nav
      aria-label="מסמכים משפטיים"
      className="border-outline-variant -mb-px flex gap-x-1 overflow-x-auto border-b"
    >
      {LEGAL_PAGES.map((page) => {
        const isActive = page.slug === active;
        return (
          <Link
            key={page.slug}
            href={`/legal/${page.slug}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-t-lg border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors",
              isActive
                ? "border-primary text-primary"
                : "text-on-surface-variant hover:text-primary hover:border-outline-variant border-transparent",
            )}
          >
            {page.label}
          </Link>
        );
      })}
    </nav>
  );
}
