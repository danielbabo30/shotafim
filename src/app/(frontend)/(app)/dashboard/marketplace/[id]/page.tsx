import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { getCreatorProfile } from "@/lib/creator-profile";
import { listBrandOpenCampaigns } from "@/lib/campaigns";
import { getPartnerCategoryLabels } from "@/lib/partner-categories-query";
import { InviteToCampaignDialog } from "@/components/app/pitch/invite-to-campaign-dialog";
import { formatFollowersShort, MARKETPLACE_PLATFORMS } from "@/lib/marketplace";
import { deliverableLabel } from "@/lib/campaign-brief";
import { formatShekels } from "@/lib/dashboard-brand";
import {
  ChevronLeftIcon,
  StarIcon,
  VerifiedIcon,
  LocationIcon,
  ShieldCheckIcon,
  LinkIcon,
} from "@/components/marketing/icons";
import type { SocialPlatform } from "@prisma/client";

export const metadata: Metadata = { title: "פרופיל יוצר" };

const platformLabel = (p: SocialPlatform) =>
  MARKETPLACE_PLATFORMS.find((x) => x.value === p)?.label ?? p;

const dateFmt = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" });

export default async function CreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) redirect("/dashboard");

  const [creator, categoryLabels, openCampaigns] = await Promise.all([
    getCreatorProfile(id),
    getPartnerCategoryLabels(),
    listBrandOpenCampaigns("CREATOR"),
  ]);
  if (!creator) notFound();

  const initial = creator.displayName.trim().charAt(0) || "?";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/marketplace"
        className="text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4 rotate-180" />
        חזרה למרקטפלייס
      </Link>

      {/* כותרת */}
      <header className="border-outline-variant bg-surface-lowest shadow-ambient flex flex-wrap items-start gap-5 rounded-xl border p-6">
        <span className="bg-primary-fixed text-on-primary-fixed font-display grid size-20 shrink-0 place-items-center rounded-full text-2xl font-bold">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-on-surface flex items-center gap-2 text-2xl font-bold">
            {creator.displayName}
            {creator.verified && <VerifiedIcon className="text-primary size-5" />}
          </h1>
          <div className="text-on-surface-variant mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {creator.cityLabel && (
              <span className="flex items-center gap-1">
                <LocationIcon className="size-4" />
                {creator.cityLabel}
              </span>
            )}
            <span className="flex items-center gap-1">
              <ShieldCheckIcon className="size-4" />
              ציון אמינות {creator.reliabilityScore}/100
            </span>
            {creator.reviewCount > 0 && (
              <span className="text-on-surface flex items-center gap-1 font-medium">
                <StarIcon className="size-4 text-amber-400" />
                {creator.ratingAvg.toFixed(1)}
                <span className="text-on-surface-variant">({creator.reviewCount} ביקורות)</span>
              </span>
            )}
          </div>
          {creator.categorySlugs.some((s) => categoryLabels[s]) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {creator.categorySlugs.map((slug) =>
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
        </div>
      </header>

      <InviteToCampaignDialog
        creatorUserId={creator.userId}
        openCampaigns={openCampaigns.map((c) => ({ id: c.id, title: c.title }))}
        label="הזמנת היוצר לבריף"
        className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm inline-block w-fit cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
      />

      {creator.bio && (
        <section className="border-outline-variant bg-surface-lowest rounded-xl border p-6">
          <h2 className="text-on-surface mb-2 text-lg font-bold">על היוצר</h2>
          <p className="text-on-surface-variant text-sm leading-relaxed whitespace-pre-line">
            {creator.bio}
          </p>
        </section>
      )}

      {/* ערוצים */}
      <section className="flex flex-col gap-3">
        <h2 className="text-on-surface text-lg font-bold">ערוצי סושיאל</h2>
        {creator.channels.length === 0 ? (
          <p className="border-outline-variant bg-surface-lowest text-on-surface-variant rounded-xl border p-4 text-sm leading-relaxed">
            היוצר טרם חיבר ערוצי סושיאל. נתוני עוקבים ומעורבות יופיעו כאן לאחר שיחבר את
            הפלטפורמות שלו.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {creator.channels.map((ch) => (
              <div
                key={ch.platform}
                className="border-outline-variant bg-surface-lowest flex flex-col gap-3 rounded-xl border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-on-surface flex items-center gap-1.5 font-semibold">
                      {platformLabel(ch.platform)}
                      {ch.verified && <VerifiedIcon className="text-primary size-3.5" />}
                    </p>
                    <a
                      href={ch.channelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                    >
                      <LinkIcon className="size-3" />@{ch.handle}
                    </a>
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <dt className="text-on-surface-variant text-xs">עוקבים</dt>
                    <dd className="text-on-surface font-bold">
                      {formatFollowersShort(ch.followers)}
                    </dd>
                  </div>
                  <div className="border-outline-variant border-x">
                    <dt className="text-on-surface-variant text-xs">מעורבות</dt>
                    <dd className="text-on-surface font-bold">
                      {ch.engagementRate != null ? `${ch.engagementRate.toFixed(1)}%` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-on-surface-variant text-xs">צפיות ממוצע</dt>
                    <dd className="text-on-surface font-bold">
                      {ch.avgViews != null ? formatFollowersShort(ch.avgViews) : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* מחירון */}
      {creator.packages.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-on-surface text-lg font-bold">מחירון ושירותים</h2>
          <ul className="flex flex-col gap-2">
            {creator.packages.map((p) => (
              <li
                key={p.id}
                className="border-outline-variant bg-surface-lowest flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div>
                  <p className="text-on-surface font-semibold">{p.title}</p>
                  <p className="text-on-surface-variant text-xs">
                    {deliverableLabel(p.deliverableType)} · אספקה תוך {p.turnaroundDays} ימים ·{" "}
                    {p.revisionsIncluded} סבבי תיקונים
                  </p>
                </div>
                <span className="text-on-surface font-display text-lg font-bold">
                  {formatShekels(p.priceILS)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ביקורות */}
      {creator.reviews.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-on-surface text-lg font-bold">ביקורות ממפרסמים</h2>
          <ul className="flex flex-col gap-3">
            {creator.reviews.map((r) => (
              <li
                key={r.id}
                className="border-outline-variant bg-surface-lowest rounded-xl border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-on-surface text-sm font-semibold">{r.authorName}</p>
                  <span className="text-on-surface flex items-center gap-1 text-sm font-medium">
                    <StarIcon className="size-4 text-amber-400" />
                    {r.rating.toFixed(1)}
                  </span>
                </div>
                <p className="text-on-surface-variant mt-2 text-sm leading-relaxed">
                  {r.feedbackText}
                </p>
                <p className="text-on-surface-variant mt-2 text-xs">
                  {dateFmt.format(r.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
