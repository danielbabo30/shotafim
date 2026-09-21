import Link from "next/link";
import { MegaphoneIcon, ChevronLeftIcon, PlusIcon } from "@/components/marketing/icons";
import { StatusChip } from "@/components/app/status-chip";
import type { CampaignRow } from "@/lib/dashboard-brand";

/** רשימת הקמפיינים והבריפים הפעילים — הטור הרחב בלוח-הבקרה */
export function CampaignList({ campaigns }: { campaigns: CampaignRow[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-on-surface text-xl font-bold">קמפיינים ובריפים פעילים</h2>
        <Link
          href="/dashboard/campaigns/new"
          className="text-primary hover:text-primary-hover flex items-center gap-1 text-sm font-semibold transition-colors"
        >
          <PlusIcon className="size-4" />
          בריף חדש
        </Link>
      </div>

      <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm divide-outline-variant divide-y overflow-hidden rounded-xl border">
        {campaigns.length === 0 ? (
          <p className="text-on-surface-variant p-8 text-center text-sm">
            אין קמפיינים פעילים. פתחו בריף חדש כדי להתחיל.
          </p>
        ) : (
          campaigns.map((c) => (
            <Link
              key={c.id}
              href={c.href}
              className="hover:bg-surface-low group flex items-center gap-4 p-4 transition-colors"
            >
              <span className="border-outline-variant bg-surface-container text-on-surface-variant grid size-12 shrink-0 place-items-center rounded-lg border">
                <MegaphoneIcon className="size-5" />
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="text-on-surface group-hover:text-primary truncate text-sm font-semibold transition-colors">
                  {c.title}
                </h3>
                <p className="text-on-surface-variant mt-0.5 truncate text-sm">{c.meta}</p>
              </div>

              <StatusChip tone={c.status.tone} className="rounded-md">
                {c.status.label}
              </StatusChip>
              <ChevronLeftIcon className="text-on-surface-variant group-hover:text-primary size-5 shrink-0 transition-colors" />
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
