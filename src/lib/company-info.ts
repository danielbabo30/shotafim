import "server-only";
import { cache } from "react";
import { getPayloadClient } from "@/lib/payload";
import type { CompanyInfo } from "@/payload-types";
import { DEFAULT_COMPANY_INFO } from "@/lib/company-info-defaults";

/**
 * מקור האמת היחיד לפרטי החברה.
 * כל רכיב שצריך אימייל / טלפון / כתובת / שעות / רשתות — קורא מכאן, לא משדות משלו.
 * cache() מבטל כפילויות באותה בקשה; אם ה-global ריק/לא זמין — ברירות מחדל.
 */
export type CompanyData = Omit<CompanyInfo, "id" | "updatedAt" | "createdAt">;

export const getCompanyInfo = cache(async (): Promise<CompanyData> => {
  try {
    const payload = await getPayloadClient();
    const data = (await payload.findGlobal({
      slug: "company-info",
      depth: 0,
    })) as unknown as CompanyInfo;

    if (!data?.legalName) return DEFAULT_COMPANY_INFO;

    return {
      ...DEFAULT_COMPANY_INFO,
      ...data,
      social: data.social?.length ? data.social : DEFAULT_COMPANY_INFO.social,
    };
  } catch {
    return DEFAULT_COMPANY_INFO;
  }
});

/** אימייל התמיכה, עם נפילה לאימייל הראשי */
export function supportEmail(company: CompanyData): string {
  return company.supportEmail || company.email;
}

/** מספר טלפון מנוקה לקישור tel: */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** קישור WhatsApp, או null אם לא הוגדר */
export function whatsappHref(company: CompanyData): string | null {
  const digits = company.whatsapp?.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}
