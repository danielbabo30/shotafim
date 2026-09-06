import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { SettingsFormState } from "@/lib/actions/settings-form-state";

/** רכיבי עזר משותפים לטפסי מסך ההגדרות — Design tokens בלבד, ראה CLAUDE.md §3. */

export const fieldClass =
  "w-full rounded-lg bg-surface-container px-3 py-3 text-base text-on-surface placeholder:text-on-surface-variant/70 " +
  "transition-colors outline-none focus:bg-surface-lowest focus:ring-2 focus:ring-primary";

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="text-on-error-container mt-1.5 text-xs font-medium">{children}</p>;
}

export function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-on-surface text-xl font-bold">{title}</h2>
          {description && (
            <p className="text-on-surface-variant mt-1 text-sm leading-relaxed">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Field({
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

export function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-on-surface-variant mb-1 block text-xs font-semibold">{label}</span>
      <p className="text-on-surface bg-surface-container rounded-lg px-3 py-2.5 text-sm">{value}</p>
    </div>
  );
}

/** באנר משוב עבור useActionState — הצלחה/שגיאה כלליים של הטופס */
export function FormAlert({ state }: { state: SettingsFormState }) {
  if (!state || state.status === "idle" || !state.message) return null;
  const isError = state.status === "error";
  return (
    <p
      role="alert"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm font-medium",
        isError
          ? "border-on-error-container/25 bg-error-container text-on-error-container"
          : "border-primary/25 bg-primary/10 text-primary",
      )}
    >
      {state.message}
    </p>
  );
}

export function SubmitButton({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean;
  label: string;
  pendingLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-primary text-on-primary hover:bg-primary-hover inline-flex h-11 shrink-0 items-center justify-center rounded-lg px-6 text-sm font-semibold transition-colors disabled:opacity-60"
    >
      {pending ? (pendingLabel ?? "שומר…") : label}
    </button>
  );
}
