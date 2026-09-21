import type { CampaignStatus } from "@prisma/client";
import { cn } from "@/lib/cn";
import { CAMPAIGN_STATUS_META } from "@/lib/campaign-brief";

/** תג סטטוס לקמפיין — tint רך + טקסט רווי (DESIGN.md § Chips & Badges) */
export function CampaignStatusBadge({
  status,
  className,
}: {
  status: CampaignStatus;
  className?: string;
}) {
  const meta = CAMPAIGN_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
