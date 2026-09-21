import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { getMyAdSpaces } from "@/lib/my-ad-spaces";
import { MyAssetsList } from "@/components/app/ad-spaces/my-assets-list";
import { CalendarIcon, PlusIcon } from "@/components/marketing/icons";

export const metadata: Metadata = { title: "שטחי הפרסום שלי" };

export default async function MyAdSpacesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("space")) redirect("/dashboard");

  const [data, { created, updated }] = await Promise.all([getMyAdSpaces(), searchParams]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-on-surface text-2xl font-bold">שטחי הפרסום שלי</h1>
          <p className="text-on-surface-variant mt-1 max-w-2xl text-sm leading-relaxed">
            קטלוג נכסי המדיה שלך — מסכים, שלטי חוצות, תחבורה, ניוזלטרים ופודקאסטים — עם סטטוס תפוסה
            והשיבוץ הפעיל של כל שטח.
          </p>
        </div>
        {data.hasProfile && (
          <div className="flex flex-wrap gap-2">
            {data.assets.length > 0 && (
              <Link
                href="/dashboard/bookings"
                className="border-outline-variant text-on-surface hover:bg-surface-container hover:border-outline inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors"
              >
                <CalendarIcon className="size-4" />
                ניהול לוז שטחי הפרסום
              </Link>
            )}
            <Link
              href="/dashboard/assets/new"
              className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors"
            >
              <PlusIcon className="size-4" />
              הוסף נכס פרסום חדש
            </Link>
          </div>
        )}
      </header>

      {(created || updated) && (
        <p className="border-success/30 bg-success-container text-success rounded-lg border px-4 py-3 text-sm font-medium">
          {created ? "הנכס נוסף לקטלוג." : "השינויים נשמרו."}
        </p>
      )}

      {!data.hasProfile ? (
        <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border p-6">
          <h2 className="text-on-surface text-lg font-bold">צריך קודם פרופיל בעל שטחים</h2>
          <p className="text-on-surface-variant mt-2 max-w-lg text-sm leading-relaxed">
            ניהול שטחי הפרסום נפתח לאחר השלמת פרופיל בעל השטחים ואימותו. מסך ההגדרה בבנייה.
          </p>
        </div>
      ) : data.assets.length === 0 ? (
        <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border border-dashed p-10 text-center">
          <h2 className="text-on-surface text-lg font-bold">עוד אין שטחי פרסום</h2>
          <p className="text-on-surface-variant mx-auto mt-2 max-w-md text-sm leading-relaxed">
            הוסיפו את נכס המדיה הראשון שלכם — מיקום, מפרט טכני ותמחור — כדי שמפרסמים יוכלו למצוא
            אותו ולשריין אותו ביומן.
          </p>
          <Link
            href="/dashboard/assets/new"
            className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm mt-6 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors"
          >
            <PlusIcon className="size-4" />
            הוספת נכס ראשון
          </Link>
        </div>
      ) : (
        <MyAssetsList assets={data.assets} />
      )}
    </div>
  );
}
