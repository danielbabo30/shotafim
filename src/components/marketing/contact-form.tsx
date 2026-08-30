"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckIcon, WarningIcon } from "@/components/marketing/icons";
import type { ContactPage } from "@/payload-types";

type Form = ContactPage["form"];

const fieldClass =
  "border-outline-variant bg-surface-lowest focus:border-primary focus:ring-primary/20 " +
  "w-full rounded-lg border px-4 py-2.5 text-sm transition-all focus:ring-2 focus:outline-none";
const labelClass = "text-on-surface mb-1.5 block text-sm font-semibold";

/**
 * טופס "צור קשר" — כרגע UI בלבד. אין שליחה אמיתית ואין שמירה.
 * הודעת השירות (form.note) מוצגת תמיד מעל הטופס.
 * חיבור למערכת פניות / דיוור יתווסף בהמשך.
 */
export function ContactForm({ form }: { form: Form }) {
  const uid = useId();
  const [sent, setSent] = useState(false);
  const subjects = form.subjects?.length ? form.subjects : null;

  return (
    <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-xl border p-6 sm:p-8">
      <h2 className="text-2xl font-bold">{form.heading}</h2>

      {/* הודעת שירות — הטופס להדגמה בלבד */}
      <p
        role="status"
        className="bg-warning-container text-warning mt-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm font-medium"
      >
        <WarningIcon className="mt-0.5 size-4 shrink-0" />
        <span>{form.note}</span>
      </p>

      {sent ? (
        <div className="bg-success-container text-success mt-6 flex flex-col items-start gap-3 rounded-lg p-6">
          <span className="bg-success text-on-primary flex size-10 items-center justify-center rounded-full">
            <CheckIcon className="size-5" />
          </span>
          <h3 className="text-lg font-bold">{form.successTitle}</h3>
          <p className="text-sm">{form.successBody}</p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-success mt-1 text-sm font-semibold underline"
          >
            שליחת פנייה נוספת
          </button>
        </div>
      ) : (
        <form
          className="mt-6 flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true); // TODO: חיבור למערכת פניות
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-name`} className={labelClass}>
                שם מלא
              </label>
              <input id={`${uid}-name`} name="name" type="text" required className={fieldClass} />
            </div>
            <div>
              <label htmlFor={`${uid}-email`} className={labelClass}>
                אימייל
              </label>
              <input
                id={`${uid}-email`}
                name="email"
                type="email"
                required
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-phone`} className={labelClass}>
                טלפון <span className="text-on-surface-variant font-normal">(לא חובה)</span>
              </label>
              <input id={`${uid}-phone`} name="phone" type="tel" className={fieldClass} />
            </div>
            {subjects && (
              <div>
                <label htmlFor={`${uid}-subject`} className={labelClass}>
                  נושא הפנייה
                </label>
                <select id={`${uid}-subject`} name="subject" className={fieldClass}>
                  {subjects.map((s, i) => (
                    <option key={s.id ?? i} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label htmlFor={`${uid}-message`} className={labelClass}>
              תוכן הפנייה
            </label>
            <textarea
              id={`${uid}-message`}
              name="message"
              required
              rows={5}
              className={`${fieldClass} resize-y`}
            />
          </div>

          <Button type="submit" size="lg" className="w-full sm:w-auto sm:self-start">
            {form.submitLabel}
          </Button>
        </form>
      )}
    </div>
  );
}
