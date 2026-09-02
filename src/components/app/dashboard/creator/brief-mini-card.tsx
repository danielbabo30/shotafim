import Link from "next/link";
import { ChevronLeftIcon } from "@/components/marketing/icons";
import type { CreatorBriefVM } from "@/lib/dashboard-creator";

/** כרטיס בריף פתוח בטור הצדדי של לוח-הבקרה של היוצר — הכרטיס כולו מקשר לבריף */
export function BriefMiniCard({ item }: { item: CreatorBriefVM }) {
  return (
    <Link
      href={item.href}
      className="border-outline-variant bg-surface-lowest shadow-ambient-sm hover:border-primary/40 hover:shadow-ambient focus-visible:ring-primary group flex flex-col gap-3 rounded-xl border p-5 outline-none transition-all hover:-translate-y-0.5 focus-visible:ring-2"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-on-surface text-sm font-bold">{item.brandName}</span>
        {item.categoryLabel && (
          <span className="bg-surface-container text-on-surface-variant shrink-0 rounded px-2 py-0.5 text-[11px] font-medium">
            {item.categoryLabel}
          </span>
        )}
      </div>

      <p className="text-on-surface-variant line-clamp-2 text-sm">{item.description}</p>

      <div className="mt-1 flex items-center justify-between">
        <span className="text-primary text-sm font-bold">{item.budgetLabel}</span>
        <span className="text-primary group-hover:text-primary-hover flex items-center gap-0.5 text-xs font-semibold transition-colors">
          הגש הצעה מהירה
          <ChevronLeftIcon className="size-4" />
        </span>
      </div>
    </Link>
  );
}
