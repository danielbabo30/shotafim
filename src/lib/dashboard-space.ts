import "server-only";
import { cache } from "react";
import type { AdSpaceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatShekels } from "@/lib/dashboard-brand";

/**
 * נתוני לוח-הבקרה של בעל שטחי הפרסום (כובע "מדיה") — נתונים אמיתיים מ-Prisma
 * (ראה CLAUDE.md §"האזור האישי"), מסונן לפרופיל ה-AdSpaceOwnerProfile של המשתמש
 * המחובר. אם עדיין אין פרופיל — הכול אפס/ריק.
 *
 * הצד הזה של המערכת הוא הספק (Contract.providerId): הכסף נעול בנאמנות אצל
 * המפרסם עד שמוגשת הוכחת שידור. מעברי סטטוס של EscrowHold עדיין ידניים/אדמין
 * עד חיבור PSP — הנתונים כאן אמיתיים ככל שהזרימה מילאה אותם.
 */

export { formatShekels };

/** מצב השידור של חוזה — קובע את מראה הכרטיס ואת רצועת ה-KPI */
export type BroadcastState = "needs_proof" | "in_review" | "released" | "scheduled";

const AD_SPACE_TYPE_LABEL: Record<AdSpaceType, string> = {
  DIGITAL_BILLBOARD: "מסך דיגיטלי",
  STATIC_BILLBOARD: "שלט חוצות",
  TRANSIT: "תחבורה",
  NEWSLETTER: "ניוזלטר",
  PODCAST_SPONSORSHIP: "פודקאסט",
};

export type SpaceKpis = {
  /** סכום נעול בנאמנות על חוזים פעילים שלי (EscrowHold HELD) */
  escrowUpcoming: number;
  escrowUpcomingDeals: number;
  /** שוחרר לספק ועדיין לא נמשך (RELEASED_TO_PROVIDER פחות משיכות) */
  availableToWithdraw: number;
  /** אחוז השטחים הפעילים שמשובצים השבוע */
  occupancyPct: number;
  occupancyHint: string;
  /** חוזים שהשידור בהם החל / הסתיים והכסף עדיין נעול בהמתנה להוכחה */
  proofsPending: number;
};

export type BroadcastCardVM = {
  /** מזהה החוזה */
  id: string;
  assetTitle: string;
  assetTypeLabel: string;
  advertiser: string;
  campaignTitle: string | null;
  /** "12 באוג׳ – 19 באוג׳" או null כשאין עדיין שיבוץ */
  windowLabel: string | null;
  escrowAmount: number;
  state: BroadcastState;
  /** משדר תוכן חי כרגע */
  isLive: boolean;
};

export type CalendarDay = {
  /** 0 = תא ריק לפני/אחרי החודש */
  day: number;
  inMonth: boolean;
  /** עומס שיבוצים יחסי למלאי — 0 (פנוי) עד 4 (מלא) */
  load: 0 | 1 | 2 | 3 | 4;
  /** יש אירוע שדורש תשומת לב (הוכחת שידור לביצוע) */
  flag: boolean;
  isToday: boolean;
};

export type SpaceCalendar = {
  monthLabel: string;
  /** כותרות ימים, ראשון→שבת (ה-grid ב-RTL מסדר אותן ימין→שמאל) */
  weekdays: string[];
  days: CalendarDay[];
};

export type SpaceDashboardData = {
  company: string | null;
  kpis: SpaceKpis;
  broadcasts: BroadcastCardVM[];
  calendar: SpaceCalendar;
};

const WEEKDAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

const heDayMonth = (d: Date) =>
  new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short" }).format(d);

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function emptyCalendar(now: Date): SpaceCalendar {
  return buildCalendar(now, [], new Set());
}

