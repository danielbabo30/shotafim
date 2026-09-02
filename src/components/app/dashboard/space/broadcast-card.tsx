import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  LockIcon,
  UploadFileIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
} from "@/components/marketing/icons";
import { StatusChip } from "@/components/app/status-chip";
import { formatShekels, type BroadcastCardVM } from "@/lib/dashboard-space";

const STATE_CHIP: Record<
  BroadcastCardVM["state"],
  { label: string; tone: "primary" | "neutral" | "warning" | "success" } | null
> = {
  needs_proof: { label: "דרושה הוכחת שידור", tone: "warning" },
  in_review: { label: "הוכחה נשלחה — ממתין לאישור המפרסם", tone: "primary" },
  scheduled: { label: "משובץ לשידור", tone: "neutral" },
  released: null,
};

/** כרטיס שידור / קמפיין באוויר בלוח-הבקרה של בעל השטחים */
export function BroadcastCard({ item }: { item: BroadcastCardVM }) {
  const released = item.state === "released";
  const needsProof = item.state === "needs_proof";
  const contractHref = `/dashboard/contracts/${item.id}`;

  return (
    <article
      className={cn(
        "border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-xl border p-5",
        needsProof && "border-s-primary border-s-4",
        released && "opacity-80",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-on-surface text-base font-bold">{item.assetTitle}</h3>
            <span className="bg-surface-container text-on-surface-variant rounded-full px-2 py-0.5 text-xs font-medium">
              {item.assetTypeLabel}
            </span>
            {item.isLive && (
              <span className="text-success inline-flex items-center gap-1 text-xs font-semibold">
                <span className="bg-success size-1.5 animate-pulse rounded-full" aria-hidden />
                משדר עכשיו
              </span>
            )}
          </div>
          <p className="text-on-surface-variant mt-1 text-sm">
            מפרסם: <span className="text-on-surface font-medium">{item.advertiser}</span>
            {item.campaignTitle ? ` · קמפיין: ${item.campaignTitle}` : ""}
          </p>
        </div>

        {item.windowLabel && (
          <div className="text-end">
            <div className="text-on-surface-variant text-xs">חלון שידור</div>
            <div className="text-on-surface text-sm font-medium">{item.windowLabel}</div>
          </div>
        )}
      </div>

      {released ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="bg-success-container/60 text-success inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
            <CheckCircleIcon className="size-4" />
            שידור אושר וכסף שוחרר לארנק
          </div>
          <Link
            href={contractHref}
            className="text-primary hover:text-primary-hover flex items-center gap-0.5 text-sm font-semibold transition-colors"
          >
            לחדר העבודה
            <ChevronLeftIcon className="size-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-surface-low border-outline-variant mt-4 flex items-center gap-3 rounded-lg border p-3">
            <LockIcon className="text-primary size-5 shrink-0" />
            <div>
              <div className="text-on-surface-variant text-xs">סטטוס נאמנות (Escrow)</div>
              <div className="text-primary text-sm font-bold">
                {formatShekels(item.escrowAmount)} נעולים בנאמנות
              </div>
            </div>
            {STATE_CHIP[item.state] && (
              <StatusChip tone={STATE_CHIP[item.state]!.tone} className="ms-auto">
                {STATE_CHIP[item.state]!.label}
              </StatusChip>
            )}
          </div>

          {needsProof ? (
            <Link
              href="/dashboard/bookings"
              className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <UploadFileIcon className="size-4" />
              העלה תמונת/וידאו הוכחת שידור לשחרור הכסף
            </Link>
          ) : (
            <Link
              href={contractHref}
              className="border-outline text-primary hover:bg-surface-container mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold transition-colors"
            >
              מעבר לחדר העבודה וצ׳אט
              <ChevronLeftIcon className="size-4" />
            </Link>
          )}
        </>
      )}
    </article>
  );
}
