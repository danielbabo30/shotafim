import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { getAdSpaceDetail } from "@/lib/ad-spaces";
import { getPartnerCategoryLabels } from "@/lib/partner-categories-query";
import { ReserveAdSpaceDialog } from "@/components/app/pitch/reserve-ad-space-dialog";
import { formatShekels } from "@/lib/dashboard-brand";
import {
  ChevronLeftIcon,
  LocationIcon,
  ShieldCheckIcon,
  VerifiedIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon,
} from "@/components/marketing/icons";

export const metadata: Metadata = { title: "פרטי שטח פרסום" };

const rangeFmt = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function AdSpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) redirect("/dashboard");

  const [space, categoryLabels] = await Promise.all([
    getAdSpaceDetail(id),
    getPartnerCategoryLabels(),
  ]);
  if (!space) notFound();

  const ctaLabel =
    space.mediaType === "podcast" || space.mediaType === "newsletter" ? "הצעת חסות" : "שריון ביומן";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/ad-spaces"
        className="text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4 rotate-180" />
        חזרה לשטחי פרסום
      </Link>

      <header className="border-outline-variant bg-surface-lowest shadow-ambient flex flex-col gap-4 rounded-xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-on-surface-variant text-xs">
              {space.mediaLabel} · {space.provider}
              {space.providerVerified && (
                <VerifiedIcon className="text-primary ms-1 inline size-3.5 align-text-bottom" />
              )}
            </p>
            <h1 className="text-on-surface mt-1 text-2xl font-bold">{space.title}</h1>
            {space.location && (
              <p className="text-on-surface-variant mt-1 flex items-center gap-1 text-sm">
                <LocationIcon className="size-4" />
                {space.location}
              </p>
            )}
          </div>
          <span
            className={
              space.availability === "booked"
                ? "bg-warning-container text-warning inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                : "bg-success-container text-success inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            }
          >
            {space.availability === "booked" ? (
              <>
                <ClockIcon className="size-3.5" />
                תפוס כרגע
              </>
            ) : (
              <>
                <CheckCircleIcon className="size-3.5" />
                פנוי לשריון
              </>
            )}
          </span>
        </div>

        <p className="text-on-surface-variant text-sm leading-relaxed whitespace-pre-line">
          {space.description}
        </p>

        {space.categorySlugs.some((s) => categoryLabels[s]) && (
          <div className="flex flex-wrap gap-2">
            {space.categorySlugs.map((slug) =>
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

        <dl className="border-outline-variant grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-on-surface-variant text-xs">מחיר בסיס</dt>
            <dd className="text-on-surface font-display mt-0.5 text-lg font-bold">
              {formatShekels(space.price)}{" "}
              <span className="text-on-surface-variant text-xs font-normal">{space.unitLabel}</span>
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant flex items-center gap-1 text-xs">
              <ShieldCheckIcon className="size-3.5" />
              הוכחת ביצוע
            </dt>
            <dd className="text-on-surface mt-0.5 font-semibold">{space.proofRequirementLabel}</dd>
          </div>
        </dl>

        {space.availability !== "booked" && (
          <ReserveAdSpaceDialog
            assetId={space.id}
            label={ctaLabel}
            className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm inline-block w-fit cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
          />
        )}
      </header>

      {space.specs.length > 0 && (
        <section className="border-outline-variant bg-surface-lowest rounded-xl border p-6">
          <h2 className="text-on-surface mb-3 text-lg font-bold">מפרט</h2>
          <ul className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {space.specs.map((s) => (
              <li key={s.kind} className="text-on-surface-variant">
                {s.value}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-on-surface text-lg font-bold">זמינות ושיבוצים</h2>
        {space.bookings.length === 0 ? (
          <p className="text-on-surface-variant border-outline-variant rounded-xl border border-dashed p-6 text-sm">
            אין שיבוצים קרובים — השטח פנוי לשריון.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {space.bookings.map((b, i) => (
              <li
                key={i}
                className="border-outline-variant bg-surface-lowest flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm"
              >
                <span className="text-on-surface-variant flex items-center gap-2">
                  <CalendarIcon className="size-4" />
                  {rangeFmt.format(b.startDate)} – {rangeFmt.format(b.endDate)}
                </span>
                <span
                  className={
                    b.status === "BROADCASTING"
                      ? "text-error font-semibold"
                      : "text-on-surface-variant"
                  }
                >
                  {b.statusLabel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
