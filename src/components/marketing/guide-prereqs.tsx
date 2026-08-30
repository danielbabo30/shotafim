import { CheckCircleIcon } from "@/components/marketing/icons";

/** תיבת "תנאים מקדימים" — רשימת דרישות שצריכות להתקיים לפני תחילת המדריך. */
export function GuidePrereqs({ items }: { items: string[] }) {
  if (!items.length) return null;

  return (
    <div className="border-outline-variant/60 bg-surface-low rounded-xl border p-6">
      <h2 className="mb-3 text-lg font-bold">תנאים מקדימים</h2>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-on-surface-variant flex items-start gap-3 text-sm">
            <CheckCircleIcon className="text-primary mt-0.5 size-5 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
