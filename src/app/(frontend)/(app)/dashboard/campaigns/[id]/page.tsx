import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActiveUser } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";
import { getCampaignDetail } from "@/lib/applications";
import { formatShekels } from "@/lib/dashboard-brand";
import { APPLICATION_STATUS_META } from "@/lib/pitch";
import { CampaignBriefView } from "@/components/app/pitch/campaign-brief-view";
import { arePaymentsEnabled } from "@/lib/payments-gate";
import { ApplicationReviewItem } from "@/components/app/pitch/application-review-item";
import { ApplyForm, type OfferOption } from "@/components/app/pitch/apply-form";
import { StatusChip } from "@/components/app/status-chip";
import { ActionErrorBanner } from "@/components/app/action-error-banner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/app/confirm-button";
import { cancelCampaign, publishCampaign } from "@/lib/actions/campaign-actions";
import { withdrawApplication } from "@/lib/actions/application-actions";
import { ChevronLeftIcon } from "@/components/marketing/icons";

export const metadata: Metadata = { title: "בריף קמפיין" };

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string }>;
}) {
  const [{ id }, { err }] = await Promise.all([params, searchParams]);
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

      <ActionErrorBanner code={err} />

      <CampaignBriefView brief={brief} paymentsEnabled={arePaymentsEnabled()} />

      {isOwner && (brief.status === "DRAFT" || brief.status === "OPEN_FOR_PITCHES") && (
        <div className="border-outline-variant bg-surface-lowest flex flex-wrap items-center gap-2 rounded-xl border p-4">
          {brief.status === "DRAFT" && (
            <form action={publishCampaign}>
              <input type="hidden" name="campaignId" value={brief.id} />
              <Button type="submit" size="md">
                פרסם להצעות
              </Button>
            </form>
          )}
          <form action={cancelCampaign}>
            <input type="hidden" name="campaignId" value={brief.id} />
            <ConfirmButton
              variant="ghost"
              size="md"
              confirmMessage="לבטל את הקמפיין? הצעות והזמנות פתוחות ייסגרו ולא ניתן יהיה לשחזר."
            >
              בטל קמפיין
            </ConfirmButton>
          </form>
          <p className="text-on-surface-variant text-xs">
            ביטול סוגר הצעות והזמנות פתוחות. לא ניתן לבטל קמפיין שנפתחו בו חוזים.
          </p>
        </div>
      )}

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

      {detail.invitationPrefill && (
        <div className="border-primary/40 bg-primary-fixed/20 flex flex-col gap-2 rounded-xl border p-5 text-sm">
          <p className="text-on-surface font-semibold">
            {detail.invitationPrefill.adSpaceAssetTitle
              ? "בקשת שריון שהתקבלה"
              : "הוזמנת להגיש הצעה לבריף הזה"}
          </p>
          {detail.invitationPrefill.adSpaceAssetTitle && (
            <p className="text-on-surface-variant">
              שטח: {detail.invitationPrefill.adSpaceAssetTitle}
            </p>
          )}
          {detail.invitationPrefill.requestedStartDate &&
            detail.invitationPrefill.requestedEndDate && (
              <p className="text-on-surface-variant">
                חלון מבוקש: {dateFmt.format(detail.invitationPrefill.requestedStartDate)} –{" "}
                {dateFmt.format(detail.invitationPrefill.requestedEndDate)}
              </p>
            )}
          {detail.canDecline && (
            <form action={withdrawApplication} className="mt-1">
              <input type="hidden" name="applicationId" value={detail.myApplication?.id ?? ""} />
              <ConfirmButton variant="ghost" size="md" confirmMessage="לדחות את ההזמנה?">
                דחה הזמנה
              </ConfirmButton>
            </form>
          )}
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
                  assetId: detail.invitationPrefill.adSpaceAssetId,
                }
              : null
          }
        />
      )}
    </div>
  );
}
