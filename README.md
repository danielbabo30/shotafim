# שותפים

מערכת משולבת: אתר תדמית + אינדקס ציבורי ואזור אישי מוגן — בפרויקט Next.js אחד, עם CMS מובנה לניהול תוכן.

## סטאק

| שכבה        | טכנולוגיה                                      |
| ----------- | --------------------------------------------- |
| Framework   | Next.js 16 (App Router, TypeScript)           |
| עיצוב       | Tailwind CSS v4, RTL, פונטים Assistant + Heebo |
| CMS         | Payload 3 (פאנל ניהול ב-`/admin`)              |
| בסיס נתונים | PostgreSQL (Neon) — schema `public` ל-Prisma, `payload` ל-CMS |
| ORM         | Prisma 6 (אפליקציה) · Drizzle דרך Payload (CMS) |
| אימות       | Auth.js v5 (NextAuth) + Prisma Adapter        |
| Deploy      | Vercel (מתוכנן)                               |

## דרישות מקדימות — חשוב

- **Node.js 20.18.3 בדיוק** (`nvm install 20.18.3 && nvm alias default 20.18.3`).
  לא גרסה חדשה יותר: ה-CLI של Payload נשבר על Node ≥ 20.19.
- **npm** (לא pnpm — pnpm 11 דורש Node ≥ 22.13 שמתנגש עם Payload).
- חשבון Neon (מסלול חינם).

## התקנה

```bash
npm install
cp .env.example .env
```

מלא ב-`.env`:

1. `DATABASE_URL` + `DIRECT_URL` — מ-Neon (pooler / חיבור ישיר).
2. `AUTH_SECRET`, `PAYLOAD_SECRET` — כבר נוצרו. חדש: `openssl rand -base64 33`
3. ספק כניסה אחד (אופציונלי כרגע): `AUTH_GOOGLE_ID`+`AUTH_GOOGLE_SECRET` או `AUTH_RESEND_KEY`+`EMAIL_FROM`.

הפעלה:

```bash
npm run dev
```

- אתר: http://localhost:3000
- פאנל ניהול: http://localhost:3000/admin — בכניסה ראשונה יוצרים משתמש CMS.
- זריעת תוכן CMS (לוגו + הגדרות + תפריט + קטגוריות דומיין): פתח `http://localhost:3000/dev/seed` פעם אחת.
- זריעת נתוני עזר של Prisma (טבלת `City` — ~190 יישובים): `npm run db:seed`.
- סטייל גайד: http://localhost:3000/style-guide

> ה-Payload מריץ `push` אוטומטי לסכמת ה-DB בכל הרצת `npm run dev` (סביבת פיתוח).
> המיגרציה של Prisma: `npm run db:migrate`.
>
> **קטגוריות** (`categories`) מנוהלות ב-Payload — עריכה דרך `/admin`. **ערים** (`City`)
> מנוהלות בקוד (`prisma/seed/israel-localities.mjs`). טבלאות הקשר ב-Prisma שומרות
> `categorySlug` — הפניה רופפת ל-Payload, ללא FK חוצה-schema.

## סקריפטים

| פקודה              | פעולה                                  |
| ------------------ | -------------------------------------- |
| `npm run dev`      | שרת פיתוח (+ Payload)                  |
| `npm run build`    | בילד לפרודקשן                          |
| `npm run typecheck`| בדיקת טיפוסים                          |
| `npm run lint`     | ESLint                                 |
| `npm run format`   | Prettier                              |
| `npm run db:migrate` | מיגרציית Prisma (פיתוח)              |
| `npm run db:seed`  | זריעת נתוני עזר (טבלת `City` — ~190 יישובים) |
| `npm run db:studio`| Prisma Studio                         |

## מבנה

```
src/
  app/
    (frontend)/            # root layout: <html dir="rtl" lang="he">, פונטים
      (marketing)/         # ציבורי — בית, /explore, /guides, ... (revalidate 60ש')
      (app)/               # מוגן — /dashboard
      (auth)/sign-in/
      style-guide/         # רפרנס עיצוב פנימי
      dev/seed/            # route זריעה (פיתוח בלבד)
    (payload)/             # פאנל הניהול /admin + API של Payload (root layout נפרד)
    api/auth/[...nextauth]/
  payload.config.ts        # קונפיגורציית Payload
  collections/             # Media, Users (משתמשי CMS), Posts, Guides
  globals/                 # SiteSettings, MainNavigation
  payload-types.ts         # טיפוסים — מתוחזק ידנית (ה-CLI שבור, ראה למטה)
  components/
    ui/                    # Button, Container
    marketing/             # SiteHeader, SiteFooter, SiteNav, Logo, ...
  lib/
    cms.ts                 # getShellData() — קריאת המעטפת מ-CMS + ברירות מחדל
    cms-defaults.ts        # ברירות מחדל + ערכי seed
    payload.ts, prisma.ts, auth-helpers.ts, cn.ts
  seed/                    # seed.ts + default-logo.jpeg
prisma/schema.prisma       # אימות (Auth.js) + מודל הדומיין: פרופילים, קמפיינים, חוזים, Escrow, מחלוקות
```

### ניהול תוכן המעטפת

הכל דרך `/admin` → "עיצוב האתר":

- **הגדרות אתר** — לוגו (ניתן להחלפה), שם אתר, קישורי כניסה/הרשמה/איזור-אישי + הטקסטים שלהם, עמודות ה-footer, ניוזלטר, קישורים משפטיים.
- **תפריט ניווט ראשי** — הוספה/הסרה/סידור מחדש של פריטים, כולל תפריטים נפתחים.

הרכיבים `SiteHeader`/`SiteFooter` קוראים מ-`getShellData()`; אם ה-CMS ריק — נופלים לברירות המחדל ב-`src/lib/cms-defaults.ts`.

### הגנת נתיבים

1. `src/proxy.ts` — בדיקה אופטימית לפי עוגיית session (`/admin` ו-`/api` פטורים).
2. `src/app/(frontend)/(app)/layout.tsx` — אימות אמיתי מול ה-DB דרך `auth()`.

## מגבלות ידועות / חוב טכני

- **ה-CLI של Payload שבור** על Node מודרני (`payload generate:types` וכו' → `ERR_REQUIRE_ESM`).
  עוקפים: `next dev` טוען את הקונפיג דרך Turbopack ומריץ push + מייצר importMap;
  `src/payload-types.ts` מתוחזק ידנית. לבדוק שוב כשתצא גרסה מתוקנת.
- ISR של 60ש' על המעטפת — שינוי ב-CMS מופיע תוך דקה. אפשר לשדרג ל-on-demand
  revalidation דרך hook ב-Payload (חסום כרגע ע"י שינויי caching ב-Next 16).
- אחסון קבצים: מקומי (`media/`). בפרודקשן — לעבור ל-S3/R2.
- אזהרת SSL של `pg` (`sslmode=require`) — לא חוסם, deprecation לגרסה עתידית.

## שלבים הבאים

- מעבר עמוד-עמוד על עץ האתר (בית → how-it-works → solutions → ...).
- מודל הנתונים העסקי — ✅ הוקם ב-`prisma/schema.prisma` (מיגרציה `partner_domain_models`). לוגיקת הזרימות (onboarding, קמפיינים, חוזים) — בבנייה.
- שכבת הכספים (Escrow/PSP/ledger) — הטבלאות קיימות; מעברי סטטוס ידניים/אדמין עד חיבור PSP + API חשבוניות.
