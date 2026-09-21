import { getPartnerDashboard } from "@/lib/partner-dashboard";
import { PartnerMetrics } from "@/components/app/contract-room/partner-metrics";
import { PartnerClicksChart } from "@/components/app/contract-room/partner-clicks-chart";
import { PartnerCheckpoints } from "@/components/app/contract-room/partner-checkpoints";
import { PartnerEventJournal } from "@/components/app/contract-room/partner-event-journal";
import { PartnerLinkGenerator } from "@/components/app/contract-room/partner-link-generator";
import { PartnerOrdersList } from "@/components/app/contract-room/partner-orders-list";
import { PartnerConnectedSites } from "@/components/app/contract-room/partner-connected-sites";
import { PluginDownloadCard } from "@/components/app/plugin/plugin-download-card";

/**
 * דשבורד "תשלום פר רכישה" בחדר העבודה (§8) — מקור אמת יחיד, read-only,
 * שני הצדדים רואים את אותם מספרים. סיבלינג לפאנל ההקמה/פיקדון של WP-2.
 * מוחזר null כשלחוזה אין PartnerProgram (הפאנל הרגיל מטפל).
 */
export async function PartnerDashboard({ contractId }: { contractId: string }) {
  const data = await getPartnerDashboard(contractId);
  if (!data) return null;

  const isBrand = data.viewerParty === "brand";
  const active = data.status === "ACTIVE" || data.status === "GATE_80";

  return (
    <div className="flex flex-col gap-4">
      <PartnerMetrics data={data} />

      {data.hasLink && <PartnerClicksChart series={data.clickSeries} />}

      <PartnerCheckpoints nextCheckpoint={data.nextCheckpoint} checkpoints={data.checkpoints} />

      {/* צד המפרסם: תוסף המעקב מפעיל את חיבור החנות ואת מדידת הרכישות (WP-4) */}
      {isBrand && <PluginDownloadCard />}
      {isBrand && <PartnerConnectedSites sites={data.connectedSites} />}
      {isBrand && <PartnerOrdersList orders={data.orders} canDecide />}

      {!isBrand && (
        <PartnerLinkGenerator
          refCode={data.refCode}
          destinationUrl={data.destinationUrl}
          couponCode={data.couponCode}
          couponDiscountPct={data.couponDiscountPct}
          hasLink={data.hasLink}
          active={active}
        />
      )}

      <PartnerEventJournal entries={data.journal} />
    </div>
  );
}
