#!/usr/bin/env bash
# ⚠️ לא להריץ אוטומטית. זהו מדריך פקודות — קרא, הגדר את המשתנים, והרץ ידנית רק אחרי שהשירות פרוס.
# מחליף את vercel.json (crons) ב-Cloud Scheduler. ה-routes הם GET ודורשים Authorization: Bearer <CRON_SECRET>.
#
# דרישות מוקדמות: Cloud Scheduler API + Secret Manager API מופעלים, והסוד CRON_SECRET קיים ב-Secret Manager
# (אותו ערך שמוזרק ל-Cloud Run). ראה docs/deploy/gcp-cloud-run.md.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?הגדר PROJECT_ID}"
REGION="me-west1"
SERVICE_URL="${SERVICE_URL:?הגדר SERVICE_URL, למשל https://shutafim-xxxx-zf.a.run.app (ללא / בסוף)}"
TZ_NAME="Asia/Jerusalem"

# הערך של CRON_SECRET נקרא מ-Secret Manager בזמן ההרצה (לא נשמר בקובץ ולא מודפס).
CRON_SECRET_VALUE="$(gcloud secrets versions access latest --secret=CRON_SECRET --project="$PROJECT_ID")"

create_job() { # name schedule path
  local name="$1" schedule="$2" path="$3"
  gcloud scheduler jobs create http "$name" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --schedule="$schedule" \
    --time-zone="$TZ_NAME" \
    --uri="${SERVICE_URL}${path}" \
    --http-method=GET \
    --headers="Authorization=Bearer ${CRON_SECRET_VALUE}" \
    --attempt-deadline=300s \
    --max-retry-attempts=0
}
# הערה: --max-retry-attempts=0 בכוונה — לא רוצים ניסיונות חוזרים אוטומטיים על jobs פיננסיים.
# הערה: הכותרת נשמרת בהגדרת ה-job ב-Scheduler (גלויה לבעלי הרשאת קריאה ל-jobs). אחרי רוטציה של
# CRON_SECRET יש להריץ `gcloud scheduler jobs update http ... --update-headers=...` לכל job.

create_job shutafim-cron-monitor     "0 * * * *"  "/api/cron/monitor"      # כל שעה
create_job shutafim-cron-reconcile   "15 3 * * *" "/api/cron/reconcile"    # 03:15 ישראל
create_job shutafim-cron-checkpoints "30 3 * * *" "/api/cron/checkpoints"  # 03:30 ישראל

echo "נוצרו 3 jobs. בדיקה ידנית: gcloud scheduler jobs run shutafim-cron-monitor --location=$REGION --project=$PROJECT_ID"
