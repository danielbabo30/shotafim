import { CampaignStatusBadge } from "@/components/app/campaign-status-badge";
import { deliverableLabel, targetTypeLabel } from "@/lib/campaign-brief";
import { formatShekels } from "@/lib/dashboard-brand";
import { CalendarIcon, LinkIcon, LocationIcon, MegaphoneIcon } from "@/components/marketing/icons";
import type { CampaignBrief } from "@/lib/applications";

const dateFmt = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** תצוגת הבריף — משותפת לתצוגת המפרסם ולתצוגת הספק */
export function CampaignBriefView({ brief }: { brief: CampaignBrief }) {
  return (
    <div className="border-outline-variant bg-surface-lowest shadow-ambient flex flex-col gap-5 rounded-xl border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-on-surface-variant flex items-center gap-1.5 text-xs">
            <MegaphoneIcon className="size-3.5" />
            {brief.businessName} · {targetTypeLabel(brief.targetType)}
          </p>
          <h1 className="text-on-surface mt-1 text-2xl font-bold">{brief.title}</h1>
        </div>
        <CampaignStatusBadge status={brief.status} />
      </div>

      {brief.description && (
        <p className="text-on-surface-variant text-sm leading-relaxed whitespace-pre-line">
          {brief.description}
        </p>
      )}

      {brief.deliverables.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {brief.deliverables.map((d) => (
            <span
              key={d}
              className="bg-surface-container text-on-surface-variant rounded-full px-3 py-1 text-xs font-medium"
            >
              {deliverableLabel(d)}
            </span>
          ))}
        </div>
      )}

      <dl className="border-outline-variant grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-on-surface-variant text-xs">תקציב כולל</dt>
          <dd className="text-on-surface mt-0.5 font-semibold">
            {brief.totalBudgetILS > 0 ? formatShekels(brief.totalBudgetILS) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-on-surface-variant flex items-center gap-1 text-xs">
            <CalendarIcon className="size-3.5" />
            מועד סיום
          </dt>
          <dd className="text-on-surface mt-0.5 font-semibold">
            {brief.endDate ? dateFmt.format(brief.endDate) : "גמיש"}
          </dd>
        </div>
        {brief.locationLabel && (
          <div>
            <dt className="text-on-surface-variant flex items-center gap-1 text-xs">
              <LocationIcon className="size-3.5" />
              סניף
            </dt>
            <dd className="text-on-surface mt-0.5 font-semibold">{brief.locationLabel}</dd>
          </div>
        )}
      </dl>

      {brief.hasPhysicalProduct && (
        <p className="border-outline-variant bg-surface-container text-on-surface-variant flex items-start gap-2 rounded-lg border px-3 py-2 text-xs">
          <MegaphoneIcon className="mt-0.5 size-3.5 shrink-0" />
          הקמפיין כולל מוצר פיזי שנשלח ליוצר. לאחר אישור ההצעה, היוצר יתבקש לספק כתובת משלוח בחדר
          העבודה.
        </p>
      )}

      {brief.briefAssetsUrl && (
        <a
          href={brief.briefAssetsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        >
          <LinkIcon className="size-4" />
          חומרי בריף מצורפים
        </a>
      )}
    </div>
  );
}
