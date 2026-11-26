/**
 * ציון אמינות להצגה. הערך השמור (CreatorProfile.reliabilityScore) יורד באכיפת מחלוקות
 * אך לא עולה לעולם; לכן ליוצר שהשלים חוזים ועדיין עם ציון 0 נגזר ציון מההיסטוריה
 * (אחוז החוזים שהסתיימו באישור מתוך אלה שהסתיימו). ללא היסטוריה וללא ציון — null ("—").
 */
export function effectiveReliabilityScore(
  stored: number,
  approvedContracts: number,
  refundedContracts: number,
): number | null {
  if (stored > 0) return Math.round(stored);
  const finished = approvedContracts + refundedContracts;
  if (finished === 0) return null;
  return Math.round((approvedContracts / finished) * 100);
}
