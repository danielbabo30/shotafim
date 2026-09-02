"use client";

import { useActionState, useId, useMemo, useState, type ReactNode } from "react";
import { CampaignTargetType, type DeliverableType } from "@prisma/client";
import { cn } from "@/lib/cn";
import {
  CAMPAIGN_FORM_INITIAL,
  CAMPAIGN_TARGET_TYPES,
  DELIVERABLE_OPTIONS,
  deliverableLabel,
  targetTypeLabel,
} from "@/lib/campaign-brief";
import { createCampaign } from "@/lib/actions/campaign-actions";
import { ShieldCheckIcon, CheckIcon } from "@/components/marketing/icons";

type StepId = 1 | 2 | 3;

const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: "הגדרות בסיס" },
  { id: 2, label: "תוצרים ותקציב" },
  { id: 3, label: "הפקדת Escrow" },
];

/** באיזה שלב יושב כל שדה — לקפיצה אוטומטית לשגיאה הראשונה */
const FIELD_STEP: Record<string, StepId> = {
  targetType: 1,
  title: 1,
  locationId: 1,
  description: 1,
  briefAssetsUrl: 1,
  deliverables: 2,
  totalBudgetILS: 2,
  endDate: 2,
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
  const [title, setTitle] = useState("");
  const [locationId, setLocationId] = useState("");
  const [description, setDescription] = useState("");
  const [briefAssetsUrl, setBriefAssetsUrl] = useState("");
  const [deliverables, setDeliverables] = useState<Set<DeliverableType>>(new Set());
  const [budget, setBudget] = useState("");
  const [endDate, setEndDate] = useState("");

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
              <div>
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
            <SummaryRow term="כותרת" detail={title.trim() || "—"} />
            <SummaryRow
              term="תוצרים"
              detail={
                selectedDeliverables.length
                  ? selectedDeliverables.map((d) => deliverableLabel(d.value)).join(", ")
                  : "—"
              }
            />
            <SummaryRow term="תקציב" detail={budgetPreview} />
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

        <div className="border-primary/20 bg-surface-low shadow-ambient-sm flex items-start gap-4 rounded-lg border p-5">
          <ShieldCheckIcon className="text-primary mt-0.5 size-6 shrink-0" />
          <div className="text-sm leading-relaxed">
            <p className="text-on-surface font-medium">
              התקציב יופקד לנאמנות (Escrow) רק לאחר שתאשרו הצעת יוצר ספציפית, וישוחרר רק כשתאשרו את
              התוצר הסופי.
            </p>
            <p className="text-on-surface-variant mt-2">
              בשלב זה אין חיוב. שמירה כטיוטה שומרת את הבריף לעריכה; פרסום פותח אותו לקבלת הצעות מחיר
              מיוצרים.
            </p>
          </div>
        </div>
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
