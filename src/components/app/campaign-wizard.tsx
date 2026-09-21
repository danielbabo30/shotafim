"use client";

import { useActionState, useId, useMemo, useState, type ReactNode } from "react";
import {
  AttributionMode,
  CampaignTargetType,
  CommissionBasis,
  CommissionScope,
  CommissionType,
  type CompensationModel,
  type DeliverableType,
} from "@prisma/client";
import { cn } from "@/lib/cn";
import {
  CAMPAIGN_FORM_INITIAL,
  CAMPAIGN_TARGET_TYPES,
  DELIVERABLE_OPTIONS,
  deliverableLabel,
  targetTypeLabel,
} from "@/lib/campaign-brief";
import {
  ATTRIBUTION_MODE_LABEL,
  COMMISSION_BASIS_LABEL,
  COMMISSION_SCOPE_LABEL,
  COMMISSION_TYPE_LABEL,
  COMPENSATION_MODEL_OPTIONS,
  attributionModeHasCoupon,
} from "@/lib/partner-terms";
import { createCampaign } from "@/lib/actions/campaign-actions";
import { ShieldCheckIcon, CheckIcon } from "@/components/marketing/icons";

type StepId = 1 | 2 | 3;

/** באיזה שלב יושב כל שדה — לקפיצה אוטומטית לשגיאה הראשונה */
const FIELD_STEP: Record<string, StepId> = {
  targetType: 1,
  compensationModel: 1,
  title: 1,
  locationId: 1,
  description: 1,
  briefAssetsUrl: 1,
  deliverables: 2,
  totalBudgetILS: 2,
  endDate: 2,
  commissionType: 3,
  commissionValue: 3,
  commissionBasis: 3,
  commissionScope: 3,
  estimatedPurchases: 3,
  assumedAovILS: 3,
  attributionMode: 3,
  destinationUrl: 3,
  couponDiscountPct: 3,
  payoutCheckpoints: 3,
  startDate: 3,
};

const fieldClass =
  "w-full rounded-lg bg-surface-container px-3 py-3 text-base text-on-surface placeholder:text-on-surface-variant/70 " +
  "transition-colors outline-none focus:bg-surface-lowest focus:ring-2 focus:ring-primary";

function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="text-on-error-container mt-1.5 text-xs font-medium">{children}</p>;
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border p-6">
      <h2 className="text-on-surface mb-6 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

