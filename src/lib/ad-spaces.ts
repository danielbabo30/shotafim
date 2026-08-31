import "server-only";
import { cache } from "react";

/**
 * נתוני עמוד חיפוש שטחי הפרסום של המפרסם — עיון בשלטי חוצות, מסכים דיגיטליים,
 * תחבורה, ניוזלטרים ופודקאסטים הזמינים לשריון, עם סינון לפי עיר / סוג מדיה / קטגוריה.
 *
 * ⚠️ PLACEHOLDER — מודל הדומיין (AdSpaceAsset / AdSpaceOwnerProfile / AdSpaceBooking)
 * מחובר לסכמה אך עדיין ללא זריעה. כרגע מוחזרים נתוני-דמה קבועים כדי לבנות ולבדוק
 * את ה-UI. כשהמלאי יאוכלס, להחליף את גוף getAdSpacesData בשאילתת Prisma
 * (AdSpaceAsset עם isActive=true, join ל-City ול-AdSpaceBooking לחישוב זמינות) —
 * חתימת הפונקציה והטיפוסים אמורים להישאר. תוויות הקטגוריות מגיעות מ-Payload
 * (ראה partner-categories-query.ts); כאן שומרים slugים בלבד.
 */

export type AdSpaceMediaType =
  "digital_billboard" | "static_billboard" | "transit" | "newsletter" | "podcast";

export const MEDIA_TYPE_LABELS: Record<AdSpaceMediaType, string> = {
  digital_billboard: "מסך דיגיטלי",
  static_billboard: "שלט חוצות",
  transit: "תחבורה",
  newsletter: "ניוזלטר",
  podcast: "פודקאסט",
};

export type AdSpacePricingUnit = "day" | "week" | "month" | "cpm" | "episode";

export const PRICING_UNIT_LABELS: Record<AdSpacePricingUnit, string> = {
  day: "ליום",
  week: "לשבוע",
  month: "לחודש",
  cpm: "לכל 1,000 חשיפות",
  episode: "לפרק",
};

export type AdSpaceSpecKind =
  "size" | "resolution" | "reach" | "traffic" | "listeners" | "subscribers";

export type AdSpaceSpec = { kind: AdSpaceSpecKind; value: string };

export type AdSpaceAvailability = "immediate" | "booked";

export type AdSpaceListing = {
  id: string;
  title: string;
  mediaType: AdSpaceMediaType;
  /** שם ספק המדיה */
  provider: string;
  /** מיקום להצגה (עיר + כתובת / צומת). ריק לפודקאסט / ניוזלטר */
  location: string | null;
  /** שם העיר לסינון — null לשטחים לא-גאוגרפיים */
  city: string | null;
  /** משדר תוכן חי כרגע (מסכים דיגיטליים) */
  isLive: boolean;
  specs: AdSpaceSpec[];
  availability: AdSpaceAvailability;
  /** תאריך שחרור מפורמט — רק כש-availability === "booked" */
  bookedUntil: string | null;
  /** מחיר בסיס בשקלים */
  price: number;
  pricingUnit: AdSpacePricingUnit;
  /** "החל מ-" — כשיש טווח מחירים לפי לוח זמנים */
  priceFrom: boolean;
  /** slugים של קטגוריות דומיין (scope AD_SPACE) שהשטח משויך אליהן */
  categories: string[];
  /** מיקום סכמטי על המפה — אחוזים (0–100) מפינת ההתחלה */
  map: { x: number; y: number };
  href: string;
};

export type AdSpaceFacet = { value: string; label: string };

export type AdSpacesData = {
  listings: AdSpaceListing[];
  /** מסננים זמינים — נגזרים מהמלאי */
  mediaTypes: AdSpaceFacet[];
  cities: AdSpaceFacet[];
  categories: AdSpaceFacet[];
  /** סה״כ שטחים תואמים (לפני חיתוך לעמוד) */
  total: number;
};

