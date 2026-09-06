import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/app-user";
import { ROLE_META, type RoleKey } from "@/lib/app-nav";
import { buildSocialConnections } from "@/lib/social-connections";
import { SocialConnectGrid } from "@/components/app/social-connect-grid";
import {
  CheckCircleIcon,
  CheckIcon,
  SwapIcon,
  ArrowIcon,
  ShareIcon,
} from "@/components/marketing/icons";

export const metadata: Metadata = {
  title: "ההרשמה הושלמה",
  description: "החשבון שלך במערכת שותפים מוכן לפעילות.",
};

const CHECKLIST: Record<RoleKey, string> = {
  brand: "פרופיל עסק וסניפים",
  creator: "מדיה-קיט וערוצי סושיאל",
  space: "נכסי מדיה ותמחור",
  admin: "הרשאות ניהול",
};

export default async function RegisterCompletePage() {
  const user = await requireActiveUser();

  const profiles = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      businessProfile: { select: { name: true } },
      creatorProfile: {
        select: {
          displayName: true,
          channels: {
            select: { id: true, platform: true, handle: true, followersCount: true, oauthTokenUpdatedAt: true },
          },
          socialConsents: { select: { platform: true, consentedAt: true } },
        },
      },
      adSpaceOwnerProfile: { select: { companyName: true } },
    },
  });

  const socialConnections = profiles?.creatorProfile
    ? buildSocialConnections(
        profiles.creatorProfile.channels,
        profiles.creatorProfile.socialConsents,
      )
    : [];

  const roleKeys = user.roleKeys;
  const profileNames = [
    profiles?.businessProfile?.name,
    profiles?.creatorProfile?.displayName,
    profiles?.adSpaceOwnerProfile?.companyName,
  ].filter((n): n is string => Boolean(n));

  const subject = profileNames.length
    ? profileNames.length === 1
      ? `הפרופיל "${profileNames[0]}"`
      : `הפרופילים ${profileNames.map((n) => `"${n}"`).join(" ו")}`
    : "הפרופיל שלך";

  const checklist = [...roleKeys.map((r) => CHECKLIST[r]), "ארנק נאמנות"];

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="border-outline-variant bg-surface-lowest shadow-ambient-lg relative w-full max-w-2xl overflow-hidden rounded-xl border p-8 text-center md:p-12">
        <div className="bg-primary/10 pointer-events-none absolute -end-32 -top-32 size-64 rounded-full blur-3xl" />

        <span className="bg-success-container text-success mx-auto mb-6 flex size-20 items-center justify-center rounded-full">
          <CheckCircleIcon className="size-10" />
        </span>

        <h1 className="text-on-surface mb-3 text-2xl font-semibold sm:text-3xl">
          {profileNames.length > 1 ? "החשבונות שלך נוצרו!" : "החשבון שלך נוצר!"}
        </h1>
        <p className="text-on-surface-variant mx-auto mb-8 max-w-lg leading-relaxed">
          {subject} {profileNames.length > 1 ? "נוצרו" : "נוצר"} בהצלחה. הפרטים נשלחו לאימות צוות
          שותפים — בינתיים אפשר להיכנס לאזור האישי ולהתחיל.
        </p>

        {roleKeys.length > 1 && (
          <div className="border-outline-variant bg-surface-low/60 relative my-8 space-y-5 rounded-xl border p-6 text-start">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-on-surface flex items-center gap-2 text-sm font-semibold">
                <SwapIcon className="text-tertiary size-5" />
                כיצד תנווט בין החשבונות שלך?
              </h2>
              <span className="bg-success-container text-success rounded-full px-2.5 py-1 text-xs font-semibold">
                חשבון משותף פעיל
              </span>
            </div>

            <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex w-full gap-2 rounded-lg border p-1.5">
              {roleKeys.map((r) => (
                <span
                  key={r}
                  className={
                    r === user.activeRole
                      ? "bg-primary text-on-primary flex-1 rounded px-4 py-2.5 text-center text-sm font-medium"
                      : "text-on-surface-variant flex-1 rounded px-4 py-2.5 text-center text-sm font-medium"
                  }
                >
                  {ROLE_META[r].emoji} {ROLE_META[r].label}
                </span>
              ))}
            </div>

            <p className="text-on-surface-variant border-primary/20 border-e-2 pe-2 text-sm leading-relaxed">
              תוכל להחליף מצב בכל שלב מתוך סרגל הניווט העליון כדי לעבור בין ניהול בריפים ותקציבים
              לבין צפייה במשימות ובארנק המשיכות.
            </p>
          </div>
        )}

        {roleKeys.includes("creator") && (
          <div className="border-primary/20 bg-primary/5 relative mb-8 space-y-4 rounded-xl border p-6 text-start">
            <h2 className="text-on-surface flex items-center gap-2 text-sm font-semibold">
              <ShareIcon className="text-primary size-5" />
              חבר את הערוצים שלך
            </h2>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              הממשק מושך את נתוני הערוץ (עוקבים, צפיות, מעורבות) ישירות מהפלטפורמה כדי להציג אותם
              כ״מאומת״ למפרסמים. לפני כל חיבור יש לאשר את תיבת ההסכמה. אפשר גם בהמשך, מתוך הגדרות ←
              ערוצי סושיאל.
            </p>
            <SocialConnectGrid connections={socialConnections} />
          </div>
        )}

        <div className="mb-10 flex flex-wrap justify-center gap-4">
          {checklist.map((item) => (
            <span
              key={item}
              className="border-outline-variant/50 bg-surface text-on-surface flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium whitespace-nowrap"
            >
              <CheckIcon className="text-success size-4" />
              {item}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="bg-primary text-on-primary shadow-ambient-lg hover:bg-primary-hover flex h-14 items-center justify-center gap-2 rounded-lg text-lg font-semibold transition-colors"
          >
            כניסה לדשבורד הראשי
            <ArrowIcon className="size-5" />
          </Link>
          <Link
            href="/how-it-works"
            className="text-on-surface-variant hover:text-on-surface flex h-12 items-center justify-center rounded-lg text-sm font-medium transition-colors"
          >
            איך המערכת עובדת — סקירה קצרה
          </Link>
        </div>
      </div>
    </main>
  );
}
