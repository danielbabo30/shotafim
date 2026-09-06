"use client";

import { useActionState } from "react";
import { updateAdSpaceOwnerSettings } from "@/lib/actions/settings-actions";
import { SETTINGS_FORM_INITIAL } from "@/lib/actions/settings-form-state";
import {
  fieldClass,
  Field,
  ReadOnlyField,
  FormAlert,
  SubmitButton,
  SectionCard,
} from "@/components/app/settings/form-ui";
import type { AdSpaceOwnerSettings } from "@/lib/settings";
import { LEGAL_ENTITY_TYPE_LABELS } from "@/lib/settings-labels";

export function SpaceOwnerForm({ owner }: { owner: AdSpaceOwnerSettings }) {
  const [state, formAction, pending] = useActionState(
    updateAdSpaceOwnerSettings,
    SETTINGS_FORM_INITIAL,
  );
  const errs = state?.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <FormAlert state={state} />

      <SectionCard title="פרטי חברת המדיה">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="שם חברת המדיה" error={errs.companyName}>
            <input
              name="companyName"
              type="text"
              defaultValue={owner.companyName}
              className={fieldClass}
            />
          </Field>
          <Field label="איש קשר תפעולי" error={errs.contactName}>
            <input
              name="contactName"
              type="text"
              defaultValue={owner.contactName}
              className={fieldClass}
            />
          </Field>
          <Field label="טלפון איש קשר" error={errs.contactPhone}>
            <input
              name="contactPhone"
              type="tel"
              dir="ltr"
              defaultValue={owner.contactPhone}
              className={`${fieldClass} text-start`}
            />
          </Field>
          <Field label="אימייל לחשבוניות" error={errs.billingEmail}>
            <input
              name="billingEmail"
              type="email"
              dir="ltr"
              defaultValue={owner.billingEmail}
              className={`${fieldClass} text-start`}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="כתובת רשמית לחיוב" error={errs.billingAddress}>
              <input
                name="billingAddress"
                type="text"
                defaultValue={owner.billingAddress}
                className={fieldClass}
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="פרטי חשבון בנק לזיכוי"
        description="להעברת תשלומים מהחשבון הנאמן (Escrow) לחשבונך."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="שם הבנק">
            <input
              name="bank.bank"
              type="text"
              defaultValue={owner.payoutBankDetails.bank}
              className={fieldClass}
            />
          </Field>
          <Field label="מספר סניף">
            <input
              name="bank.branch"
              type="text"
              dir="ltr"
              defaultValue={owner.payoutBankDetails.branch}
              className={`${fieldClass} text-start`}
            />
          </Field>
          <Field label="מספר חשבון">
            <input
              name="bank.account"
              type="text"
              dir="ltr"
              defaultValue={owner.payoutBankDetails.account}
              className={`${fieldClass} text-start`}
            />
          </Field>
          <Field label="שם בעל החשבון">
            <input
              name="bank.accountHolder"
              type="text"
              defaultValue={owner.payoutBankDetails.accountHolder}
              className={fieldClass}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="זהות משפטית" description="לא ניתנים לעריכה עצמאית — לעדכון פנו לתמיכה.">
        <div className="grid gap-5 sm:grid-cols-2">
          <ReadOnlyField label="שם תאגיד רשמי" value={owner.legalName} />
          <ReadOnlyField label="ח.פ / ע.מ" value={owner.companyId} />
          <ReadOnlyField label="סוג התאגדות" value={LEGAL_ENTITY_TYPE_LABELS[owner.entityType]} />
        </div>
      </SectionCard>

      <div>
        <SubmitButton pending={pending} label="שמירת פרטי בעל השטחים" />
      </div>
    </form>
  );
}