export function CampaignWizard({ locations }: { locations: { id: string; label: string }[] }) {
  const [state, formAction, isPending] = useActionState(createCampaign, CAMPAIGN_FORM_INITIAL);
  const [step, setStep] = useState<StepId>(1);
  const uid = useId();

  const [targetType, setTargetType] = useState<CampaignTargetType>(CampaignTargetType.CREATOR);
  const [compensationModel, setCompensationModel] = useState<CompensationModel>("FIXED_FEE");
  const isRevShare = compensationModel === "REVENUE_SHARE";
  const [title, setTitle] = useState("");
  const [locationId, setLocationId] = useState("");
  const [description, setDescription] = useState("");
  const [briefAssetsUrl, setBriefAssetsUrl] = useState("");
  const [deliverables, setDeliverables] = useState<Set<DeliverableType>>(new Set());
  const [budget, setBudget] = useState("");
  const [endDate, setEndDate] = useState("");

  // ── תנאי שותפות "תשלום פר רכישה" (רק כש-isRevShare) ──
  const [commissionType, setCommissionType] = useState<CommissionType>("PERCENT");
  const [commissionValue, setCommissionValue] = useState("");
  const [commissionBasis, setCommissionBasis] = useState<CommissionBasis>("PRE_DISCOUNT");
  const [commissionScope, setCommissionScope] = useState<CommissionScope>("PRODUCT_ONLY");
  const [estimatedPurchases, setEstimatedPurchases] = useState("");
  const [assumedAov, setAssumedAov] = useState("");
  const [attributionMode, setAttributionMode] = useState<AttributionMode>("LINK_AND_COUPON");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [couponDiscountPct, setCouponDiscountPct] = useState("");
  const [partnerStart, setPartnerStart] = useState("");
  const [partnerEnd, setPartnerEnd] = useState("");
  const [interimCheckpoint, setInterimCheckpoint] = useState("");

  const STEPS: { id: StepId; label: string }[] = [
    { id: 1, label: "הגדרות בסיס" },
    { id: 2, label: isRevShare ? "תוצרים" : "תוצרים ותקציב" },
    { id: 3, label: isRevShare ? "תנאי שותפות" : "הפקדת Escrow" },
  ];

  const [stepError, setStepError] = useState<string | null>(null);
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  /** אילו שלבים מכילים שגיאת שדה שהשרת החזיר — לסימון ב-stepper */
  const stepsWithErrors = new Set<StepId>(Object.keys(fieldErrors).map((k) => FIELD_STEP[k] ?? 3));

  const toggleDeliverable = (value: DeliverableType) => {
    setDeliverables((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const goNext = () => {
    if (step === 1 && title.trim().length < 2) {
      setStepError("יש להזין כותרת לבריף כדי להמשיך.");
      return;
    }
    setStepError(null);
    setStep((s) => (s < 3 ? ((s + 1) as StepId) : s));
  };

  const goTo = (target: StepId) => {
    setStepError(null);
    setStep(target);
  };

  const selectedDeliverables = useMemo(
    () => DELIVERABLE_OPTIONS.filter((o) => deliverables.has(o.value)),
    [deliverables],
  );

  const budgetPreview = useMemo(() => {
    const n = Number(budget);
    if (!budget || Number.isNaN(n) || n <= 0) return "טרם הוגדר";
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    }).format(n);
  }, [budget]);

  return (
    <form
      action={formAction}
      // ולידציית הדפדפן מכבה — השדות חיים בפאנלים עם hidden, ושדה לא-תקין
      // ב-hidden חוסם submit בלי משוב. הולידציה נעשית ב-zod (campaignFormSchema).
      noValidate
      onKeyDown={(e) => {
        if (e.key === "Enter" && step !== 3 && (e.target as HTMLElement).tagName !== "TEXTAREA") {
          e.preventDefault();
        }
      }}
      className="flex flex-col gap-8"
    >
      {/* ── Stepper ── */}
      <ol className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-medium">
        {STEPS.map((s, i) => {
          const isActive = s.id === step;
          const isDone = s.id < step;
          const hasError = stepsWithErrors.has(s.id);
          return (
            <li key={s.id} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => goTo(s.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-1 py-1 transition-colors",
                  hasError
                    ? "text-on-error-container font-bold"
                    : isActive
                      ? "text-primary font-bold"
                      : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full text-sm",
                    hasError
                      ? "bg-error-container text-on-error-container"
                      : isActive
                        ? "bg-primary text-on-primary"
                        : isDone
                          ? "bg-primary-fixed text-on-primary-fixed"
                          : "bg-surface-high text-on-surface-variant",
                  )}
                >
                  {hasError ? "!" : isDone ? <CheckIcon className="size-4" /> : s.id}
                </span>
                <span>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <span className="bg-outline-variant hidden h-px w-10 sm:block" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="border-on-error-container/25 bg-error-container text-on-error-container rounded-lg border px-4 py-3 text-sm font-medium"
        >
          {state.message}
        </p>
      )}

      {/* ─────────── שלב 1 ─────────── */}
      <div hidden={step !== 1} className="flex flex-col gap-8">
        <SectionCard title="סוג יעד הקמפיין">
          <div className="grid gap-4 md:grid-cols-3">
            {CAMPAIGN_TARGET_TYPES.map((option) => {
              const checked = targetType === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-all",
                    checked
                      ? "border-primary bg-surface-low ring-primary ring-1"
                      : "border-outline-variant bg-surface-lowest hover:border-primary hover:bg-surface-low",
                  )}
                >
                  <input
                    type="radio"
                    name="targetType"
                    value={option.value}
                    checked={checked}
                    onChange={() => setTargetType(option.value)}
                    className="sr-only"
                  />
                  {checked && (
                    <span className="text-primary absolute end-4 top-4">
                      <CheckIcon className="size-5" />
                    </span>
                  )}
                  <span className="text-on-surface pe-6 text-sm font-bold">{option.title}</span>
                  <span className="text-on-surface-variant text-xs leading-relaxed">
                    {option.description}
                  </span>
                </label>
              );
            })}
          </div>
          <FieldError>{fieldErrors.targetType}</FieldError>
        </SectionCard>

        <SectionCard title="מודל התגמול">
          <div className="grid gap-4 md:grid-cols-3">
            {COMPENSATION_MODEL_OPTIONS.map((option) => {
              const checked = compensationModel === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "relative flex flex-col gap-1 rounded-lg border p-4 transition-all",
                    option.available ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                    checked
                      ? "border-primary bg-surface-low ring-primary ring-1"
                      : "border-outline-variant bg-surface-lowest hover:border-primary hover:bg-surface-low",
                  )}
                >
                  <input
                    type="radio"
                    name="compensationModel"
                    value={option.value}
                    checked={checked}
                    disabled={!option.available}
                    onChange={() => setCompensationModel(option.value)}
                    className="sr-only"
                  />
                  {checked && (
                    <span className="text-primary absolute end-4 top-4">
                      <CheckIcon className="size-5" />
                    </span>
                  )}
                  <span className="text-on-surface pe-6 text-sm font-bold">{option.title}</span>
                  <span className="text-on-surface-variant text-xs leading-relaxed">
                    {option.description}
                  </span>
                </label>
              );
            })}
          </div>
          {isRevShare && (
            <p className="text-on-surface-variant mt-3 text-xs leading-relaxed">
              דורש חנות WooCommerce עם תוסף המעקב של BridgeAd. הפיקדון נגזר מתנאי השותפות ומופקד
              לאחר אישור הצעת יוצר.
            </p>
          )}
          <FieldError>{fieldErrors.compensationModel}</FieldError>
        </SectionCard>

        <SectionCard title="פרטי הבריף והמותג">
          <div className="flex flex-col gap-6">
            <div>
              <label
                htmlFor={`${uid}-title`}
                className="text-on-surface mb-2 block text-sm font-medium"
              >
                כותרת הבריף
              </label>
              <input
                id={`${uid}-title`}
                name="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="לדוגמה: יוצרי קולינריה להשקת סניף חדש בנמל תל אביב"
                className={fieldClass}
              />
              <FieldError>{fieldErrors.title}</FieldError>
            </div>

            <div>
              <label
                htmlFor={`${uid}-loc`}
                className="text-on-surface mb-2 block text-sm font-medium"
              >
                בחירת סניף רלוונטי{" "}
                <span className="text-on-surface-variant font-normal">(לא חובה)</span>
              </label>
              <select
                id={`${uid}-loc`}
                name="locationId"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className={fieldClass}
                disabled={locations.length === 0}
              >
                <option value="">
                  {locations.length === 0 ? "אין סניפים מוגדרים" : "בחרו סניף"}
                </option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.label}
                  </option>
                ))}
              </select>
              <FieldError>{fieldErrors.locationId}</FieldError>
            </div>

            <div>
              <label
                htmlFor={`${uid}-desc`}
                className="text-on-surface mb-2 block text-sm font-medium"
              >
                תיאור הבריף ומטרות
              </label>
              <textarea
                id={`${uid}-desc`}
                name="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="תארו את מטרת הקמפיין, המסר המרכזי והציפיות מיוצר התוכן…"
                className={cn(fieldClass, "resize-y")}
              />
              <FieldError>{fieldErrors.description}</FieldError>
            </div>

            <div>
              <label
                htmlFor={`${uid}-assets`}
                className="text-on-surface mb-2 block text-sm font-medium"
              >
                קישור לחומרי גלם{" "}
                <span className="text-on-surface-variant font-normal">(לא חובה)</span>
              </label>
              <input
                id={`${uid}-assets`}
                name="briefAssetsUrl"
                type="url"
                dir="ltr"
                value={briefAssetsUrl}
                onChange={(e) => setBriefAssetsUrl(e.target.value)}
                placeholder="https://"
                className={cn(fieldClass, "text-start")}
              />
              <FieldError>{fieldErrors.briefAssetsUrl}</FieldError>
            </div>

            <label className="border-outline-variant bg-surface-container flex items-start gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                name="hasPhysicalProduct"
                className="accent-primary mt-0.5 size-4 rounded"
              />
              <span className="text-sm">
                <span className="text-on-surface font-medium">
                  הקמפיין כולל מוצר פיזי שנשלח ליוצר
                </span>
                <span className="text-on-surface-variant mt-0.5 block text-xs">
                  לאחר אישור ההצעה, היוצר יתבקש לספק כתובת משלוח בחדר העבודה.
                </span>
              </span>
            </label>
          </div>
        </SectionCard>
      </div>

      {/* ─────────── שלב 2 ─────────── */}
      <div hidden={step !== 2} className="flex flex-col gap-8">
        <SectionCard title="תוצרים ותקציב">
          <div className="flex flex-col gap-6">
            <div>
              <span className="text-on-surface mb-2 block text-sm font-medium">תוצרים מבוקשים</span>
              <div className="flex flex-wrap gap-2">
                {DELIVERABLE_OPTIONS.map((option) => {
                  const checked = deliverables.has(option.value);
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                        checked
                          ? "bg-primary-container text-on-primary-container"
                          : "border-outline-variant text-on-surface-variant hover:bg-surface-container border",
                      )}
                    >
                      <input
                        type="checkbox"
                        name="deliverables"
                        value={option.value}
                        checked={checked}
                        onChange={() => toggleDeliverable(option.value)}
                        className="sr-only"
                      />
                      {checked && <CheckIcon className="size-3.5" />}
                      {option.label}
                    </label>
                  );
                })}
              </div>
              <FieldError>{fieldErrors.deliverables}</FieldError>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div hidden={isRevShare}>
                <label
                  htmlFor={`${uid}-budget`}
                  className="text-on-surface mb-2 block text-sm font-medium"
                >
                  תקציב כולל לקמפיין (₪)
                </label>
                <input
                  id={`${uid}-budget`}
                  name="totalBudgetILS"
                  type="number"
                  min={0}
                  step={100}
                  inputMode="numeric"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0"
                  className={fieldClass}
                />
                <FieldError>{fieldErrors.totalBudgetILS}</FieldError>
              </div>
              <div>
                <label
                  htmlFor={`${uid}-end`}
                  className="text-on-surface mb-2 block text-sm font-medium"
                >
                  מועד סיום מבוקש{" "}
                  <span className="text-on-surface-variant font-normal">(לא חובה)</span>
                </label>
                <input
                  id={`${uid}-end`}
                  name="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={fieldClass}
                />
                <FieldError>{fieldErrors.endDate}</FieldError>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ─────────── שלב 3 ─────────── */}
      <div hidden={step !== 3} className="flex flex-col gap-8">
        <SectionCard title="סיכום הבריף">
          <dl className="divide-outline-variant grid divide-y text-sm">
            <SummaryRow term="סוג יעד" detail={targetTypeLabel(targetType)} />
            <SummaryRow
              term="מודל תגמול"
              detail={
                COMPENSATION_MODEL_OPTIONS.find((o) => o.value === compensationModel)?.title ?? "—"
              }
            />
            <SummaryRow term="כותרת" detail={title.trim() || "—"} />
            <SummaryRow
              term="תוצרים"
              detail={
                selectedDeliverables.length
                  ? selectedDeliverables.map((d) => deliverableLabel(d.value)).join(", ")
                  : "—"
              }
            />
            {!isRevShare && <SummaryRow term="תקציב" detail={budgetPreview} />}
            <SummaryRow
              term="מועד סיום"
              detail={
                endDate
                  ? new Intl.DateTimeFormat("he-IL", { dateStyle: "long" }).format(
                      new Date(endDate),
                    )
                  : "לא הוגדר"
              }
            />
          </dl>
        </SectionCard>

        {isRevShare ? (
          <>
            <SectionCard title="תנאי השותפות">
              <div className="flex flex-col gap-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-on-surface mb-2 block text-sm font-medium">
                      סוג עמלה
                    </label>
                    <select
                      name="commissionType"
                      value={commissionType}
                      onChange={(e) => setCommissionType(e.target.value as CommissionType)}
                      className={fieldClass}
                    >
                      {Object.values(CommissionType).map((t) => (
                        <option key={t} value={t}>
                          {COMMISSION_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`${uid}-cv`}
                      className="text-on-surface mb-2 block text-sm font-medium"
                    >
                      {commissionType === "PERCENT" ? "אחוז מהרכישה (%)" : "סכום קבוע לרכישה (₪)"}
                    </label>
                    <input
                      id={`${uid}-cv`}
                      name="commissionValue"
                      type="number"
                      min={0}
                      step={commissionType === "PERCENT" ? 0.5 : 5}
                      inputMode="decimal"
                      value={commissionValue}
                      onChange={(e) => setCommissionValue(e.target.value)}
                      className={fieldClass}
                    />
                    <FieldError>{fieldErrors.commissionValue}</FieldError>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-on-surface mb-2 block text-sm font-medium">
                      בסיס חישוב העמלה
                    </label>
                    <select
                      name="commissionBasis"
                      value={commissionBasis}
                      onChange={(e) => setCommissionBasis(e.target.value as CommissionBasis)}
                      className={fieldClass}
                    >
                      {Object.values(CommissionBasis).map((b) => (
                        <option key={b} value={b}>
                          {COMMISSION_BASIS_LABEL[b]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-on-surface mb-2 block text-sm font-medium">
                      היקף העמלה
                    </label>
                    <select
                      name="commissionScope"
                      value={commissionScope}
                      onChange={(e) => setCommissionScope(e.target.value as CommissionScope)}
                      className={fieldClass}
                    >
                      {Object.values(CommissionScope).map((s) => (
                        <option key={s} value={s}>
                          {COMMISSION_SCOPE_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`${uid}-ep`}
                      className="text-on-surface mb-2 block text-sm font-medium"
                    >
                      תחזית רכישות לתקופה
                    </label>
                    <input
                      id={`${uid}-ep`}
                      name="estimatedPurchases"
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={estimatedPurchases}
                      onChange={(e) => setEstimatedPurchases(e.target.value)}
                      className={fieldClass}
                    />
                    <FieldError>{fieldErrors.estimatedPurchases}</FieldError>
                  </div>
                  <div>
                    <label
                      htmlFor={`${uid}-aov`}
                      className="text-on-surface mb-2 block text-sm font-medium"
                    >
                      ערך הזמנה ממוצע בחנות (₪)
                    </label>
                    <input
                      id={`${uid}-aov`}
                      name="assumedAovILS"
                      type="number"
                      min={0}
                      step={10}
                      inputMode="decimal"
                      value={assumedAov}
                      onChange={(e) => setAssumedAov(e.target.value)}
                      className={fieldClass}
                    />
                    <FieldError>{fieldErrors.assumedAovILS}</FieldError>
                  </div>
                </div>
                <p className="text-on-surface-variant -mt-2 text-xs">
                  התחזית וערך ההזמנה הממוצע הם הבסיס לחישוב הפיקדון. מומלץ: גודל קהל היוצר × שיעור
                  המרה × ערך הזמנה ממוצע.
                </p>

                <div>
                  <label className="text-on-surface mb-2 block text-sm font-medium">מצב שיוך</label>
                  <select
                    name="attributionMode"
                    value={attributionMode}
                    onChange={(e) => setAttributionMode(e.target.value as AttributionMode)}
                    className={fieldClass}
                  >
                    {Object.values(AttributionMode).map((m) => (
                      <option key={m} value={m}>
                        {ATTRIBUTION_MODE_LABEL[m]}
                      </option>
                    ))}
                  </select>
                  {attributionMode === "COUPON" && (
                    <p className="text-on-surface-variant mt-1.5 text-xs">
                      בקופון בלבד אין נתוני קליקים ושיעור המרה — היוצר יראה הזמנות, הכנסה ועמלה
                      בלבד.
                    </p>
                  )}
                </div>

                {attributionModeHasCoupon(attributionMode) && (
                  <div>
                    <label
                      htmlFor={`${uid}-cd`}
                      className="text-on-surface mb-2 block text-sm font-medium"
                    >
                      הנחת הקופון לקונה (%)
                    </label>
                    <input
                      id={`${uid}-cd`}
                      name="couponDiscountPct"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      inputMode="numeric"
                      value={couponDiscountPct}
                      onChange={(e) => setCouponDiscountPct(e.target.value)}
                      className={fieldClass}
                    />
                    <p className="text-on-surface-variant mt-1.5 text-xs">
                      הנחה אמיתית שיוצאת מהמרווח שלכם — נפרדת מהעמלה ליוצר.
                    </p>
                    <FieldError>{fieldErrors.couponDiscountPct}</FieldError>
                  </div>
                )}

                <div>
                  <label
                    htmlFor={`${uid}-du`}
                    className="text-on-surface mb-2 block text-sm font-medium"
                  >
                    עמוד יעד באתר
                  </label>
                  <input
                    id={`${uid}-du`}
                    name="destinationUrl"
                    type="url"
                    dir="ltr"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://"
                    className={cn(fieldClass, "text-start")}
                  />
                  <FieldError>{fieldErrors.destinationUrl}</FieldError>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`${uid}-ps`}
                      className="text-on-surface mb-2 block text-sm font-medium"
                    >
                      תאריך התחלה
                    </label>
                    <input
                      id={`${uid}-ps`}
                      name="partnerStartDate"
                      type="date"
                      value={partnerStart}
                      onChange={(e) => setPartnerStart(e.target.value)}
                      className={fieldClass}
                    />
                    <FieldError>{fieldErrors.startDate}</FieldError>
                  </div>
                  <div>
                    <label
                      htmlFor={`${uid}-pe`}
                      className="text-on-surface mb-2 block text-sm font-medium"
                    >
                      תאריך סיום
                    </label>
                    <input
                      id={`${uid}-pe`}
                      name="partnerEndDate"
                      type="date"
                      value={partnerEnd}
                      onChange={(e) => setPartnerEnd(e.target.value)}
                      className={fieldClass}
                    />
                    <FieldError>{fieldErrors.endDate}</FieldError>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`${uid}-cp`}
                    className="text-on-surface mb-2 block text-sm font-medium"
                  >
                    תחנת תשלום ביניים{" "}
                    <span className="text-on-surface-variant font-normal">(לא חובה)</span>
                  </label>
                  <input
                    id={`${uid}-cp`}
                    name="payoutCheckpoints"
                    type="date"
                    value={interimCheckpoint}
                    onChange={(e) => setInterimCheckpoint(e.target.value)}
                    className={fieldClass}
                  />
                  <p className="text-on-surface-variant mt-1.5 text-xs">
                    התחנה האחרונה נקבעת אוטומטית ל-14 יום אחרי תאריך הסיום (חלון החזרות).
                  </p>
                  <FieldError>{fieldErrors.payoutCheckpoints}</FieldError>
                </div>
              </div>
            </SectionCard>

            <div className="border-primary/20 bg-surface-low shadow-ambient-sm flex items-start gap-4 rounded-lg border p-5">
              <ShieldCheckIcon className="text-primary mt-0.5 size-6 shrink-0" />
              <div className="text-sm leading-relaxed">
                <p className="text-on-surface font-medium">
                  לאחר שתאשרו הצעת יוצר, המערכת תחשב את הפיקדון הנדרש מתנאי השותפות ותנפיק
                  לינק/קופון ייחודי. הלינק יעלה לאוויר רק לאחר הפקדת הפיקדון.
                </p>
                <p className="text-on-surface-variant mt-2">
                  בשלב זה אין חיוב. שמירה כטיוטה שומרת את הבריף; פרסום פותח אותו להצעות.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="border-primary/20 bg-surface-low shadow-ambient-sm flex items-start gap-4 rounded-lg border p-5">
            <ShieldCheckIcon className="text-primary mt-0.5 size-6 shrink-0" />
            <div className="text-sm leading-relaxed">
              <p className="text-on-surface font-medium">
                התקציב יופקד לנאמנות (Escrow) רק לאחר שתאשרו הצעת יוצר ספציפית, וישוחרר רק כשתאשרו
                את התוצר הסופי.
              </p>
              <p className="text-on-surface-variant mt-2">
                בשלב זה אין חיוב. שמירה כטיוטה שומרת את הבריף לעריכה; פרסום פותח אותו לקבלת הצעות
                מחיר מיוצרים.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── פעולות ── */}
      {stepError && (
        <p role="alert" className="text-on-error-container -mt-4 text-sm font-medium">
          {stepError}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          {step < 3 ? (
            // key נפרד לכל כפתור — כדי ש-React יחליף את צומת ה-DOM בין שלב 2 ל-3
            // ולא "ימיר" type=button ל-type=submit תחת קליק שכבר בתהליך (submit לא-מכוון).
            <button
              key="next"
              type="button"
              onClick={goNext}
              className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm inline-flex h-12 items-center justify-center rounded-lg px-6 text-sm font-semibold transition-colors"
            >
              המשך
            </button>
          ) : (
            <button
              key="publish"
              type="submit"
              name="intent"
              value="publish"
              disabled={isPending}
              className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm inline-flex h-12 items-center justify-center rounded-lg px-6 text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {isPending ? "שולח…" : "פרסום בריף לקבלת הצעות"}
            </button>
          )}
          <button
            type="submit"
            name="intent"
            value="draft"
            disabled={isPending}
            className="border-outline-variant text-primary hover:bg-surface-container inline-flex h-12 items-center justify-center rounded-lg border px-6 text-sm font-semibold transition-colors disabled:opacity-60"
          >
            שמירה כטיוטה
          </button>
        </div>

        {step > 1 && (
          <button
            type="button"
            onClick={() => goTo((step - 1) as StepId)}
            className="text-on-surface-variant hover:text-on-surface inline-flex h-12 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors"
          >
            חזרה
          </button>
        )}
      </div>
    </form>
  );
}

function SummaryRow({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-on-surface-variant shrink-0">{term}</dt>
      <dd className="text-on-surface text-end font-medium">{detail}</dd>
    </div>
  );
}
