@AGENTS.md

# שותפים / BridgeAd — כללי עבודה

מערכת משולבת (Next.js 16): אתר שיווקי מונע-CMS + אינדקס ציבורי + אזור אישי מוגן.
**Node 20.18.3 + npm** (לא גרסה חדשה יותר, לא pnpm — ראה README § "מגבלות ידועות").

## סביבה ובדיקות

- `npm run dev` — שרת פיתוח (טוען גם את Payload; מריץ push לסכמה)
- לפני סיום: `npm run typecheck && npm run lint` חייבים לעבור. `npm run format` לפרטייה.
- ה-CLI של Payload שבור — `src/payload-types.ts` מתוחזק **ידנית**, לעדכן בזהירות בכל שינוי סכמה.

## בניית עמודים — עמוד אחד בכל פעם

לכל עמוד המשתמש נותן: תמונת עיצוב + `DESIGN.md` + קובץ HTML (stitch export).

1. **קודם לבדוק מה קיים.** `src/components/ui/` ו-`src/components/marketing/`. אין לבנות מ-0 מה שכבר יש.
2. **ספריית סקשנים משותפת.** בלוק חוזר (Hero, FeatureGrid, RoleCards, CTA, FAQ, ...) → רכיב אחד ב-`src/components/marketing/` עם props, בשימוש חוזר. **אין copy-paste של סקשן בין עמודים.**
3. **Design tokens בלבד** — מ-`src/app/(frontend)/globals.css`. `bg-primary`, `text-on-surface`, `text-on-surface-variant`, `border-outline-variant`, `bg-surface-lowest`, `rounded-lg/xl`, `shadow-ambient/-lg`. **אף פעם לא hex או px גולמי לצבע.** (השם "Kinetic Ledger" ב-DESIGN.md הוא של התבנית — מתעלמים.)
4. **RTL — logical properties בלבד:** `ms-/me-/ps-/pe-/start-/end-/text-start/text-end`. אף פעם לא `ml-/pl-/left-/right-`.
5. **Server Components כברירת מחדל.** `"use client"` רק ל-state/effects/handlers, ואיים קטנים.
6. **תוכן שצריך להיות ניתן לעריכה → Payload** (collection/global), קריאה דרך fetcher עטוף ב-`cache()` תחת `src/lib/`, עם ברירות מחדל ב-`*-defaults.ts`. אחרת — תוכן סטטי בעמוד זה בסדר.
7. **תבנית קובץ עמוד:** `src/app/(frontend)/(marketing)/<path>/page.tsx` — `export const metadata`, default `async function`, גוף עטוף ב-`<Container>`. הראוטים תואמים 1:1 לעץ האתר.
8. **פונטים:** h1–h4 מקבלים `font-display` (Assistant) אוטומטית; גוף = Heebo.

## האזור האישי (`src/app/(frontend)/(app)/`) — נתונים אמיתיים בלבד

**כלל קבוע: אין STUB, אין PLACEHOLDER, אין נתוני-דמה. הכול מגיע מ-DB.**

1. **כל מסך / רשימה / כרטיס** קורא מ-Prisma דרך fetcher תחת `src/lib/`, עטוף ב-`cache()`, מסונן למשתמש המחובר (`requireActiveUser()` מ-`src/lib/app-user.ts`). אסור להחזיר מערך קבוע, `PLACEHOLDER`, או תגובת-דמה.
2. **אם הנתונים עדיין לא קיימים** — לזרוע אותם (route תחת `src/app/(frontend)/dev/` או `npm run db:seed`) או ליצור דרך הזרימה. לא "בינתיים נחזיר mock".
3. **Server actions כותבים ל-DB בפועל** — `prisma.*.create/update`, בטרנזקציה כשיש כמה טבלאות. אסור `revalidatePath` + `return { ok }` בלי write אמיתי. אסור `void user` עם `// TODO`.
4. **Guard לכל עמוד לפי תפקיד** — `requireActiveUser()` ואז בדיקת הרשאה דרך helper משותף (`roleKeys` / `activeRole`), `redirect("/dashboard")` אם אין. אותה בדיקה בכל עמוד, לא כל אחד ממציא.
5. קטגוריות דרך `src/lib/partner-categories-query.ts`; ערים דרך `src/lib/cities.ts`. תוויות קטגוריה = מ-Payload, לא hard-coded.

שכבת הכספים (Escrow/Transaction/Invoice) היא היחידה שמותר בה "פיקטיבי" מוגדר: מעברי סטטוס ידניים/אדמין עד חיבור PSP — אבל גם היא נכתבת ל-DB, לא mock.

## רכיבים קיימים

| רכיב | קובץ |
| --- | --- |
| `Button` (primary/ghost, md/lg; `<Link>`/`<button>` לפי `href`) | `src/components/ui/button.tsx` |
| `Container` (רוחב עמוד — תמיד להשתמש) | `src/components/ui/container.tsx` |
| `SiteHeader` / `SiteFooter` / `SiteNav` / `Logo` / `NewsletterForm` / `HeaderAuthActions` | `src/components/marketing/` |
| `cn()` | `src/lib/cn.ts` |
| `getShellData()` — קריאת מעטפת מ-CMS | `src/lib/cms.ts` |
| `ProseBlock` — רינדור בלוק גוף משותף (מאמרים + מדריכים) | `src/components/marketing/prose-blocks.tsx` |
| `ArticleToc` / `ArticleFeedback` (`subject` prop) — משותפים למאמר ולמדריך | `src/components/marketing/` |

תוכן ארוך (`posts`, `guides`): `body` = בלוקים, נורמליזציה ב-`src/lib/*-content.ts`, קריאה ב-`src/lib/{posts,guides}.ts` (עם `*-defaults.ts` כ-seed+fallback). בלוקי גוף משותפים: `src/collections/content-blocks.ts`.

## מבנה

`src/app/(frontend)/` — root layout של האתר · `(payload)/` — פאנל `/admin` · `src/collections/` + `src/globals/` — מודל ה-CMS.
