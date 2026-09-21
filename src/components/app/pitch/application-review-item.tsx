import Link from "next/link";
import { StatusChip } from "@/components/app/status-chip";
import { Button } from "@/components/ui/button";
import { formatShekels } from "@/lib/dashboard-brand";
import { APPLICATION_STATUS_META } from "@/lib/pitch";
import { acceptApplication, rejectApplication } from "@/lib/actions/application-actions";
import {
  CheckIcon,
  CloseIcon,
  ClockIcon,
  UserIcon,
  VerifiedIcon,
} from "@/components/marketing/icons";
import type { ApplicationView } from "@/lib/applications";

const KIND_LABEL = { creator: "יוצר תוכן", space: "בעל שטחי פרסום", user: "משתמש" } as const;

/** שורת הצעה בתצוגת המפרסם — פרטי המגיש + אישור / דחייה */
export function ApplicationReviewItem({
  application,
  campaignTitle,
  campaignHref,
}: {
  application: ApplicationView;
  campaignTitle?: string;
  campaignHref?: string;
}) {
  const a = application.applicant;
  const invited = application.status === "INVITED";
  const meta = invited
    ? { label: "הזמנה נשלחה — ממתין למענה", tone: "primary" as const }
    : APPLICATION_STATUS_META[application.status];
  const pending = application.status === "SUBMITTED";

  return (
    <li className="border-outline-variant bg-surface-lowest rounded-xl border p-5">
      {campaignTitle && (
        <p className="text-on-surface-variant mb-3 text-xs">
          לבריף:{" "}
          {campaignHref ? (
            <Link href={campaignHref} className="text-primary font-medium hover:underline">
              {campaignTitle}
            </Link>
          ) : (
            <span className="text-on-surface font-medium">{campaignTitle}</span>
          )}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="bg-surface-container text-on-surface-variant grid size-11 shrink-0 place-items-center rounded-full">
            <UserIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-on-surface flex items-center gap-1.5 font-semibold">
              {a.kind === "creator" && a.profileId ? (
                <Link
                  href={`/dashboard/marketplace/${a.profileId}`}
                  className="hover:text-primary hover:underline"
                >
                  {a.name}
                </Link>
              ) : (
                a.name
              )}
              {a.verified && <VerifiedIcon className="text-primary size-4" />}
            </p>
            <p className="text-on-surface-variant text-xs">
              {KIND_LABEL[a.kind]}
              {a.detail ? ` · ${a.detail}` : ""}
            </p>
          </div>
        </div>
        <StatusChip tone={meta.tone}>{meta.label}</StatusChip>
      </div>

      {invited ? (
        <p className="text-on-surface-variant mt-4 text-sm">
          היוצר יקבע מחיר וזמן אספקה בעת הגשת ההצעה.
        </p>
      ) : (
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
          <div className="flex items-center gap-1.5">
            <dt className="text-on-surface-variant text-xs">הצעת מחיר:</dt>
            <dd className="text-on-surface font-semibold">
              {formatShekels(application.proposedPriceILS)}
            </dd>
          </div>
          <div className="text-on-surface-variant flex items-center gap-1.5 text-xs">
            <ClockIcon className="size-3.5" />
            אספקה תוך {application.estimatedDeliveryDays} ימים
          </div>
        </dl>
      )}

      {application.coverLetter && (
        <p className="text-on-surface-variant border-outline-variant mt-3 border-s-2 ps-3 text-sm leading-relaxed whitespace-pre-line">
          {application.coverLetter}
        </p>
      )}

      {pending && (
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={acceptApplication}>
            <input type="hidden" name="applicationId" value={application.id} />
            <Button type="submit" size="md">
              <CheckIcon className="size-4" />
              אשר וצור חוזה
            </Button>
          </form>
          <form action={rejectApplication}>
            <input type="hidden" name="applicationId" value={application.id} />
            <Button type="submit" variant="ghost" size="md">
              <CloseIcon className="size-4" />
              דחה
            </Button>
          </form>
        </div>
      )}

      {application.contractId && (
        <Link
          href={`/dashboard/contracts/${application.contractId}`}
          className="text-primary mt-4 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        >
          מעבר לחדר העבודה
        </Link>
      )}
    </li>
  );
}
