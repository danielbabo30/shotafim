"use client";

import { useActionState } from "react";
import { updateBrandSettings } from "@/lib/actions/settings-actions";
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
import type { BrandSettings } from "@/lib/settings";
import { LEGAL_ENTITY_TYPE_LABELS, BUSINESS_MODEL_LABELS } from "@/lib/settings-labels";

export function BrandForm({
  brand,
  categories,
}: {
  brand: BrandSettings;
  categories: CategoryOption[];
}) {
  const [state, formAction, pending] = useActionState(updateBrandSettings, SETTINGS_FORM_INITIAL);
  const errs = state?.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <FormAlert state={state} />

      <SectionCard title="פרטי המותג">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="שם המותג" error={errs.name}>
            <input name="name" type="text" defaultValue={brand.name} className={fieldClass} />
          </Field>
          <Field label="אתר אינטרנט" error={errs.websiteUrl}>
            <input
              name="websiteUrl"
              type="url"
              dir="ltr"
              defaultValue={brand.websiteUrl ?? ""}
              placeholder="https://www.yourbrand.co.il"
              className={`${fieldClass} text-start`}
            />
          </Field>
          <Field label="לוגו (כתובת תמונה)" error={errs.logoUrl}>
            <input
              name="logoUrl"
              type="url"
              dir="ltr"
              defaultValue={brand.logoUrl ?? ""}
              placeholder="https://…"
              className={`${fieldClass} text-start`}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="תיאור פעילות העסק" error={errs.description}>
              <textarea
                name="description"
                rows={3}
                defaultValue={brand.description}
                className={`${fieldClass} resize-y`}
              />
            </Field>
          </div>
        </div>

        <div className="mt-5">
          <span className="text-on-surface mb-2 block text-sm font-medium">קטגוריות פעילות</span>
          <CategoryPicker
            options={categories}
            defaultSelected={brand.categorySlugs}
            error={errs.categories}
          />
        </div>
      </SectionCard>

      <SectionCard title="נוכחות דיגיטלית">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="אינסטגרם">
            <input
              name="instagram"
              type="text"
              dir="ltr"
              defaultValue={brand.socialLinks.instagram}
              placeholder="brand_ig"
              className={`${fieldClass} text-start`}
            />
          </Field>
          <Field label="טיקטוק">
            <input
              name="tiktok"
              type="text"
              dir="ltr"
              defaultValue={brand.socialLinks.tiktok}
              placeholder="brand_tt"
              className={`${fieldClass} text-start`}
            />
          </Field>
          <Field label="פייסבוק">
            <input
              name="facebook"
              type="text"
              dir="ltr"
              defaultValue={brand.socialLinks.facebook}
              placeholder="brand.page"
              className={`${fieldClass} text-start`}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="איש קשר וחיוב">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="שם איש קשר" error={errs.contactName}>
            <input
              name="contactName"
              type="text"
              defaultValue={brand.contactName}
              className={fieldClass}
            />
          </Field>
          <Field label="טלפון איש קשר" error={errs.contactPhone}>
            <input
              name="contactPhone"
              type="tel"
              dir="ltr"
              defaultValue={brand.contactPhone}
              className={`${fieldClass} text-start`}
            />
          </Field>
          <Field label="אימייל להנהלת חשבונות" error={errs.billingEmail}>
            <input
              name="billingEmail"
              type="email"
              dir="ltr"
              defaultValue={brand.billingEmail}
              className={`${fieldClass} text-start`}
            />
          </Field>
          <Field label="כתובת למשלוח חשבוניות" error={errs.billingAddress}>
            <input
              name="billingAddress"
              type="text"
              defaultValue={brand.billingAddress}
              className={fieldClass}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="פרטים משפטיים" description="לא ניתנים לעריכה עצמאית — לעדכון פנו לתמיכה.">
        <div className="grid gap-5 sm:grid-cols-2">
          <ReadOnlyField label="שם תאגיד / ישות משפטית" value={brand.legalName ?? "—"} />
          <ReadOnlyField label="ח.פ / עוסק מורשה" value={brand.companyId} />
          <ReadOnlyField label="סוג התאגדות" value={LEGAL_ENTITY_TYPE_LABELS[brand.entityType]} />
          <ReadOnlyField label="מודל פעילות" value={BUSINESS_MODEL_LABELS[brand.businessModel]} />
        </div>
      </SectionCard>

      <div>
        <SubmitButton pending={pending} label="שמירת פרטי המותג" />
      </div>
    </form>
  );
}
