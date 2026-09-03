import { cn } from "@/lib/cn";
import { InfoIcon } from "@/components/marketing/icons";
import type { PartnerDashboardData } from "@/lib/partner-dashboard";

const nis = (n: number) => `₪${Math.round(n).toLocaleString("en-US")}`;

function Tile({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "primary" | "success" | "warning";
}) {
  return (
    <div className="border-outline-variant bg-surface-lowest flex flex-col gap-1 rounded-lg border p-3">
      <span className="text-on-surface-variant text-xs">{label}</span>
      <span
        className={cn(
          "font-display text-lg font-bold",
          tone === "primary" && "text-primary",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "neutral" && "text-on-surface",
        )}
      >
        {value}
      </span>
      {sub && <span className="text-on-surface-variant text-[11px]">{sub}</span>}
    </div>
  );
}

/** רצועת מדדי הביצוע של השותפות — משותפת ליוצר ולמפרסם (§8) */
export function PartnerMetrics({ data }: { data: PartnerDashboardData }) {
  const { metrics: m, hasLink } = data;
  const isBrand = data.viewerParty === "brand";

  return (
    <div className="flex flex-col gap-3">
      {!hasLink && (
        <p className="border-outline-variant bg-surface-container text-on-surface-variant flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
          מסלול קופון בלבד — השיוך נקבע לפי קוד הקופון בקופה. אין מדידת קליקים או שיעור המרה.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {hasLink && (
          <>
            <Tile label="קליקים" value={m.clicks.toLocaleString("en-US")} />
            <Tile
              label="שיעור המרה"
              value={m.conversionRate != null ? `${m.conversionRate}%` : "—"}
            />
          </>
        )}
        <Tile
          label="הזמנות"
          value={m.orders.toLocaleString("en-US")}
          sub={m.newCustomerOrders > 0 ? `${m.newCustomerOrders} לקוחות חדשים` : undefined}
        />
        <Tile label="הכנסה שהניב" value={nis(m.grossRevenue)} tone="neutral" />
        <Tile label="עמלה ממתינה" value={nis(m.commissionPending)} tone="warning" />
        <Tile label="עמלה מאושרת" value={nis(m.commissionApproved)} tone="primary" />
        <Tile label="עמלה ששולמה" value={nis(m.commissionPaid)} tone="success" />
        {m.commissionOnHold > 0 && (
          <Tile label="עמלה בעצירה" value={nis(m.commissionOnHold)} tone="warning" />
        )}
        {m.commissionReversed > 0 && <Tile label="עמלה שבוטלה" value={nis(m.commissionReversed)} />}
        {isBrand && (
          <Tile
            label="ROI"
            value={m.roi != null ? `×${m.roi}` : "—"}
            sub="הכנסה חלקי עלות שותפות"
            tone={m.roi != null && m.roi >= 1 ? "success" : "neutral"}
          />
        )}
      </div>
    </div>
  );
}
