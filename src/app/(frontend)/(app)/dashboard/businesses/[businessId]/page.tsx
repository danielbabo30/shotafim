import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { getBusinessDetail } from "@/lib/business-directory";
import { getPartnerCategoryLabels } from "@/lib/partner-categories-query";
import { getCities } from "@/lib/cities";
import { startBusinessConversation } from "@/lib/actions/message-actions";
import {
  BuildingIcon,
  ChatIcon,
  GlobeIcon,
  LocationIcon,
  StarIcon,
} from "@/components/marketing/icons";

const dateFmt = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium" });

const sentimentLabel: Record<string, string> = {
  POSITIVE: "חוויה חיובית",
  NEUTRAL: "חוויה ניטרלית",
  NEGATIVE: "חוויה שלילית",
};

const socialLabels: { key: "instagram" | "tiktok" | "facebook"; label: string }[] = [
  { key: "instagram", label: "אינסטגרם" },
  { key: "tiktok", label: "טיקטוק" },
  { key: "facebook", label: "פייסבוק" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessId: string }>;
}): Promise<Metadata> {
  const { businessId } = await params;
  const detail = await getBusinessDetail(businessId);
  if (!detail) return { title: "עסק לא נמצא" };
  return { title: detail.business.name };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="text-warning flex items-center gap-0.5" aria-label={`דירוג ${rating} מתוך 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} className={i < rating ? "size-4" : "text-outline-variant size-4"} />
      ))}
    </div>
  );
}

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;

  const user = await requireActiveUser();
  if (!user.roleKeys.includes("creator") && !user.roleKeys.includes("space")) {
    redirect("/dashboard");
  }

  const [detail, categoryLabels, cities] = await Promise.all([
    getBusinessDetail(businessId),
    getPartnerCategoryLabels(),
    getCities(),
  ]);

  if (!detail) notFound();

  const { business, reviews } = detail;
  const cityLabelById = new Map(cities.map((c) => [c.id, c.nameHe]));
  const canChat = user.id !== business.userId;

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/dashboard/businesses"
        className="text-primary w-fit text-sm font-semibold hover:underline"
      >
        ← חזרה לחיפוש עסקים
      </Link>

      <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col gap-6 rounded-xl border p-6 sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row">
          <div className="bg-surface-container shrink-0 overflow-hidden rounded-lg">
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt={business.name} className="size-20 object-cover" />
            ) : (
              <div className="from-surface-high to-surface-container flex size-20 items-center justify-center bg-gradient-to-br">
                <BuildingIcon className="text-primary/30 size-10" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <h1 className="text-on-surface text-2xl font-bold sm:text-3xl">{business.name}</h1>

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

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {business.websiteUrl && (
                <a
                  href={business.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-on-surface-variant hover:text-primary flex items-center gap-1.5"
                >
                  <GlobeIcon className="size-4 shrink-0" />
                  אתר האינטרנט
                </a>
              )}
              {socialLabels.map(({ key, label }) =>
                business.socialLinks[key] ? (
                  <a
                    key={key}
                    href={business.socialLinks[key]}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-on-surface-variant hover:text-primary flex items-center gap-1.5"
                  >
                    {label}
                  </a>
                ) : null,
              )}
            </div>
          </div>

          {canChat && (
            <div className="w-full shrink-0 sm:w-auto">
              <form action={startBusinessConversation.bind(null, business.userId)}>
                <button
                  type="submit"
                  className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold transition-colors sm:w-auto"
                >
                  <ChatIcon className="size-4" />
                  פתח צ&apos;אט עם העסק
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="text-on-surface-variant border-outline-variant border-t pt-6 text-sm leading-relaxed whitespace-pre-line">
          {business.description}
        </p>
      </div>

      {business.locations.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-on-surface text-xl font-bold">סניפים</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {business.locations.map((loc) => (
              <div
                key={loc.id}
                className="border-outline-variant bg-surface-lowest flex flex-col gap-1 rounded-lg border p-4"
              >
                <p className="text-on-surface flex items-center gap-1.5 text-sm font-semibold">
                  <LocationIcon className="size-4 shrink-0" />
                  {loc.name ?? cityLabelById.get(loc.cityId) ?? "סניף"}
                  {loc.isPrimary && (
                    <span className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-xs font-medium">
                      ראשי
                    </span>
                  )}
                </p>
                <p className="text-on-surface-variant text-sm">
                  {cityLabelById.get(loc.cityId) ?? ""} · {loc.address}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-on-surface text-xl font-bold">ביקורות אחרונות</h2>
        {reviews.length === 0 ? (
          <div className="border-outline-variant bg-surface-lowest rounded-xl border border-dashed p-8 text-center">
            <p className="text-on-surface-variant text-sm">עדיין אין ביקורות פומביות.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border-outline-variant bg-surface-lowest flex flex-col gap-2 rounded-lg border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} />
                    <span className="text-on-surface-variant text-xs">
                      {sentimentLabel[review.sentiment] ?? review.sentiment}
                    </span>
                  </div>
                  <span className="text-on-surface-variant text-xs">
                    {review.authorDisplayName} · {dateFmt.format(review.createdAt)}
                  </span>
                </div>
                <p className="text-on-surface text-sm leading-relaxed">{review.feedbackText}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
