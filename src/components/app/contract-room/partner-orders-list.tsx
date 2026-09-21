import { cn } from "@/lib/cn";
import { ORDER_STATUS_LABEL, type PartnerOrderRow } from "@/lib/partner-dashboard";
import { OrderDecisionButtons } from "@/components/app/contract-room/order-decision-buttons";

const nis = (n: number) => `₪${Math.round(n).toLocaleString("en-US")}`;
const dateFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric" });

const STATUS_TONE: Record<PartnerOrderRow["status"], string> = {
  PENDING: "bg-warning-container text-warning",
  ON_HOLD: "bg-error-container text-on-error-container",
  APPROVED: "bg-primary-fixed text-on-primary-fixed",
  PAID: "bg-success-container text-success",
  REVERSED: "bg-surface-container text-on-surface-variant",
};

const METHOD_LABEL: Record<PartnerOrderRow["method"], string> = {
  COUPON: "קופון",
  COOKIE: "לינק",
  MANUAL: "ידני",
};

/**
 * רשימת הזמנות משויכות — תצוגת המפרסם (§8). כשהצופה הוא המפרסם, כל שורה
 * נושאת כפתורי החלטה (אשר / עצור לבירור / בטל עמלה) שקוראים ל-decideAttributedOrder.
 */
export function PartnerOrdersList({
  orders,
  canDecide = false,
}: {
  orders: PartnerOrderRow[];
  canDecide?: boolean;
}) {
  if (orders.length === 0) return null;

  return (
    <div className="border-outline-variant bg-surface-lowest flex flex-col gap-2 rounded-lg border p-4">
      <h3 className="text-on-surface text-sm font-semibold">הזמנות אחרונות</h3>
      <ul className="divide-outline-variant divide-y">
        {orders.map((o) => (
          <li
            key={o.id}
            className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0"
          >
            <div className="min-w-0">
              <p className="text-on-surface text-xs font-medium">
                #{o.externalOrderId}
                <span className="text-on-surface-variant"> · {dateFmt.format(o.placedAt)}</span>
                {o.isNewCustomer && <span className="text-success"> · לקוח חדש</span>}
              </p>
              <p className="text-on-surface-variant text-[11px]">
                {nis(o.grossAmount)} · עמלה {nis(o.commissionAmount)} · שיוך{" "}
                {METHOD_LABEL[o.method]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  STATUS_TONE[o.status],
                )}
              >
                {ORDER_STATUS_LABEL[o.status]}
              </span>
              {canDecide && <OrderDecisionButtons orderId={o.id} status={o.status} />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
