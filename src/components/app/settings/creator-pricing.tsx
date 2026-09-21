"use client";

import { useActionState, useState } from "react";
import {
  upsertCreatorPricingPackage,
  toggleCreatorPricingPackage,
  deleteCreatorPricingPackage,
} from "@/lib/actions/settings-actions";
import { SETTINGS_FORM_INITIAL } from "@/lib/actions/settings-form-state";
import {
  fieldClass,
  Field,
  FormAlert,
  SubmitButton,
  SectionCard,
} from "@/components/app/settings/form-ui";
import { DELIVERABLE_OPTIONS } from "@/lib/campaign-brief";
import { cn } from "@/lib/cn";
import { CloseIcon, PenSquareIcon, PlusIcon } from "@/components/marketing/icons";
import type { CreatorPricingPackageVM } from "@/lib/settings";

const DELIVERABLE_LABEL = new Map<string, string>(
  DELIVERABLE_OPTIONS.map((o) => [o.value, o.label]),
);

function formatShekels(n: number): string {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function PackageFormFields({
  defaultType,
  defaultTitle,
  defaultPrice,
  defaultTurnaround,
  defaultRevisions,
  errs,
}: {
  defaultType: string;
  defaultTitle: string;
  defaultPrice: number | "";
  defaultTurnaround: number | "";
  defaultRevisions: number;
  errs: Record<string, string>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="סוג תוצר" error={errs.deliverableType}>
        <select name="deliverableType" defaultValue={defaultType} className={fieldClass}>
          {DELIVERABLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="שם החבילה" error={errs.title}>
        <input name="title" type="text" defaultValue={defaultTitle} className={fieldClass} />
      </Field>
      <Field label="מחיר (₪)" error={errs.priceILS}>
        <input
          name="priceILS"
          type="number"
          min={0}
          step="0.01"
          defaultValue={defaultPrice}
          className={fieldClass}
        />
      </Field>
      <Field label="זמן אספקה (ימים)" error={errs.turnaroundDays}>
        <input
          name="turnaroundDays"
          type="number"
          min={0}
          defaultValue={defaultTurnaround}
          className={fieldClass}
        />
      </Field>
      <Field label="מספר תיקונים כלול" error={errs.revisionsIncluded}>
        <input
          name="revisionsIncluded"
          type="number"
          min={0}
          defaultValue={defaultRevisions}
          className={fieldClass}
        />
      </Field>
    </div>
  );
}

function PackageRow({ pkg }: { pkg: CreatorPricingPackageVM }) {
  const [editing, setEditing] = useState(false);
  // סגירת מצב העריכה עם הצלחת השמירה — נעשית כאן, בתוך ה-action עצמו (בזמן ה-transition
  // של השליחה), לא ברינדור ולא ב-useEffect: שני אלה התנגשו עם עדכון ה-router מ-revalidatePath.
  const [state, formAction, pending] = useActionState(
    async (prev: typeof SETTINGS_FORM_INITIAL, formData: FormData) => {
      const result = await upsertCreatorPricingPackage(prev, formData);
      if (result?.status === "success") setEditing(false);
      return result;
    },
    SETTINGS_FORM_INITIAL,
  );
  const errs = state?.status === "error" ? (state.fieldErrors ?? {}) : {};

  if (editing) {
    return (
      <form
        action={formAction}
        noValidate
        className="border-outline-variant bg-surface-container flex flex-col gap-4 rounded-lg border p-4"
      >
        <input type="hidden" name="packageId" value={pkg.id} />
        <FormAlert state={state} />
        <PackageFormFields
          defaultType={pkg.deliverableType}
          defaultTitle={pkg.title}
          defaultPrice={pkg.priceILS}
          defaultTurnaround={pkg.turnaroundDays}
          defaultRevisions={pkg.revisionsIncluded}
          errs={errs}
        />
        <div className="flex gap-3">
          <SubmitButton pending={pending} label="שמירה" />
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="border-outline-variant text-on-surface-variant hover:bg-surface-lowest inline-flex h-11 items-center justify-center rounded-lg border px-5 text-sm font-semibold transition-colors"
          >
            ביטול
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="border-outline-variant bg-surface-lowest flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-on-surface text-sm font-bold">{pkg.title}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              pkg.isActive
                ? "bg-primary/10 text-primary"
                : "bg-surface-container text-on-surface-variant",
            )}
          >
            {pkg.isActive ? "פעילה" : "לא פעילה"}
          </span>
        </div>
        <p className="text-on-surface-variant text-sm">
          {DELIVERABLE_LABEL.get(pkg.deliverableType) ?? pkg.deliverableType} ·{" "}
          {formatShekels(pkg.priceILS)} · אספקה תוך {pkg.turnaroundDays} ימים ·{" "}
          {pkg.revisionsIncluded} תיקונים
        </p>
      </div>
      <div className="flex gap-2">
        <form action={toggleCreatorPricingPackage}>
          <input type="hidden" name="packageId" value={pkg.id} />
          <input type="hidden" name="active" value={String(!pkg.isActive)} />
          <button
            type="submit"
            className="border-outline-variant text-on-surface hover:bg-surface-container inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors"
          >
            {pkg.isActive ? "השבתה" : "הפעלה"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="עריכת חבילה"
          className="border-outline-variant text-on-surface-variant hover:bg-surface-container inline-flex size-9 items-center justify-center rounded-lg border transition-colors"
        >
          <PenSquareIcon className="size-4" />
        </button>
        <form action={deleteCreatorPricingPackage}>
          <input type="hidden" name="packageId" value={pkg.id} />
          <button
            type="submit"
            title={
              pkg.hasDependents ? "יש הצעות/חוזים על חבילה זו — תושבת במקום להימחק" : "מחיקת חבילה"
            }
            aria-label="מחיקת חבילה"
            className="border-outline-variant text-on-surface-variant hover:border-error hover:text-error inline-flex size-9 items-center justify-center rounded-lg border transition-colors"
          >
            <CloseIcon className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function AddPackageForm({ onDone }: { onDone: () => void }) {
  // סגירת הטופס עם הצלחת השמירה — בתוך ה-action עצמו, לא ברינדור ולא ב-useEffect.
  const [state, formAction, pending] = useActionState(
    async (prev: typeof SETTINGS_FORM_INITIAL, formData: FormData) => {
      const result = await upsertCreatorPricingPackage(prev, formData);
      if (result?.status === "success") onDone();
      return result;
    },
    SETTINGS_FORM_INITIAL,
  );
  const errs = state?.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form
      action={formAction}
      noValidate
      className="border-outline-variant bg-surface-container flex flex-col gap-4 rounded-lg border p-4"
    >
      <FormAlert state={state} />
      <PackageFormFields
        defaultType={DELIVERABLE_OPTIONS[0].value}
        defaultTitle=""
        defaultPrice=""
        defaultTurnaround=""
        defaultRevisions={1}
        errs={errs}
      />
      <div className="flex gap-3">
        <SubmitButton pending={pending} label="הוספת חבילה" />
        <button
          type="button"
          onClick={onDone}
          className="border-outline-variant text-on-surface-variant hover:bg-surface-lowest inline-flex h-11 items-center justify-center rounded-lg border px-5 text-sm font-semibold transition-colors"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

export function CreatorPricingPackages({ packages }: { packages: CreatorPricingPackageVM[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <SectionCard
      title="חבילות תמחור"
      description="מוצגות למפרסמים בעת בחירת יוצר לקמפיין."
      action={
        !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-primary hover:text-primary-hover inline-flex items-center gap-1 text-sm font-semibold transition-colors"
          >
            <PlusIcon className="size-4" />
            הוסף חבילה
          </button>
        )
      }
    >
      <div className="flex flex-col gap-3">
        {packages.length === 0 && !adding && (
          <p className="text-on-surface-variant text-sm">עדיין לא הוגדרו חבילות תמחור.</p>
        )}
        {packages.map((p) => (
          <PackageRow key={p.id} pkg={p} />
        ))}
        {adding && <AddPackageForm onDone={() => setAdding(false)} />}
      </div>
    </SectionCard>
  );
}
