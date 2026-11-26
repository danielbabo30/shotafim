import { actionErrorMessage } from "@/lib/action-errors";

/** באנר שגיאה לפעולות שחוזרות עם `?err=<code>` (ראה action-errors.ts) */
export function ActionErrorBanner({ code }: { code: string | string[] | undefined }) {
  const message = actionErrorMessage(code);
  if (!message) return null;
  return (
    <p
      role="alert"
      className="bg-error-container text-on-error-container rounded-lg p-3 text-sm leading-relaxed"
    >
      {message}
    </p>
  );
}
