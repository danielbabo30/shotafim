import { WarningIcon } from "@/components/marketing/icons";

/** כרטיס אזהרה — פעולות בלתי הפיכות או השלכות שחשוב לשים לב אליהן. */
export function GuideCaution({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-error-container border-on-error-container/15 my-8 flex items-start gap-4 rounded-xl border p-5">
      <WarningIcon className="text-error mt-0.5 size-6 shrink-0" />
      <div>
        <p className="text-on-error-container font-bold">{title}</p>
        <p className="text-on-error-container/90 mt-1 text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
