import type { ProofType } from "@prisma/client";

/** תוויות/טיפוסים טהורים של הוכחות שידור (בטוח לייבוא מרכיבי לקוח) */
export const PROOF_TYPE_LABELS: Record<ProofType, string> = {
  PHOTO_PROOF: "צילום / וידאו משטח",
  SYSTEM_LOG: "לוג מערכת",
  ANALYTICS_EXPORT: "ייצוא אנליטיקס",
};

export type ProofOfPlayView = {
  id: string;
  proofType: ProofType;
  fileUrl: string;
  notes: string | null;
  verifiedByBrand: boolean;
  uploadedAt: Date;
};
