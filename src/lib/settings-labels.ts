import type { LegalEntityType, BusinessModel, CreatorTaxStatus } from "@prisma/client";

/**
 * תוויות תצוגה למסך ההגדרות — קובץ ללא "server-only" בכוונה, כדי שקומפוננטות
 * client (טפסי הגדרות) יוכלו לייבא אותן ישירות בלי לגרור את שכבת ה-Prisma
 * של src/lib/settings.ts לתוך ה-bundle של הדפדפן.
 */

export const LEGAL_ENTITY_TYPE_LABELS: Record<LegalEntityType, string> = {
  LTD: "חברה בע״מ",
  LICENSED_DEALER: "עוסק מורשה",
  EXEMPT_DEALER: "עוסק פטור",
  PARTNERSHIP: "שותפות",
};

export const BUSINESS_MODEL_LABELS: Record<BusinessModel, string> = {
  PHYSICAL: "פיזי (חנויות)",
  ONLINE: "אונליין בלבד",
  HYBRID: "משולב (היברידי)",
};

export const CREATOR_TAX_STATUS_LABELS: Record<CreatorTaxStatus, string> = {
  EXEMPT_DEALER: "עוסק פטור",
  LICENSED_DEALER: "עוסק מורשה",
  COMPANY: "חברה בע״מ",
  INDIVIDUAL_WITHHOLDING: "יחיד — ניכוי מס במקור",
};
