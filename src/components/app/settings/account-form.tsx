"use client";

import { useActionState } from "react";
import { updateAccountSettings } from "@/lib/actions/settings-actions";
import { SETTINGS_FORM_INITIAL } from "@/lib/actions/settings-form-state";
import {
  fieldClass,
  Field,
  ReadOnlyField,
  FormAlert,
  SubmitButton,
} from "@/components/app/settings/form-ui";
import type { AccountSettings } from "@/lib/settings";

export function AccountForm({ account }: { account: AccountSettings }) {
  const [state, formAction, pending] = useActionState(updateAccountSettings, SETTINGS_FORM_INITIAL);
  const errs = state?.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <FormAlert state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="שם מלא" error={errs.name}>
          <input name="name" type="text" defaultValue={account.name ?? ""} className={fieldClass} />
        </Field>
        <Field label="טלפון" error={errs.phone}>
          <input
            name="phone"
            type="tel"
            dir="ltr"
            defaultValue={account.phone ?? ""}
            placeholder="050-0000000"
            className={`${fieldClass} text-start`}
          />
        </Field>
        <ReadOnlyField label="דוא״ל" value={account.email ?? "—"} />
        {/* TODO: email change requires verification flow */}
      </div>
      <div>
        <SubmitButton pending={pending} label="שמירת פרטי חשבון" />
      </div>
    </form>
  );
}
