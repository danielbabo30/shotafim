import type { CompanyInfo } from "@/payload-types";

/**
 * מידע על החברה — ערכי seed ראשוניים + fallback אם ה-CMS ריק/לא זמין.
 * לאחר seed, העריכה נעשית מ-/admin ← "מידע על החברה". הערכים כאן הם דוגמה — לעדכן בפאנל.
 */
type CompanyData = Omit<CompanyInfo, "id" | "updatedAt" | "createdAt">;

export const DEFAULT_COMPANY_INFO: CompanyData = {
  legalName: "שותפים בע״מ",
  registrationNumber: null,
  email: "hello@shutafim.co.il",
  supportEmail: null,
  phone: "03-000-0000",
  whatsapp: null,
  address: "רחוב הארבעה 21, תל אביב-יפו",
  mapUrl: null,
  hours: "ימים א׳–ה׳, 9:00–18:00",
  hoursNote: null,
  social: [],
};