const PLACEHOLDER: AdSpacesData = {
  listings: [
    {
      id: "as1",
      title: "מסך LED דיגיטלי — עזריאלי דרום",
      mediaType: "digital_billboard",
      provider: "מדיה פלוס",
      location: "תל אביב, דרך מנחם בגין 132",
      city: "תל אביב",
      isLive: true,
      specs: [
        { kind: "resolution", value: "1920×1080" },
        { kind: "reach", value: "180K חשיפות / יום" },
      ],
      availability: "immediate",
      bookedUntil: null,
      price: 18500,
      pricingUnit: "week",
      priceFrom: true,
      categories: ["digital-screens"],
      map: { x: 38, y: 30 },
      href: "/dashboard/ad-spaces/as1",
    },
    {
      id: "as2",
      title: "שלט חוצות ראשי — גשר לה גווארדיה",
      mediaType: "static_billboard",
      provider: "אאוטדור מדיה",
      location: "נתיבי איילון (דרום), תל אביב",
      city: "תל אביב",
      isLive: false,
      specs: [
        { kind: "size", value: "24×3 מ׳" },
        { kind: "traffic", value: "240K רכבים / יום" },
      ],
      availability: "booked",
      bookedUntil: "15 באוקטובר",
      price: 42000,
      pricingUnit: "month",
      priceFrom: false,
      categories: ["outdoor-billboards"],
      map: { x: 60, y: 46 },
      href: "/dashboard/ad-spaces/as2",
    },
    {
      id: "as3",
      title: "השבוע בהייטק — חסות ראשית",
      mediaType: "podcast",
      provider: "רשת פודקאסטים ישראלית",
      location: null,
      city: null,
      isLive: false,
      specs: [{ kind: "listeners", value: "35K מאזינים / פרק" }],
      availability: "immediate",
      bookedUntil: null,
      price: 4500,
      pricingUnit: "episode",
      priceFrom: false,
      categories: ["podcasts"],
      map: { x: 72, y: 20 },
      href: "/dashboard/ad-spaces/as3",
    },
    {
      id: "as4",
      title: "מסכי מעליות — מגדלי משרדים, מרכז",
      mediaType: "digital_billboard",
      provider: "ליפט מדיה",
      location: "רמת גן, בורסת היהלומים",
      city: "רמת גן",
      isLive: false,
      specs: [
        { kind: "resolution", value: "1080×1920" },
        { kind: "reach", value: "90K חשיפות / יום" },
      ],
      availability: "immediate",
      bookedUntil: null,
      price: 12000,
      pricingUnit: "week",
      priceFrom: true,
      categories: ["digital-screens"],
      map: { x: 50, y: 62 },
      href: "/dashboard/ad-spaces/as4",
    },
    {
      id: "as5",
      title: "עטיפת אוטובוס — קו 480 ירושלים–תל אביב",
      mediaType: "transit",
      provider: "אגד פרסום",
      location: "ציר ירושלים–תל אביב",
      city: "ירושלים",
      isLive: false,
      specs: [
        { kind: "size", value: "עטיפה מלאה" },
        { kind: "traffic", value: "1.2M נסיעות / חודש" },
      ],
      availability: "immediate",
      bookedUntil: null,
      price: 9800,
      pricingUnit: "month",
      priceFrom: false,
      categories: ["public-transport"],
      map: { x: 28, y: 40 },
      href: "/dashboard/ad-spaces/as5",
    },
    {
      id: "as6",
      title: "ניוזלטר «כלכליסט בוקר» — באנר ראשי",
      mediaType: "newsletter",
      provider: "כלכליסט",
      location: null,
      city: null,
      isLive: false,
      specs: [{ kind: "subscribers", value: "68K נמענים • 42% פתיחה" }],
      availability: "booked",
      bookedUntil: "3 בנובמבר",
      price: 6200,
      pricingUnit: "day",
      priceFrom: false,
      categories: ["newsletters"],
      map: { x: 80, y: 55 },
      href: "/dashboard/ad-spaces/as6",
    },
    {
      id: "as7",
      title: "שלט גשר — כניסה צפונית לחיפה",
      mediaType: "static_billboard",
      provider: "צפון מדיה",
      location: "חיפה, צ׳ק פוסט",
      city: "חיפה",
      isLive: false,
      specs: [
        { kind: "size", value: "18×4 מ׳" },
        { kind: "traffic", value: "160K רכבים / יום" },
      ],
      availability: "immediate",
      bookedUntil: null,
      price: 21000,
      pricingUnit: "month",
      priceFrom: false,
      categories: ["outdoor-billboards"],
      map: { x: 44, y: 15 },
      href: "/dashboard/ad-spaces/as7",
    },
  ],
  mediaTypes: [
    { value: "static_billboard", label: MEDIA_TYPE_LABELS.static_billboard },
    { value: "digital_billboard", label: MEDIA_TYPE_LABELS.digital_billboard },
    { value: "transit", label: MEDIA_TYPE_LABELS.transit },
    { value: "newsletter", label: MEDIA_TYPE_LABELS.newsletter },
    { value: "podcast", label: MEDIA_TYPE_LABELS.podcast },
  ],
  cities: [
    { value: "תל אביב", label: "תל אביב" },
    { value: "רמת גן", label: "רמת גן" },
    { value: "ירושלים", label: "ירושלים" },
    { value: "חיפה", label: "חיפה" },
  ],
  categories: [
    { value: "outdoor-billboards", label: "שילוט חוצות" },
    { value: "digital-screens", label: "מסכים דיגיטליים" },
    { value: "public-transport", label: "תחבורה ציבורית" },
    { value: "newsletters", label: "ניוזלטרים" },
    { value: "podcasts", label: "פודקאסטים" },
  ],
  total: 7,
};

export const getAdSpacesData = cache(async (brandUserId: string): Promise<AdSpacesData> => {
  void brandUserId; // TODO: שאילתת Prisma על AdSpaceAsset (isActive) + City + AdSpaceBooking לזמינות
  return PLACEHOLDER;
});
