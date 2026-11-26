# פריסה ל-Google Cloud Run (תל אביב, me-west1)

מדריך צעד-צעד למי שאינו DevOps. **שום דבר במסמך הזה לא הורץ בפועל מול GCP** — הוא נכתב מראש. הפקודות ב-`gcloud` רצות מהמחשב שלך (או מ-Cloud Shell) אחרי שפתחת חשבון.

> כללי: במקום `PROJECT_ID`, `YOUR_DOMAIN` וכו' — הצב את הערכים שלך. אל תדביק סודות בצ'אט, בקוד או ב-git.

## 0. מה נבנה

```
דפדפן ──HTTPS──> Cloud Run (me-west1) ──> Neon Postgres (pooler)
                      │   └─> Cloud Storage (bucket פרטי: Media, תוצרי חוזים, תמונות פרופיל)
Cloud Scheduler ──GET + Bearer──> /api/cron/{monitor,reconcile,checkpoints}
Secret Manager ──> משתני סביבה של השירות
```

קבצים שנוספו לפרויקט: `Dockerfile`, `.dockerignore`/`.gcloudignore`, `deploy/gcp/cloud-scheduler.sh`, `deploy/gcp/cloudbuild-migrate.yaml`, `scripts/create-admin.mjs`, `src/app/api/health/route.ts`, דרייבר `gcs` ב-`src/lib/storage.ts`, תוסף `@payloadcms/storage-gcs` ב-`payload.config.ts`.

## 1. פתיחת פרויקט GCP

