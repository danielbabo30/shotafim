# דגל POC: `PAYMENTS_UI_ENABLED`

משתנה env בצד שרת (`src/env.ts` → `paymentsUiEnabled`; עזר: `src/lib/payments-gate.ts`, טקסטים בטוחים ל-client: `src/lib/payments-notice.ts`).
ברירת מחדל `true` (התנהגות פיתוח ללא שינוי). ב-POC: `false` — התשלום מתבצע מחוץ למערכת.
כל מצב שאינו `false`/`0`/`off`/`no` נחשב פעיל. הלוגיקה הפנימית (חישובים, טרנזקציות, cron) לא שונתה — רק gating בכניסה/בתצוגה.

## נחסם בשרת (מחזיר "פעולה זו אינה זמינה בשלב זה")
- `fundEscrow`, `approveAndRelease` — `src/lib/actions/contract-actions.ts`
- `fundPartnerDeposit`, `topUpPartnerDeposit`, `triggerPayoutCheckpoint` — `src/lib/actions/partner-actions.ts`
- `/dashboard/earnings`, `/dashboard/reports` — redirect ל-`/dashboard` (אין action משיכה בקוד; המסכים הם התצוגה היחידה).

## הוסתר בממשק
- ניווט: "הכנסות" (יוצר), "דוחות"/"דוחות מערכת" (מפרסם/אדמין) — `NavItem.payments`.
- דשבורד מפרסם: KPI נאמנות + יומן תנועות נאמנות. דשבורד יוצר: כפתור משיכה, KPI יתרה/נאמנות, שורת נאמנות בכרטיס חוזה, רמז כותרת. דשבורד בעל שטח: KPI נאמנות/משיכה, שורת נאמנות בכרטיס שידור.
- חדר חוזה: סכום נעול, כפתורי הפקדה ואישור-ושחרור, אבן דרך הפקדה (`EscrowPanel`); פיקדון/ניצול, כפתורי הפקדה/הטענה (`PartnerProgramPanel`); תחנות תשלום, אריח "עמלה ששולמה", אירועי פיקדון/תשלום ביומן.
- צ'יפ "חוזה פעיל בנאמנות" בהודעות; טקסטי נאמנות באשף קמפיין, רשימת חוזים וגילוי בריפים.
- במקום: "התשלום בשלב ה-POC מתבצע מחוץ למערכת" (חדר חוזה ושותפות, אשף קמפיין).

## נשאר פעיל
מעקב קליקים/הזמנות, אריחי עמלה ממתינה/מאושרת/בעצירה/שבוטלה (מידע בלבד), החלטות על הזמנות (`decideAttributedOrder`), שער 80% (בחירת המשך/עצור), חוזים, הודעות, תוצרים, בקשת תיקונים, `resolveDispute` (אדמין).

## Cron (לא שונו) — המלצה
- `checkpoints`: מעבד תחנות ומסמן הזמנות כ-PAID + יוצר Transaction מסוג COMMISSION_PAYOUT — "תשלום" פיקטיבי. מומלץ לכבות ב-Cloud Scheduler ב-POC.
- `reconcile`: מאשר עמלות PENDING בוגרות (APPROVED) ומחזיר יתרת פיקדון (רק לתוכניות עם `depositHoldId`). אישור העמלות שימושי למידע; אם אין פיקדון — ההחזר no-op. אפשר להשאיר, או לכבות אם רוצים סטטוסי עמלה סטטיים.
- `monitor`: לא כספי — להשאיר.

## סיכונים ידועים
- חוזה רגיל נשאר `AWAITING_ESCROW` ללא הפקדה → לא נהפך ל-`ACTIVE`, ו-`approveAndRelease` חסום: זרימת תוצרים לא תתקדם. ב-POC יש להשתמש בשותפות פר-רכישה.
- שותפות נשארת `PENDING_DEPOSIT` (הלינק/קופון "עולים לאוויר" רק ב-`ACTIVE`) — יש לוודא מול הגדרת POC (seed/אדמין) או להחליט על מעבר ידני.
- טפסי הגדרות עדיין אוספים פרטי בנק ("פרטי תשלום"); לא הוסתרו.

## הפעלת תוכנית שותפות ב-POC בלי פיקדון — `activatePartnerProgramForPoc`
קוד: `src/lib/actions/partner-actions.ts`; מסך: `/dashboard/admin/partner-programs` (אדמין; קישור "תוכניות שותפות" בניווט ניהול); טופס: `src/components/app/activate-poc-form.tsx`.

**מה עושה:** `PartnerProgram` PENDING_DEPOSIT -> ACTIVE, ו-`Contract` AWAITING_ESCROW -> ACTIVE (כמו `fundPartnerDeposit`, בלי כסף). הלינק והקופון "עולים לאוויר" (`recordClick`/`ingestOrder` דורשים ACTIVE/GATE_80).
**תנאים:** `requireAdmin()`; פועלת רק כש-`PAYMENTS_UI_ENABLED=false` (אחרת "פעולה זו אינה זמינה בשלב זה", והמסך מציג "הפעולה אינה זמינה בשלב זה" בלי כפתורים); idempotent (תוכנית שכבר ACTIVE מחזירה "כבר פעילה", סטטוס אחר -> שגיאה); כותבת `AuditLog` (`action="partnerProgram.activatedForPoc"`, `metadata.before/after/noDeposit`) באותה טרנזקציה.
**לא עושה:** לא יוצרת `EscrowHold`/`Transaction`/`Invoice`, לא קובעת `depositHoldId`, לא נוגעת בחישוב עמלה/אישור/תחנות.
**מה קורה בלי פיקדון (נבדק):** `applyDeposiDrain` מחשב אחוז 0 כש-`depositILS=0`, לכן שער 80%/השהיה ב-100% לא מופעלים; `drainedILS` עדיין מצטבר (אישור עמלה `20+2` -> `22`). `reconcile` מדלג על תוכניות בלי `depositHoldId` (גם לא סוגר אותן). `checkpoints` cron עדיין עלול ליצור "תשלום" פיקטיבי — להשאיר כבוי.
**שים לב:** קליטת הזמנה (`ingestOrder`) יוצרת `Transaction` מסוג `COMMISSION_ACCRUAL` (ביטול: `COMMISSION_REVERSAL`) — רישום חשבונאי של עמלה, לא תנועת כסף; זו הלוגיקה הקיימת ולא שונתה.
