import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActiveUser } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";
import { getCampaignDetail } from "@/lib/applications";
import { formatShekels } from "@/lib/dashboard-brand";
import { APPLICATION_STATUS_META } from "@/lib/pitch";
import { CampaignBriefView } from "@/components/app/pitch/campaign-brief-view";
import { ApplicationReviewItem } from "@/components/app/pitch/application-review-item";
import { ApplyForm, type OfferOption } from "@/components/app/pitch/apply-form";
import { StatusChip } from "@/components/app/status-chip";
import { ChevronLeftIcon } from "@/components/marketing/icons";

export const metadata: Metadata = { title: "בריף קמפיין" };

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireActiveUser();
  const detail = await getCampaignDetail(id);
  if (!detail) notFound();

  const { brief } = detail;

  let packages: OfferOption[] = [];
  let assets: OfferOption[] = [];
  if (detail.canApply) {
    if (
      user.roleKeys.includes("creator") &&
      (brief.targetType === "CREATOR" || brief.targetType === "BOTH")
    ) {
      const rows = await prisma.creatorPricingPackage.findMany({
        where: { creator: { userId: user.id }, isActive: true },
        select: { id: true, title: true, priceILS: true, turnaroundDays: true },
      });
      packages = rows.map((r) => ({
        id: r.id,
        label: `${r.title} — ${formatShekels(Number(r.priceILS))}`,
        price: Number(r.priceILS),
        days: r.turnaroundDays,
      }));
    }
    if (
      user.roleKeys.includes("space") &&
      (brief.targetType === "AD_SPACE" || brief.targetType === "BOTH")
    ) {
      const rows = await prisma.adSpaceAsset.findMany({
        where: { owner: { userId: user.id }, isActive: true },
        select: { id: true, title: true, basePriceILS: true },
      });
      assets = rows.map((r) => ({
        id: r.id,
        label: `${r.title} — ${formatShekels(Number(r.basePriceILS))}`,
        price: Number(r.basePriceILS),
      }));
    }
  }

  const isOwner = detail.viewer === "owner";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={isOwner ? "/dashboard/campaigns" : "/dashboard/discover"}
        className="text-on-surface-variant hover:text-on-surface inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeftIcon className="size-4 rotate-180" />
        {isOwner ? "כל הקמפיינים" : "גילוי בריפים"}
      </Link>

      <CampaignBriefView brief={brief} />

      {isOwner && (
        <section className="flex flex-col gap-3">
          <h2 className="text-on-surface text-lg font-bold">
            הצעות שהתקבלו ({detail.applications.length})
          </h2>
          {detail.applications.length === 0 ? (
            <p className="text-on-surface-variant border-outline-variant rounded-xl border border-dashed p-6 text-sm">
              עדיין לא התקבלו הצעות לבריף הזה.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {detail.applications.map((a) => (
                <ApplicationReviewItem key={a.id} application={a} />
              ))}
            </ul>
          )}
        </section>
      )}

      {detail.viewer === "provider" &&
        detail.myApplication &&
        detail.myApplication.status !== "INVITED" && (
          <div className="border-outline-variant bg-surface-lowest flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5">
            <div>
              <p className="text-on-surface font-semibold">כבר הגשת הצעה לבריף הזה</p>
              <p className="text-on-surface-variant text-sm">
                {formatShekels(detail.myApplication.proposedPriceILS)} · אספקה תוך{" "}
                {detail.myApplication.estimatedDeliveryDays} ימים
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusChip tone={APPLICATION_STATUS_META[detail.myApplication.status].tone}>
                {APPLICATION_STATUS_META[detail.myApplication.status].label}
              </StatusChip>
              {detail.myApplication.contractId && (
                <Link
                  href={`/dashboard/contracts/${detail.myApplication.contractId}`}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  לחדר העבודה
                </Link>
              )}
            </div>
          </div>
        )}

      {detail.canApply && (
        <ApplyForm
          campaignId={brief.id}
          packages={packages}
          assets={assets}
          prefill={
            detail.invitationPrefill
              ? {
                  price: detail.invitationPrefill.proposedPriceILS,
                  days: detail.invitationPrefill.estimatedDeliveryDays,
                }
              : null
          }
        />
      )}

      {detail.viewer === "other" && (
        <p className="text-on-surface-variant border-outline-variant rounded-xl border border-dashed p-6 text-sm">
          הבריף הזה אינו מתאים לסוג החשבון שלך.
        </p>
      )}
    </div>
  );
}
