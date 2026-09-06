"use client";

import { useActionState } from "react";
import { updateCreatorSettings } from "@/lib/actions/settings-actions";
import { SETTINGS_FORM_INITIAL } from "@/lib/actions/settings-form-state";
import {
  fieldClass,
  Field,
  ReadOnlyField,
  FormAlert,
  SubmitButton,
  SectionCard,
} from "@/components/app/settings/form-ui";
import { CategoryPicker, type CategoryOption } from "@/components/app/settings/category-picker";
import type { CreatorSettings } from "@/lib/settings";
import { CREATOR_TAX_STATUS_LABELS } from "@/lib/settings-labels";
import type { CityOption } from "@/lib/cities";

export function CreatorProfileForm({
  creator,
  categories,
  cities,
}: {
  creator: CreatorSettings;
  categories: CategoryOption[];
  cities: CityOption[];
}) {
  const [state, formAction, pending] = useActionState(updateCreatorSettings, SETTINGS_FORM_INITIAL);
  const errs = state?.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <FormAlert state={state} />

      <SectionCard title="פרופיל ציבורי">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="שם במה" error={errs.displayName}>
            <input
              name="displayName"
              type="text"
              defaultValue={creator.displayName}
              className={fieldClass}
            />
          </Field>
          <Field label="עיר פעילות ראשית" error={errs.primaryCityId}>
            <select
              name="primaryCityId"
              defaultValue={creator.primaryCityId ?? ""}
              className={fieldClass}
            >
              <option value="">— ללא —</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameHe}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="ביו קצר" error={errs.bio}>
              <textarea
                name="bio"
                rows={3}
                defaultValue={creator.bio}
                className={`${fieldClass} resize-y`}
              />
            </Field>
          </div>
        </div>

        <div className="mt-5">
          <span className="text-on-surface mb-2 block text-sm font-medium">תחומי תוכן</span>
          <CategoryPicker
            options={categories}
            defaultSelected={creator.categorySlugs}
            error={errs.categories}
          />
        </div>
      </SectionCard>

      <SectionCard title="פרטי תשלום" description="להעברת תשלומים מהחשבון הנאמן (Escrow) לחשבונך.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="שם הבנק">
            <input
              name="bank.bank"
              type="text"
              defaultValue={creator.payoutBankDetails.bank}
              className={fieldClass}
            />
          </Field>
          <Field label="מספר סניף">
            <input
              name="bank.branch"
              type="text"
              dir="ltr"
              defaultValue={creator.payoutBankDetails.branch}
              className={`${fieldClass} text-start`}
            />
          </Field>
          <Field label="מספר חשבון">
            <input
              name="bank.account"
              type="text"
              dir="ltr"
              defaultValue={creator.payoutBankDetails.account}
              className={`${fieldClass} text-start`}
            />
          </Field>
          <Field label="שם בעל החשבון">
            <input
              name="bank.accountHolder"
              type="text"
              defaultValue={creator.payoutBankDetails.accountHolder}
              className={fieldClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="כתובת מגורים לצורכי מס">
              <input
                name="billingAddress"
                type="text"
                defaultValue={creator.billingAddress ?? ""}
                className={fieldClass}
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="זהות ומס" description="לא ניתנים לעריכה עצמאית — לעדכון פנו לתמיכה.">
        <div className="grid gap-5 sm:grid-cols-2">
          <ReadOnlyField label="שם מלא לפי ת.ז" value={creator.legalFullName} />
          <ReadOnlyField label="מספר ת.ז / ע.מ" value={creator.idNumber} />
          <ReadOnlyField
            label="מעמד לצורכי מס"
            value={CREATOR_TAX_STATUS_LABELS[creator.taxStatus]}
          />
        </div>
      </SectionCard>

      <div>
        <SubmitButton pending={pending} label="שמירת פרטי היוצר" />
      </div>
    </form>
  );
}
