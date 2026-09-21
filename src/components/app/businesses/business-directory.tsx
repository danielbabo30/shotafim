import Link from "next/link";
import { cn } from "@/lib/cn";
import { BuildingIcon, SearchIcon, LocationIcon } from "@/components/marketing/icons";
import type { BusinessDirectoryItem } from "@/lib/business-directory";
import type { CityOption } from "@/lib/cities";

/** טופס חיפוש/סינון עסקים באזור האישי — GET פשוט, ללא JS צד-לקוח. */
export function BusinessDirectorySearchForm({
  query,
  categoryOptions,
  cityOptions,
  selectedCategory,
  selectedCity,
}: {
  query: string;
  categoryOptions: { slug: string; name: string }[];
  cityOptions: CityOption[];
  selectedCategory: string;
  selectedCity: string;
}) {
  return (
    <form
      method="get"
      className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
    >
      <label className="relative flex-1">
        <span className="sr-only">חיפוש עסק לפי שם</span>
        <SearchIcon className="text-on-surface-variant pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2" />
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="חיפוש לפי שם עסק..."
          className="border-outline-variant bg-surface-lowest text-on-surface placeholder:text-on-surface-variant focus-visible:outline-primary h-11 w-full rounded-lg border ps-10 pe-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
        />
      </label>

      <select
        name="category"
        defaultValue={selectedCategory}
        aria-label="סינון לפי קטגוריה"
        className="border-outline-variant bg-surface-lowest text-on-surface focus-visible:outline-primary h-11 rounded-lg border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-52"
      >
        <option value="">כל הקטגוריות</option>
        {categoryOptions.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        name="city"
        defaultValue={selectedCity}
        aria-label="סינון לפי עיר"
        className="border-outline-variant bg-surface-lowest text-on-surface focus-visible:outline-primary h-11 rounded-lg border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-52"
      >
        <option value="">כל הערים</option>
        {cityOptions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nameHe}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm h-11 shrink-0 rounded-lg px-6 text-sm font-semibold transition-colors"
      >
        חיפוש
      </button>
    </form>
  );
}

/** כרטיס עסק ברשימת החיפוש באזור האישי. */
export function BusinessDirectoryCard({
  business,
  categoryLabels,
  cityLabel,
}: {
  business: BusinessDirectoryItem;
  categoryLabels: Record<string, string>;
  cityLabel: string | null;
}) {
  return (
    <Link
      href={`/dashboard/businesses/${business.id}`}
      className="border-outline-variant bg-surface-lowest shadow-ambient-sm hover:shadow-ambient focus-visible:outline-primary flex flex-col gap-4 rounded-xl border p-6 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <div className="flex items-start gap-4">
        <div className="bg-surface-container shrink-0 overflow-hidden rounded-lg">
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logoUrl}
              alt={business.name}
              loading="lazy"
              className="size-16 object-cover"
            />
          ) : (
            <div className="from-surface-high to-surface-container flex size-16 items-center justify-center bg-gradient-to-br">
              <BuildingIcon className="text-primary/30 size-8" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-on-surface truncate text-lg font-bold">{business.name}</h3>
          {cityLabel && (
            <p className="text-on-surface-variant mt-0.5 flex items-center gap-1 text-sm">
              <LocationIcon className="size-4 shrink-0" />
              {cityLabel}
            </p>
          )}
        </div>
      </div>

      {business.categorySlugs.some((s) => categoryLabels[s]) && (
        <div className="flex flex-wrap gap-2">
          {business.categorySlugs.map((slug) =>
            categoryLabels[slug] ? (
              <span
                key={slug}
                className="bg-surface-low text-on-surface-variant rounded-md px-2 py-1 text-xs font-medium"
              >
                {categoryLabels[slug]}
              </span>
            ) : null,
          )}
        </div>
      )}

      <p className="text-on-surface-variant line-clamp-2 text-sm leading-relaxed">
        {business.description}
      </p>
    </Link>
  );
}

/** מצב ריק אמיתי — אין עסקים תואמים לסינון הנוכחי. */
export function BusinessDirectoryEmptyState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border-outline-variant bg-surface-lowest flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center",
        className,
      )}
    >
      <div className="bg-surface-container flex size-14 items-center justify-center rounded-full">
        <SearchIcon className="text-on-surface-variant size-6" />
      </div>
      <h3 className="text-on-surface text-lg font-bold">לא נמצאו עסקים</h3>
      <p className="text-on-surface-variant max-w-sm text-sm leading-relaxed">
        נסו לשנות את מילות החיפוש, לבחור קטגוריה אחרת או להסיר את סינון העיר.
      </p>
    </div>
  );
}