1. היכנס ל-https://console.cloud.google.com ופתח חשבון (חשבון חיוב נדרש גם לתקופת הניסיון).
2. צור פרויקט חדש (למשל `shutafim-prod`) ורשום את ה-**Project ID** (לא השם).
3. התקן את `gcloud` (https://cloud.google.com/sdk/docs/install) והרץ:

```bash
gcloud auth login
gcloud config set project PROJECT_ID
gcloud config set run/region me-west1
```

### תקציב והתראות חיוב — עשה את זה לפני כל דבר אחר

Console → Billing → Budgets & alerts → Create budget. הגדר סכום חודשי נמוך (למשל 50$) והתראות ב-50%, 90%, 100% למייל שלך.
**תקציב הוא התראה בלבד ולא עוצר חיוב.** כדי להגביל נזק: `max-instances` נמוך (למטה), ובדיקה שבועית של Billing → Reports בחודש הראשון.

## 2. הפעלת APIs

```bash
gcloud services enable \
  run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com \
  storage.googleapis.com cloudscheduler.googleapis.com cloudbuild.googleapis.com
```

## 3. Artifact Registry (מאגר תמונות)

```bash
gcloud artifacts repositories create shutafim --repository-format=docker --location=me-west1
```

## 4. Bucket פרטי ב-Cloud Storage

```bash
gcloud storage buckets create gs://BUCKET_NAME \
  --location=me-west1 \
  --uniform-bucket-level-access \
  --public-access-prevention
```

שם ה-bucket ייחודי גלובלית (למשל `shutafim-prod-files`). **אל תיתן לו גישה ציבורית.** האפליקציה מגישה קבצים דרך ה-routes שלה (`/api/contract-files/...`, `/api/profile-images/...`, `/api/media/file/...`) עם בדיקות ההרשאה וכותרות האבטחה הקיימות.

## 5. Service account בהרשאות מינימליות

```bash
gcloud iam service-accounts create shutafim-run --display-name="Shutafim Cloud Run"
SA="shutafim-run@PROJECT_ID.iam.gserviceaccount.com"

# קריאה/כתיבה/מחיקה של אובייקטים ב-bucket הזה בלבד (לא על כל הפרויקט)
gcloud storage buckets add-iam-policy-binding gs://BUCKET_NAME \
  --member="serviceAccount:$SA" --role="roles/storage.objectAdmin"

# קריאת סודות — מומלץ לתת פר-סוד (סעיף 6), לא על כל הפרויקט
```

אין ליצור/להוריד מפתח JSON. ב-Cloud Run האפליקציה מתחברת אוטומטית עם ה-service account (Application Default Credentials).

## 6. בסיס נתונים (Neon) ו-DATABASE_URL

1. ב-Neon צור פרויקט **באזור הקרוב ביותר** (למשל `aws-eu-central-1` פרנקפורט; ל-me-west1 אין אזור Neon — יש latency של עשרות ms לכל שאילתה, מקובל ל-POC).
2. העתק שתי מחרוזות חיבור:
   - `DATABASE_URL` — חיבור **pooler** (המארח כולל `-pooler`), עם `?sslmode=require&pgbouncer=true&connection_limit=1`. זה חיבור הריצה של Prisma.
   - `DIRECT_URL` — חיבור **ישיר** (בלי `-pooler`), עם `?sslmode=require`. משמש ל-`prisma migrate` **וגם** את Payload CMS בזמן ריצה (`payload.config.ts` מעדיף `DIRECT_URL`).
3. `schema.prisma` כבר מגדיר `url = env("DATABASE_URL")` ו-`directUrl = env("DIRECT_URL")` — לא צריך שינוי.

> זכור: Payload פותח pool משלו מול חיבור ישיר. עם `max-instances` נמוך (סעיף 9) מספר החיבורים הישירים נשאר קטן. אם תגדיל מופעים — עקוב אחרי מגבלת החיבורים של תוכנית ה-Neon.

### מיגרציות Prisma — `migrate deploy` בלבד

אף פעם לא `migrate dev` מול פרודקשן. `migrate deploy` רק מיישם מיגרציות קיימות מתיקיית `prisma/migrations`.

**הדרך הפשוטה (מהמחשב שלך), בכל פעם שיש מיגרציה חדשה לפני פריסה:**

```bash
source ~/.nvm/nvm.sh && nvm use
DATABASE_URL="<pooler>" DIRECT_URL="<direct>" npx prisma migrate deploy
```

(הדבק את המחרוזות בטרמינל בלבד; Prisma משתמש ב-`directUrl` למיגרציות.)

**חלופה — Cloud Run Job** (אוטומטי יותר, דורש סודות ב-Secret Manager מראש, סעיף 7):

```bash
gcloud builds submit --config deploy/gcp/cloudbuild-migrate.yaml \
  --substitutions=_IMAGE=me-west1-docker.pkg.dev/PROJECT_ID/shutafim/migrate:latest .

gcloud run jobs create shutafim-migrate \
  --image=me-west1-docker.pkg.dev/PROJECT_ID/shutafim/migrate:latest \
  --region=me-west1 --service-account=$SA \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest,DIRECT_URL=DIRECT_URL:latest
gcloud run jobs execute shutafim-migrate --region=me-west1 --wait
```

### סכמת Payload (CMS) — שים לב, זה לא אוטומטי

- ב-`payload.config.ts` יש `push: NODE_ENV === "development"` — **בפרודקשן Payload לא משנה סכמה**. אין לפרויקט מיגרציות Payload (ה-CLI שבור).
- לכן **לפני הפריסה הראשונה** (ולפני כל שינוי עתידי ב-collections/globals) מאתחלים את סכמת `payload` על בסיס הנתונים של הפרודקשן מהמחשב שלך: מריצים את שרת הפיתוח עם משתני הסביבה של הפרודקשן (ראה סעיף 11 — אותו סשן יוצר גם את אדמין ה-CMS הראשון וזורע תוכן).

## 7. סודות ב-Secret Manager

צור כל סוד בלי להציג אותו (הערך נוצר ונשלח ישירות ל-Secret Manager):

```bash
mk() { openssl rand -base64 "$2" | tr -d '\n' | gcloud secrets create "$1" --data-file=- --replication-policy=user-managed --locations=me-west1; }
mk AUTH_SECRET 33
mk PAYLOAD_SECRET 33
mk CRON_SECRET 33
mk TRACK_KEY_SECRET 32     # חייב להיות base64 של 32 בייטים בדיוק
mk OAUTH_TOKEN_SECRET 32   # כנ"ל
```

סודות שמגיעים מגורם חיצוני (DATABASE_URL, DIRECT_URL, AUTH_GOOGLE_SECRET, AUTH_RESEND_KEY, YOUTUBE_OAUTH_CLIENT_SECRET, FACEBOOK_OAUTH_CLIENT_SECRET) — הדבק מהלוח בלי להדפיס:

```bash
pbpaste | tr -d '\n' | gcloud secrets create DATABASE_URL --data-file=- --replication-policy=user-managed --locations=me-west1
```

הרשאת קריאה ל-service account, פר-סוד (חזור לכל סוד):

```bash
gcloud secrets add-iam-policy-binding AUTH_SECRET \
  --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor"
```

> **אזהרה:** אחרי שיצרת `TRACK_KEY_SECRET`/`OAUTH_TOKEN_SECRET` ויש נתונים מוצפנים — אסור להחליף אותם (הנתונים המוצפנים לא ייפתחו). גבה אותם במקום בטוח (מנהל סיסמאות).

## 8. טבלת משתני סביבה

מקור: `src/env.ts`, `.env.example`, `payload.config.ts`. "סוד" = Secret Manager; "רגיל" = `--set-env-vars`.

| משתנה | חובה? | סוג | הערות / איך מייצרים |
| --- | --- | --- | --- |
| `NODE_ENV` | — | רגיל | ה-Dockerfile מגדיר `production`. אל תשנה. חוסם `/dev/*` |
| `DATABASE_URL` | חובה | סוד | Neon pooler (`pgbouncer=true`) |
| `DIRECT_URL` | חובה | סוד | Neon חיבור ישיר; משמש גם את Payload |
| `AUTH_SECRET` | חובה (16+ תווים בפרוד') | סוד | `openssl rand -base64 33` |
| `AUTH_URL` | חובה בפרוד' | רגיל | כתובת האתר המלאה, `https://YOUR_DOMAIN` (בלי `/` בסוף). משמש גם ל-CSRF/CORS של Payload |
| `AUTH_TRUST_HOST` | מומלץ | רגיל | `true` (אחרי proxy של Cloud Run) |
| `PAYLOAD_SECRET` | חובה (16+) | סוד | `openssl rand -base64 33` |
| `CRON_SECRET` | חובה בפרוד' | סוד | בלעדיו ה-cron מחזיר 503. אותו ערך ל-Cloud Scheduler |
| `PAYMENTS_UI_ENABLED` | אופציונלי | רגיל | ברירת מחדל `true`. ב-POC (תשלום מחוץ למערכת) קבע `false`: מסתיר ומחסום בשרת הפקדה/שחרור/משיכה/חשבוניות/פיקדון. ראה `docs/spec/poc-mode-payments-flag.md` |
| `STORAGE_DRIVER` | חובה בפרוד' | רגיל | `gcs`. ברירת מחדל `local` (דיסק זמני — הקבצים יאבדו!) |
| `GCS_BUCKET` | חובה כש-`gcs` | רגיל | שם ה-bucket. האפליקציה נופלת בהפעלה אם חסר |
| `TRACK_KEY_SECRET` | חובה לתוסף WooCommerce | סוד | `openssl rand -base64 32` |
| `OAUTH_TOKEN_SECRET` | חובה לחיבור רשתות | סוד | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | אופציונלי (נדרש לכניסת Google) | רגיל / סוד | Google Cloud Console → Credentials. Redirect: `https://YOUR_DOMAIN/api/auth/callback/google` |
| `AUTH_RESEND_KEY` / `EMAIL_FROM` | אופציונלי (נדרש לכניסה במייל) | סוד / רגיל | Resend; דומיין השולח חייב להיות מאומת |
| `YOUTUBE_OAUTH_CLIENT_ID` / `_SECRET` | אופציונלי | רגיל / סוד | Redirect: `https://YOUR_DOMAIN/api/connect/youtube/callback` |
| `FACEBOOK_OAUTH_CLIENT_ID` / `_SECRET` / `FACEBOOK_LOGIN_CONFIG_ID` | אופציונלי | רגיל / סוד / רגיל | Redirect: `https://YOUR_DOMAIN/api/connect/facebook/callback` |
| `NEXT_OUTPUT` | — | בילד בלבד | ה-Dockerfile מגדיר `standalone`; לא צריך בריצה |
| `PORT`, `HOSTNAME` | — | Cloud Run | `PORT` מוזרק ע"י Cloud Run; `HOSTNAME=0.0.0.0` ב-Dockerfile |

אין משתני `NEXT_PUBLIC_*` בפרויקט כרגע — אין מה להגדיר בבילד.

**סדר נכון ל-`AUTH_URL`:** הדומיין הסופי צריך להיות ידוע לפני הפריסה הראשונה (או לפרוס עם כתובת `*.run.app`, ואז לעדכן ולפרוס מחדש אחרי חיבור הדומיין).

## 9. בילד ופריסה

אחרי שסעיפים 1-7 הושלמו, ו**אחרי סעיף 11 (אתחול CMS)**:

```bash
gcloud run deploy shutafim \
  --source . \
  --region me-west1 \
  --service-account "$SA" \
  --allow-unauthenticated \
  --memory 2Gi --cpu 1 \
  --min-instances 1 --max-instances 3 \
  --concurrency 40 \
  --timeout 120 \
  --port 8080 \
  --startup-probe httpGet.path=/api/health \
  --set-env-vars "AUTH_URL=https://YOUR_DOMAIN,AUTH_TRUST_HOST=true,STORAGE_DRIVER=gcs,GCS_BUCKET=BUCKET_NAME,EMAIL_FROM=you@yourdomain" \
  --set-secrets "AUTH_SECRET=AUTH_SECRET:latest,PAYLOAD_SECRET=PAYLOAD_SECRET:latest,CRON_SECRET=CRON_SECRET:latest,DATABASE_URL=DATABASE_URL:latest,DIRECT_URL=DIRECT_URL:latest,TRACK_KEY_SECRET=TRACK_KEY_SECRET:latest,OAUTH_TOKEN_SECRET=OAUTH_TOKEN_SECRET:latest"
```

הוסף ל-`--set-secrets` את סודות Google / Resend / YouTube / Facebook לפי הצורך. `--source .` בונה בענן עם ה-`Dockerfile` (Cloud Build) — יידרש אישור ליצירת מאגר אם עדיין אין.

הגדרות ל-POC ולמה:
- **2Gi / 1 CPU:** Next + Payload + sharp זקוקים לזיכרון; 512Mi יקרוס.
- **min-instances 1:** מונע cold start איטי (כמה שניות) ומשאיר את ה-rate limit בזיכרון יציב יותר; עולה כמה עשרות $ לחודש. אפשר 0 לחיסכון, עם cold start.
- **max-instances 3:** תקרת עלות והגנה מפני מתקפת עומס. מעלים בהדרגה.
- **concurrency 40:** מתאים ל-1 CPU. **timeout 120s** מספיק; העלאות קבצים עד 50MB דרך server action — אם יש timeouts, העלה ל-300.
- **מגבלה:** Cloud Run מגביל גוף בקשה ל-32MB ב-HTTP/1; העלאת תוצרים עד 55MB (כפי שמוגדר ב-`serverActions.bodySizeLimit`) תיכשל מעל 32MB. לתוצרים גדולים נדרש direct-to-GCS (signed URL) — לא ממומש.

אחרי הפריסה: `curl https://<url>/api/health` אמור להחזיר `{"ok":true}`.

### חלופה — Cloud Build עם טריגר מ-GitHub
אחרי שיהיה repo ב-GitHub: Cloud Build → Triggers → חבר את הריפו, בנה עם ה-`Dockerfile` ודחוף ל-Artifact Registry, ואז `gcloud run deploy --image`. (לא הוגדר כאן.)

## 10. דומיין מותאם ו-HTTPS

```bash
gcloud beta run domain-mappings create --service shutafim --domain YOUR_DOMAIN --region me-west1
```

הפקודה מדפיסה רשומות DNS (A/AAAA או CNAME) להוסיף אצל ספק הדומיין. תעודת HTTPS מנוהלת מונפקת אוטומטית (עד כשעה). **domain mapping עשוי לא להיות זמין בכל אזור/בגרסת preview** — אם נכשל, חלופה: Load Balancer עם תעודה מנוהלת (מורכב ויקר יותר) או Firebase Hosting מול Cloud Run.

אחרי החיבור: עדכן `AUTH_URL` ל-`https://YOUR_DOMAIN` (`gcloud run services update shutafim --region me-west1 --update-env-vars AUTH_URL=...`) והוסף את ה-redirect URIs ב-Google/Meta/YouTube.

## 11. אתחול CMS ואדמינים — לפני שחושפים `/admin`

**סיכון:** ב-Payload, כל עוד אין משתמש CMS, `/admin` מציג "צור משתמש ראשון" לכל אחד. חייבים ליצור אותו לפני שהשירות נגיש לציבור.

### 11א. אדמין CMS ראשון + סכמת Payload + תוכן ראשוני (מהמחשב שלך)

1. התחבר ל-GCP עם ADC מקומי כדי שקבצי המדיה ייכתבו ל-bucket: `gcloud auth application-default login` (נותן לך גישה לכתיבה ל-bucket — ודא שיש לך `roles/storage.objectAdmin` עליו).
2. הרץ את שרת הפיתוח **מול הפרודקשן** — משתני shell גוברים על `.env`:

```bash
source ~/.nvm/nvm.sh && nvm use
DATABASE_URL="<pooler prod>" DIRECT_URL="<direct prod>" \
STORAGE_DRIVER=gcs GCS_BUCKET=BUCKET_NAME \
AUTH_URL=https://localhost:3000 \
npm run dev
```

   (עצור קודם את שרת הפיתוח הרגיל שלך, ואל תשתמש ב-`.env` של פיתוח.) הרצה זו מבצעת `push` ויוצרת את סכמת `payload` בבסיס הנתונים של הפרודקשן.
3. פתח https://localhost:3000/admin וצור את משתמש ה-CMS הראשון (הסיסמה מוקלדת רק בדפדפן — היא לא עוברת דרך סקריפטים).
4. זרע תוכן ברירת מחדל: `/dev/seed`, `/dev/sync-legal`, `/dev/sync-nav` (פעם אחת, לפי README). **אל תפעיל** `/dev/login` ו-`/dev/seed-*` האחרים — הם יוצרים משתמשי דמו ו-sessions בבסיס הפרודקשן.
5. עצור את השרת. מעכשיו `/admin` בפרודקשן מאובטח (המשתמש הראשון קיים; יצירה חופשית נחסמת).

> גם אחרי שינוי עתידי בסכמת CMS (שדה/collection חדש) יש לחזור על הרצת dev מול הפרודקשן כדי לדחוף את הסכמה, לפני פריסת הקוד החדש.

### 11ב. אדמין פלטפורמה (`User.roles` כולל `ADMIN`)

```bash
DATABASE_URL="<pooler prod>" DIRECT_URL="<direct prod>" node scripts/create-admin.mjs you@example.com
```

הסקריפט מקבל רק מייל, לא כותב ולא שומר סיסמאות, ובטוח להרצה חוזרת. אחר כך היכנס לאתר עם **אותו מייל** (קישור במייל דרך Resend, או Google עם מייל מאומת) — נדרש שאחד משני ספקי הכניסה מוגדר.

### 11ג. `/dev/*` חסום

כל ה-routes תחת `/dev/*` קוראים ל-`devRouteBlocked()` (`src/lib/dev-guard.ts`) שמחזיר 404 אלא אם `NODE_ENV === "development"` ו-לא Vercel. ב-Cloud Run `NODE_ENV=production` (נבדק: שרת standalone מקומי החזיר 404 ל-`/dev/login`). **ודא:** אחרי הפריסה `curl -i https://YOUR_DOMAIN/dev/login` מחזיר 404. ואל תגדיר `NODE_ENV=development` בשירות.

## 12. Cloud Scheduler (cron)

`vercel.json` נשאר בריפו אך אינו פועל מחוץ ל-Vercel. מיישמים אותו ב-Cloud Scheduler:

```bash
PROJECT_ID=PROJECT_ID SERVICE_URL=https://YOUR_DOMAIN ./deploy/gcp/cloud-scheduler.sh
```

יוצר 3 jobs (GET + `Authorization: Bearer`), אזור me-west1, שעון `Asia/Jerusalem`: monitor כל שעה, reconcile 03:15, checkpoints 03:30. ללא retries אוטומטיים (jobs פיננסיים). הערה: ה-routes קיימים כ-GET בלבד. הכותרת עם הסוד נשמרת בהגדרת ה-job; ברוטציית `CRON_SECRET` יש לעדכן את ה-jobs.

## 13. גיבויים ומעבר מתקופת ניסיון

- **Neon:** בדוק מה תוכנית ה-Free מעניקה (חלון point-in-time restore קצר מאוד). לפני הכנסת נתוני אמת — תוכנית בתשלום עם חלון שחזור ארוך יותר, וגם `pg_dump` תקופתי ידני לקובץ מוצפן (`pg_dump "<direct>" -Fc -f backup.dump`).
- **Cloud Storage:** הפעל Object Versioning (`gcloud storage buckets update gs://BUCKET_NAME --versioning`) להגנה ממחיקה בשוגג.
- **תקופת הניסיון של GCP:** כשהקרדיטים נגמרים או חולפים 90 יום, המשאבים עשויים להיעצר/להיחסם — אל תניח שהם ימשיכו לרוץ. שדרג לחשבון חיוב מלא מראש וודא שתקציב והתראות פעילים (סעיף 1).
- רשום מי יכול לגשת לפרויקט (IAM); הפעל 2FA על חשבון Google.

## 14. מה נבדק בפועל ומה לא

נבדק מקומית (Node 22.23.5): `npm run typecheck`, `lint`, `format`, `npm run build` (רגיל ועם `NEXT_OUTPUT=standalone`); הרצת `.next/standalone/server.js` עם `NODE_ENV=production`: `/api/health` החזיר 200 `{"ok":true}`, `/dev/login` 404, `/api/cron/monitor` עם סוד שגוי 401; `wp-plugin/dist` ומנוע Prisma נכללו בפלט.

**לא נבדק:** `docker build` (Docker לא מותקן — ה-Dockerfile לא הורץ מעולם); דרייבר GCS ותוסף `@payloadcms/storage-gcs` מול bucket אמיתי (רק קומפילציה/typecheck); Cloud Run, Scheduler, Secret Manager; חיבור ל-Neon אמיתי (שרת ה-standalone נבדק בלי DB, ו-`/admin` החזיר 500 כצפוי); ה-`prisma migrate deploy` מ-Job. צפה לתיקונים קטנים בפריסה ראשונה. נקודות סיכון ב-Dockerfile: מנוע Prisma ל-linux (נוצר בשלב ה-build על debian; `openssl` מותקן), ו-`sharp` (binary של linux מוריד אוטומטית ב-`npm ci`).

דפי CMS סטטיים נבנים בזמן ה-Docker build בלי DB עם ברירות המחדל, ומתרעננים מה-CMS בריצה (ISR, כפי שמוצג בפלט הבילד: revalidate 1m). בדוק אחרי הפריסה שדף הבית מציג תוכן מה-CMS.

## 15. מה עדיין לא מוכן לפרודקשן

- **Rate limit בזיכרון** (`src/lib/rate-limit.ts`): מוגבל לכל מופע בנפרד; עם יותר ממופע אחד המגבלות אינן משותפות ונאפסות בכל cold start. בגדילה — Redis (Upstash/Memorystore). Memorystore לא נגיש בלי VPC connector.
- **PSP / תשלומים:** שכבת הכספים (Escrow/Transaction/Invoice) פיקטיבית — מעברי סטטוס ידניים, חשבוניות `LOCAL_MOCK`. אין חיוב כספי אמיתי. **אל תשיק עם כסף אמיתי לפני חיבור PSP וייעוץ משפטי/רגולטורי.** קבצי חשבוניות (`pdfUrl`) מקומיים — לא נבדקו מול GCS.
- **הסכמה בתוסף WooCommerce** וניסוח משפטי: הסכמת משתמש בתוסף, ונוסח תקנון/פרטיות/עוגיות/נגישות (`/legal/*`) — כרגע טקסטי ברירת מחדל; נדרש עורך דין.
- **מיגרציות Payload:** אין. שינוי סכמת CMS דורש הרצת dev מול הפרודקשן (סעיף 11א) — שביר ולא ניתן לשחזור. מומלץ להקים מיגרציות Payload כשה-CLI יתוקן.
- **העלאות מעל 32MB** דרך server action נחסמות ע"י Cloud Run (סעיף 9).
- **CSP:** המדיניות המלאה עדיין Report-Only (`unsafe-inline`).
- **ניטור:** אין Sentry/התראות. לפחות הגדר Alerting על שגיאות 5xx ב-Cloud Monitoring; בדוק Cloud Logging אחרי כל פריסה.
- **Neon בחו"ל:** latency בין me-west1 ל-Neon (אירופה) — ראה סעיף 6. אם נדרש אחסון נתונים בישראל, יש לבחון Cloud SQL ב-me-west1 (הגירה, לא חלק מהתוכנית).
- **דרייבר ה-GCS** והחלפת סודות (`TRACK_KEY_SECRET`) — ראה אזהרות למעלה.