/** בונה רשת חודש מלאה (תאים מובילים + כל ימי החודש + השלמה לשבוע) */
function buildCalendar(now: Date, perDayLoadRatio: number[], flagDays: Set<number>): SpaceCalendar {
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = new Date(year, month, 1).getDay(); // 0 = ראשון
  const todayDate = now.getDate();

  const bucket = (ratio: number): 0 | 1 | 2 | 3 | 4 => {
    if (ratio <= 0) return 0;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  const days: CalendarDay[] = [];
  for (let i = 0; i < leading; i++) {
    days.push({ day: 0, inMonth: false, load: 0, flag: false, isToday: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      day: d,
      inMonth: true,
      load: bucket(perDayLoadRatio[d] ?? 0),
      flag: flagDays.has(d),
      isToday: d === todayDate,
    });
  }
  while (days.length % 7 !== 0) {
    days.push({ day: 0, inMonth: false, load: 0, flag: false, isToday: false });
  }

  return {
    monthLabel: new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(now),
    weekdays: WEEKDAYS,
    days,
  };
}

const EMPTY = (now: Date): SpaceDashboardData => ({
  company: null,
  kpis: {
    escrowUpcoming: 0,
    escrowUpcomingDeals: 0,
    availableToWithdraw: 0,
    occupancyPct: 0,
    occupancyHint: "אין עדיין שטחים פעילים",
    proofsPending: 0,
  },
  broadcasts: [],
  calendar: emptyCalendar(now),
});

const STATE_ORDER: Record<BroadcastState, number> = {
  needs_proof: 0,
  in_review: 1,
  scheduled: 2,
  released: 3,
};

export const getSpaceDashboardData = cache(
  async (spaceUserId: string): Promise<SpaceDashboardData> => {
    const now = new Date();

    const owner = await prisma.adSpaceOwnerProfile.findUnique({
      where: { userId: spaceUserId },
      select: { id: true, companyName: true },
    });
    if (!owner) return EMPTY(now);
    const ownerId = owner.id;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const weekStart = startOfDay(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [
      assetsCount,
      bookedThisWeek,
      contracts,
      escrowHeldAgg,
      escrowReleasedAgg,
      withdrawalsAgg,
      monthBookings,
    ] = await Promise.all([
      prisma.adSpaceAsset.count({
        where: { ownerId, isActive: true, deletedAt: null },
      }),
      prisma.adSpaceAsset.count({
        where: {
          ownerId,
          isActive: true,
          deletedAt: null,
          bookings: {
            some: {
              status: { in: ["RESERVED", "CONFIRMED", "BROADCASTING"] },
              startDate: { lt: weekEnd },
              endDate: { gte: weekStart },
            },
          },
        },
      }),
      prisma.contract.findMany({
        where: { providerId: spaceUserId, adSpaceAssetId: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 12,
        select: {
          id: true,
          status: true,
          deadline: true,
          campaign: {
            select: { title: true, business: { select: { name: true } } },
          },
          adSpaceAsset: { select: { title: true, type: true } },
          escrowHold: { select: { amountILS: true, status: true } },
          bookings: {
            select: { startDate: true, endDate: true, status: true },
            orderBy: { startDate: "asc" },
          },
          proofs: { select: { verifiedByBrand: true } },
        },
      }),
      prisma.escrowHold.aggregate({
        _sum: { amountILS: true },
        _count: true,
        where: { status: "HELD", contract: { providerId: spaceUserId } },
      }),
      prisma.escrowHold.aggregate({
        _sum: { amountILS: true },
        where: { status: "RELEASED_TO_PROVIDER", contract: { providerId: spaceUserId } },
      }),
      prisma.transaction.aggregate({
        _sum: { amountILS: true },
        where: { userId: spaceUserId, type: "WITHDRAWAL", status: "SUCCESS" },
      }),
      prisma.adSpaceBooking.findMany({
        where: {
          adSpaceAsset: { ownerId },
          status: { in: ["RESERVED", "CONFIRMED", "BROADCASTING", "COMPLETED"] },
          startDate: { lt: monthEnd },
          endDate: { gte: monthStart },
        },
        select: { startDate: true, endDate: true },
      }),
    ]);

    // ── רצועת KPI ──
    const escrowUpcoming = Number(escrowHeldAgg._sum.amountILS ?? 0);
    const released = Number(escrowReleasedAgg._sum.amountILS ?? 0);
    const withdrawn = Number(withdrawalsAgg._sum.amountILS ?? 0);
    const availableToWithdraw = Math.max(0, released - withdrawn);
    const occupancyPct = assetsCount === 0 ? 0 : Math.round((bookedThisWeek / assetsCount) * 100);

    // ── כרטיסי שידור ──
    const broadcasts: BroadcastCardVM[] = contracts.map((c) => {
      const escrowStatus = c.escrowHold?.status ?? null;
      const proofVerified = c.proofs.some((p) => p.verifiedByBrand);
      const proofUploaded = c.proofs.length > 0;
      const started = c.bookings.some((b) => b.startDate <= now);
      const isLive = c.bookings.some((b) => b.status === "BROADCASTING");

      let state: BroadcastState;
      if (escrowStatus === "RELEASED_TO_PROVIDER" || c.status === "APPROVED") {
        state = "released";
      } else if (c.status === "SUBMITTED_FOR_REVIEW" || (proofUploaded && !proofVerified)) {
        state = "in_review";
      } else if (started && escrowStatus === "HELD" && !proofVerified) {
        state = "needs_proof";
      } else {
        state = "scheduled";
      }

      const starts = c.bookings.map((b) => b.startDate);
      const ends = c.bookings.map((b) => b.endDate);
      const windowLabel =
        starts.length > 0
          ? `${heDayMonth(new Date(Math.min(...starts.map((d) => d.getTime()))))} – ${heDayMonth(
              new Date(Math.max(...ends.map((d) => d.getTime()))),
            )}`
          : null;

      return {
        id: c.id,
        assetTitle: c.adSpaceAsset?.title ?? "שטח פרסום",
        assetTypeLabel: c.adSpaceAsset ? AD_SPACE_TYPE_LABEL[c.adSpaceAsset.type] : "שטח פרסום",
        advertiser: c.campaign.business.name,
        campaignTitle: c.campaign.title || null,
        windowLabel,
        escrowAmount: Number(c.escrowHold?.amountILS ?? 0),
        state,
        isLive,
      };
    });

    broadcasts.sort(
      (a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || Number(b.isLive) - Number(a.isLive),
    );
    const proofsPending = broadcasts.filter((b) => b.state === "needs_proof").length;

    // ── יומן תפוסה ──
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const perDayCount = new Array<number>(daysInMonth + 1).fill(0);
    for (const b of monthBookings) {
      const from = Math.max(
        1,
        b.startDate.getMonth() === now.getMonth() ? b.startDate.getDate() : 1,
      );
      const to =
        b.endDate.getMonth() === now.getMonth() && b.endDate.getFullYear() === now.getFullYear()
          ? b.endDate.getDate()
          : daysInMonth;
      for (let d = from; d <= to && d <= daysInMonth; d++) perDayCount[d] += 1;
    }
    const denom = Math.max(1, assetsCount);
    const perDayLoadRatio = perDayCount.map((n) => n / denom);

    const flagDays = new Set<number>();
    for (const c of contracts) {
      const proofVerified = c.proofs.some((p) => p.verifiedByBrand);
      if ((c.escrowHold?.status ?? null) !== "HELD" || proofVerified) continue;
      for (const b of c.bookings) {
        if (
          b.endDate >= monthStart &&
          b.endDate < monthEnd &&
          b.endDate.getMonth() === now.getMonth()
        ) {
          flagDays.add(b.endDate.getDate());
        }
      }
    }

    return {
      company: owner.companyName,
      kpis: {
        escrowUpcoming,
        escrowUpcomingDeals: escrowHeldAgg._count,
        availableToWithdraw,
        occupancyPct,
        occupancyHint:
          assetsCount === 0
            ? "אין עדיין שטחים פעילים"
            : `${bookedThisWeek} מתוך ${assetsCount} שטחים משובצים`,
        proofsPending,
      },
      broadcasts,
      calendar: buildCalendar(now, perDayLoadRatio, flagDays),
    };
  },
);
