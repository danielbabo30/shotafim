import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/app-user";
import { getPluginConnections } from "@/lib/plugin-connection";
import { PluginDownloadCard } from "@/components/app/plugin/plugin-download-card";
import { StoreConnectPanel } from "@/components/app/plugin/store-connect-panel";

export const metadata: Metadata = { title: "התקנת תוסף המעקב" };

const STEPS = [
  "הורידו את קובץ ה-ZIP של התוסף מהכפתור למעלה.",
  "בחנות: תוספים ▸ הוסף תוסף ▸ העלה תוסף → בחרו את הקובץ והפעילו. דורש ש-WooCommerce יהיה פעיל.",
  "צרו קוד צימוד עבור כתובת החנות שלכם (בהמשך העמוד).",
  "בחנות: WooCommerce ▸ BridgeAd → הדביקו את קוד הצימוד ולחצו “בדיקת חיבור”.",
  "מרגע זה כל קליק ורכישה דרך קישורי השיוך והקופונים של היוצרים נדגמים אוטומטית ומופיעים בחדר העבודה.",
];

export default async function PluginPage() {
  const user = await requireActiveUser();
  if (!user.roleKeys.includes("brand")) redirect("/dashboard");

  const data = await getPluginConnections();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-on-surface text-2xl font-bold">התקנת תוסף המעקב</h1>
        <p className="text-on-surface-variant max-w-2xl text-sm leading-relaxed">
          לשותפויות “תשלום פר רכישה” — התוסף מחבר את חנות ה-WooCommerce שלכם ל-BridgeAd ודוגם
          אוטומטית את המכירות שכל יוצר הביא. הנתונים מגיעים ישירות מהחנות ואינם ניתנים לעריכה.
        </p>
      </header>

      <PluginDownloadCard compact />

      {!data.hasBusiness ? (
        <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border p-6">
          <h2 className="text-on-surface text-lg font-bold">צריך קודם פרופיל עסקי</h2>
          <p className="text-on-surface-variant mt-2 max-w-lg text-sm leading-relaxed">
            חיבור חנות ויצירת מפתח API נפתחים לאחר השלמת פרופיל העסק.
          </p>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-on-surface text-lg font-bold">שלבי ההתקנה</h2>
            <ol className="flex flex-col gap-2">
              {STEPS.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <span className="bg-primary-fixed text-on-primary-fixed grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-on-surface-variant">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-on-surface text-lg font-bold">החנויות המחוברות שלך</h2>
            <StoreConnectPanel stores={data.stores} />
          </section>

          <p className="border-outline-variant text-on-surface-variant rounded-lg border border-dashed p-4 text-xs leading-relaxed">
            אבטחה: קוד הצימוד מעניק לתוסף הרשאה לדווח מכירות בלבד. הסוד שבו נשמר אצלנו מוצפן, כל
            בקשה מהתוסף חתומה, ואפשר להחליף אותו בכל רגע. אם התוסף מפסיק לדווח בזמן שהקישור עדיין
            מקבל קליקים — היוצר והצוות מקבלים התראה.
          </p>
        </>
      )}
    </div>
  );
}
