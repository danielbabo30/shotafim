import { getPluginConnections } from "@/lib/plugin-connection";
import { getMyPluginTermsConsent } from "@/lib/plugin-download-consent";
import { PluginDownloadCard } from "@/components/app/plugin/plugin-download-card";
import { StoreConnectPanel } from "@/components/app/plugin/store-connect-panel";

const STEPS = [
  "הורידו את קובץ ה-ZIP של התוסף מהכפתור למעלה.",
  "בחנות: תוספים ▸ הוסף תוסף ▸ העלה תוסף → בחרו את הקובץ והפעילו. דורש ש-WooCommerce יהיה פעיל.",
  "צרו קוד צימוד עבור כתובת החנות שלכם (בהמשך הסעיף).",
  "בחנות: WooCommerce ▸ BridgeAd → הדביקו את קוד הצימוד ולחצו “בדיקת חיבור”.",
  "מרגע זה כל קליק ורכישה דרך קישורי השיוך והקופונים של היוצרים נדגמים אוטומטית ומופיעים בחדר העבודה.",
];

/**
 * סקציית תוסף המעקב במסך ההגדרות של מפרסם: הורדה (עם אישור תקנון), שלבי התקנה וחיבור חנויות.
 * שרת בלבד — נתונים אמיתיים מ-Prisma דרך fetchers מסוננים למשתמש המחובר.
 */
export async function PluginSection() {
  const [data, consent] = await Promise.all([getPluginConnections(), getMyPluginTermsConsent()]);

  return (
    <section id="plugin" className="flex scroll-mt-24 flex-col gap-4">
      <div>
        <h2 className="text-on-surface text-lg font-bold">תוסף מעקב ל-WooCommerce</h2>
        <p className="text-on-surface-variant mt-1 max-w-2xl text-sm leading-relaxed">
          לשותפויות “תשלום פר רכישה” — התוסף מחבר את חנות ה-WooCommerce שלכם ל-BridgeAd ודוגם
          אוטומטית את המכירות שכל יוצר הביא. הנתונים מגיעים ישירות מהחנות ואינם ניתנים לעריכה.
        </p>
      </div>

      <PluginDownloadCard compact />
      {consent && (
        <p className="text-on-surface-variant -mt-2 text-xs">
          אישרת את תקנון ההורדה ב-
          {new Intl.DateTimeFormat("he-IL", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Jerusalem",
          }).format(consent.acceptedAt)}
        </p>
      )}

      {!data.hasBusiness ? (
        <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border p-6">
          <h3 className="text-on-surface text-base font-bold">צריך קודם פרופיל עסקי</h3>
          <p className="text-on-surface-variant mt-2 max-w-lg text-sm leading-relaxed">
            חיבור חנות ויצירת מפתח API נפתחים לאחר השלמת פרופיל העסק.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <h3 className="text-on-surface text-base font-bold">שלבי ההתקנה</h3>
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
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-on-surface text-base font-bold">החנויות המחוברות שלך</h3>
            <StoreConnectPanel stores={data.stores} />
          </div>

          <p className="border-outline-variant text-on-surface-variant rounded-lg border border-dashed p-4 text-xs leading-relaxed">
            אבטחה: קוד הצימוד מעניק לתוסף הרשאה לדווח מכירות בלבד. הסוד שבו נשמר אצלנו מוצפן, כל
            בקשה מהתוסף חתומה, ואפשר להחליף אותו בכל רגע. אם התוסף מפסיק לדווח בזמן שהקישור עדיין
            מקבל קליקים — היוצר והצוות מקבלים התראה.
          </p>
        </>
      )}
    </section>
  );
}
