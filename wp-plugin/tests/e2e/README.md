# e2e על WordPress מקומי (Playground) — בדיקות בלבד

קבצים: `wp-env/bp.json` (blueprint: WooCommerce + setup.php), `wp-env/mu/` (mu-plugins לבדיקה בלבד: sslverify=false, החדרת תקלות דרך `mode.txt`, כלי עזר), `db-read.mjs` (קריאה בלבד מ-Prisma), `wp-env/checkout.sh|ostatus.sh` (Store API / bulk status).
הרצה: ראו § "איך מרימים מחדש" ב-`docs/spec/qa/reports/PLUGIN-E2E-2026-11-26.md`. אין להעלות לפרודקשן: `e2e-tools.php` חושף פעולות ללא אימות.
