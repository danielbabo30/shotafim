import type { ReactNode } from "react";
import { ClockIcon, LocationIcon, MailIcon, PhoneIcon } from "@/components/marketing/icons";
import { type CompanyData, telHref, whatsappHref } from "@/lib/company-info";

/**
 * כרטיס פרטי קשר — אימייל, טלפון, כתובת ושעות.
 * הפרטים מגיעים מ-"מידע על החברה" (getCompanyInfo); הכותרת וההערה מעמוד צור-קשר.
 */
export function ContactInfo({
  company,
  heading,
  note,
}: {
  company: CompanyData;
  heading: string;
  note?: string | null;
}) {
  const wa = whatsappHref(company);

  return (
    <div className="border-outline-variant bg-surface-low shadow-ambient-sm rounded-xl border p-6 sm:p-8">
      <h2 className="text-2xl font-bold">{heading}</h2>

      <ul className="mt-6 flex flex-col gap-5">
        <Row icon={<MailIcon className="size-5" />} label="אימייל">
          <a
            href={`mailto:${company.email}`}
            className="text-on-surface hover:text-primary text-sm font-medium transition-colors"
          >
            {company.email}
          </a>
        </Row>

        <Row icon={<PhoneIcon className="size-5" />} label="טלפון">
          <a
            href={telHref(company.phone)}
            dir="ltr"
            className="text-on-surface hover:text-primary block text-start text-sm font-medium transition-colors"
          >
            {company.phone}
          </a>
        </Row>

        {wa && (
          <Row icon={<PhoneIcon className="size-5" />} label="WhatsApp">
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="text-on-surface hover:text-primary text-sm font-medium transition-colors"
            >
              שליחת הודעה
            </a>
          </Row>
        )}

        <Row icon={<LocationIcon className="size-5" />} label="כתובת">
          {company.mapUrl ? (
            <a
              href={company.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-on-surface hover:text-primary text-sm font-medium transition-colors"
            >
              {company.address}
            </a>
          ) : (
            <p className="text-on-surface text-sm font-medium">{company.address}</p>
          )}
        </Row>

        <Row icon={<ClockIcon className="size-5" />} label="שעות מענה">
          <p className="text-on-surface text-sm font-medium">{company.hours}</p>
          {company.hoursNote && (
            <p className="text-on-surface-variant mt-0.5 text-xs">{company.hoursNote}</p>
          )}
        </Row>
      </ul>

      {note && (
        <p className="border-outline-variant text-on-surface-variant mt-6 border-t pt-5 text-sm leading-relaxed">
          {note}
        </p>
      )}
    </div>
  );
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="bg-primary-fixed text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
        {icon}
      </span>
      <div>
        <p className="text-on-surface-variant text-xs font-semibold">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </li>
  );
}
