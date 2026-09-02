"use client";

import { useActionState, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import type { AdSpaceType } from "@prisma/client";
import { cn } from "@/lib/cn";
import {
  AD_SPACE_TYPES,
  AD_SPACE_TYPE_LABELS,
  AD_SPACE_TYPE_HINTS,
  AD_PRICING_MODELS,
  AD_PRICING_MODEL_LABELS,
  PROOF_REQUIREMENTS,
  PROOF_REQUIREMENT_LABELS,
  typeNeedsLocation,
  EMPTY_ASSET_FORM_VALUES,
  AD_SPACE_ASSET_FORM_INITIAL,
  type AdSpaceAssetFormState,
  type AdSpaceAssetFormValues,
} from "@/lib/ad-space-asset-form";
import { CheckIcon, PlusIcon, CloseIcon } from "@/components/marketing/icons";

type AssetFormAction = (
  prev: AdSpaceAssetFormState,
  formData: FormData,
) => Promise<AdSpaceAssetFormState>;

const fieldClass =
  "w-full rounded-lg bg-surface-container px-3 py-3 text-base text-on-surface placeholder:text-on-surface-variant/70 " +
  "transition-colors outline-none focus:bg-surface-lowest focus:ring-2 focus:ring-primary";

function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="text-on-error-container mt-1.5 text-xs font-medium">{children}</p>;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border p-6">
      <h2 className="text-on-surface text-xl font-bold">{title}</h2>
      {description && (
        <p className="text-on-surface-variant mt-1 mb-5 text-sm leading-relaxed">{description}</p>
      )}
      <div className={description ? "" : "mt-6"}>{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-on-surface mb-2 block text-sm font-medium">
        {label} {hint && <span className="text-on-surface-variant font-normal">({hint})</span>}
      </label>
      {children}
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function AssetForm({
  mode,
  action,
  cities,
  categories,
  initial,
}: {
  mode: "create" | "edit";
  action: AssetFormAction;
  cities: { id: string; nameHe: string }[];
  categories: { slug: string; name: string }[];
  initial?: AdSpaceAssetFormValues;
}) {
  const values = initial ?? EMPTY_ASSET_FORM_VALUES;
  const [state, formAction, isPending] = useActionState(action, AD_SPACE_ASSET_FORM_INITIAL);
  const uid = useId();
  const errs = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  const [type, setType] = useState<AdSpaceType>(values.type);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(values.categories),
  );
  const [images, setImages] = useState<string[]>(values.images);

  const needsLocation = typeNeedsLocation(type);
  const showResolution = type === "DIGITAL_BILLBOARD" || type === "NEWSLETTER";
  const showSpotLength = type === "DIGITAL_BILLBOARD" || type === "PODCAST_SPONSORSHIP";

  const toggleCategory = (slug: string) =>
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const imageError = Object.entries(errs).find(([k]) => k === "images" || k.startsWith("images."));

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="border-on-error-container/25 bg-error-container text-on-error-container rounded-lg border px-4 py-3 text-sm font-medium"
        >
          {state.message}
        </p>
      )}

      <SectionCard title="זהות ומדיה" description="סוג המדיה קובע אילו שדות נדרשים בהמשך הטופס.">
        <div className="flex flex-col gap-6">
          <div>
            <span className="text-on-surface mb-2 block text-sm font-medium">סוג מדיה</span>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {AD_SPACE_TYPES.map((value) => {
                const checked = type === value;
                return (
                  <label
                    key={value}
                    className={cn(
                      "relative flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-all",
                      checked
                        ? "border-primary bg-surface-low ring-primary ring-1"
                        : "border-outline-variant bg-surface-lowest hover:border-primary hover:bg-surface-low",
                    )}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={value}
                      checked={checked}
                      onChange={() => setType(value)}
                      className="sr-only"
                    />
                    {checked && (
                      <span className="text-primary absolute end-3 top-3">
                        <CheckIcon className="size-4" />
                      </span>
                    )}
                    <span className="text-on-surface pe-6 text-sm font-bold">
                      {AD_SPACE_TYPE_LABELS[value]}
                    </span>
                    <span className="text-on-surface-variant text-xs leading-relaxed">
                      {AD_SPACE_TYPE_HINTS[value]}
                    </span>
                  </label>
                );
              })}
            </div>
            <FieldError>{errs.type}</FieldError>
          </div>

          <Field label="שם הנכס" htmlFor={`${uid}-title`} error={errs.title}>
            <input
              id={`${uid}-title`}
              name="title"
              type="text"
              defaultValue={values.title}
              placeholder="לדוגמה: מסך LED — כיכר המדינה"
              className={fieldClass}
            />
          </Field>

          <Field
            label="תיאור הנכס"
            htmlFor={`${uid}-desc`}
            hint="נראה למפרסמים בקטלוג"
            error={errs.description}
          >
            <textarea
              id={`${uid}-desc`}
              name="description"
              rows={3}
              defaultValue={values.description}
              placeholder="מיקום, קהל יעד, נראות, שעות פעילות…"
              className={cn(fieldClass, "resize-y")}
            />
          </Field>
        </div>
      </SectionCard>

      {needsLocation && (
        <SectionCard title="מיקום ומידות">
          <div className="flex flex-col gap-6">
            <Field label="עיר" htmlFor={`${uid}-city`} error={errs.cityId}>
              <select
                id={`${uid}-city`}
                name="cityId"
                defaultValue={values.cityId}
                className={fieldClass}
              >
                <option value="">בחרו עיר</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameHe}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="כתובת / מיקום מדויק" htmlFor={`${uid}-address`} error={errs.address}>
              <input
                id={`${uid}-address`}
                name="address"
                type="text"
                defaultValue={values.address}
                placeholder="דרך מנחם בגין 132 / צומת קפלן"
                className={fieldClass}
              />
            </Field>

            <Field label="מידות" htmlFor={`${uid}-dim`} hint="לא חובה" error={errs.dimensions}>
              <input
                id={`${uid}-dim`}
                name="dimensions"
                type="text"
                defaultValue={values.dimensions}
                placeholder="12x4 מ׳ / עטיפה מלאה"
                className={fieldClass}
              />
            </Field>
          </div>
        </SectionCard>
      )}

      <SectionCard title="מפרט טכני וחשיפה">
        <div className="grid gap-6 sm:grid-cols-2">
          {showResolution && (
            <Field label="רזולוציה" htmlFor={`${uid}-res`} hint="לא חובה" error={errs.resolution}>
              <input
                id={`${uid}-res`}
                name="resolution"
                type="text"
                dir="ltr"
                defaultValue={values.resolution}
                placeholder="1920x1080"
                className={cn(fieldClass, "text-start")}
              />
            </Field>
          )}

          {showSpotLength && (
            <Field
              label="אורך ספוט (שניות)"
              htmlFor={`${uid}-spot`}
              hint="לא חובה"
              error={errs.spotLengthSeconds}
            >
              <input
                id={`${uid}-spot`}
                name="spotLengthSeconds"
                type="number"
                min={0}
                inputMode="numeric"
                defaultValue={values.spotLengthSeconds}
                placeholder="10"
                className={fieldClass}
              />
            </Field>
          )}

          <Field
            label="חשיפות מוערכות"
            htmlFor={`${uid}-reach`}
            hint="לתקופת התמחור, לא חובה"
            error={errs.estimatedReach}
          >
            <input
              id={`${uid}-reach`}
              name="estimatedReach"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={values.estimatedReach}
              placeholder="180000"
              className={fieldClass}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="תמחור והוכחת ביצוע">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="מודל תמחור" htmlFor={`${uid}-model`} error={errs.pricingModel}>
            <select
              id={`${uid}-model`}
              name="pricingModel"
              defaultValue={values.pricingModel}
              className={fieldClass}
            >
              {AD_PRICING_MODELS.map((m) => (
                <option key={m} value={m}>
                  {AD_PRICING_MODEL_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="תעריף בסיס (₪)" htmlFor={`${uid}-price`} error={errs.basePriceILS}>
            <input
              id={`${uid}-price`}
              name="basePriceILS"
              type="number"
              min={0}
              step={100}
              inputMode="numeric"
              defaultValue={values.basePriceILS}
              placeholder="0"
              className={fieldClass}
            />
          </Field>

          <Field
            label="דרישת הוכחת שידור"
            htmlFor={`${uid}-proof`}
            hint="לשחרור כספי הנאמנות"
            error={errs.proofRequirement}
          >
            <select
              id={`${uid}-proof`}
              name="proofRequirement"
              defaultValue={values.proofRequirement}
              className={fieldClass}
            >
              {PROOF_REQUIREMENTS.map((p) => (
                <option key={p} value={p}>
                  {PROOF_REQUIREMENT_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </SectionCard>

      {categories.length > 0 && (
        <SectionCard title="קטגוריות" description="עוזר למפרסמים למצוא את הנכס בסינון הקטלוג.">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const checked = selectedCategories.has(c.slug);
              return (
                <label
                  key={c.slug}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    checked
                      ? "bg-primary-container text-on-primary-container"
                      : "border-outline-variant text-on-surface-variant hover:bg-surface-container border",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(c.slug)}
                    className="sr-only"
                  />
                  {checked && <CheckIcon className="size-3.5" />}
                  {c.name}
                </label>
              );
            })}
          </div>
          {[...selectedCategories].map((slug) => (
            <input key={slug} type="hidden" name="categories" value={slug} />
          ))}
        </SectionCard>
      )}

      <SectionCard
        title="תמונות"
        description="קישורי URL לתמונות הנכס. אין כרגע העלאת קבצים — הדביקו קישור ציבורי."
      >
        <div className="flex flex-col gap-3">
          {images.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="url"
                dir="ltr"
                value={url}
                onChange={(e) =>
                  setImages((prev) => prev.map((v, vi) => (vi === i ? e.target.value : v)))
                }
                placeholder="https://…"
                className={cn(fieldClass, "text-start")}
              />
              <input type="hidden" name="images" value={url} />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, vi) => vi !== i))}
                aria-label="הסרת תמונה"
                className="text-on-surface-variant hover:bg-surface-container hover:text-on-error-container shrink-0 rounded-lg p-2 transition-colors"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setImages((prev) => [...prev, ""])}
            className="border-outline-variant text-on-surface-variant hover:bg-surface-container inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-sm font-medium transition-colors"
          >
            <PlusIcon className="size-4" />
            הוספת תמונה
          </button>
          {imageError && <FieldError>{imageError[1]}</FieldError>}
        </div>
      </SectionCard>

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm inline-flex h-12 items-center justify-center rounded-lg px-6 text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {isPending ? "שומר…" : mode === "create" ? "הוספה לקטלוג" : "שמירת השינויים"}
        </button>
        <Link
          href="/dashboard/assets"
          className="text-on-surface-variant hover:text-on-surface inline-flex h-12 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors"
        >
          ביטול
        </Link>
      </div>
    </form>
  );
}
