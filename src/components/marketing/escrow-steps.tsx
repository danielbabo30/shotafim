import { Container } from "@/components/ui/container";
import { ShieldCheckIcon } from "@/components/marketing/icons";
import type { Homepage } from "@/payload-types";

/** מקטע ארנק הנאמנות — כותרת + תיאור + ציר שלבים, לצד ויזואל דקורטיבי. */
export function EscrowSteps({ escrow }: { escrow: Homepage["escrow"] }) {
  const steps = escrow.steps ?? [];

  return (
    <section className="from-background to-surface-low border-outline-variant/40 overflow-hidden border-t bg-gradient-to-b">
      <Container className="grid items-center gap-16 py-20 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold sm:text-4xl">
            {escrow.headingLead} <span className="text-primary">{escrow.headingHighlight}</span>
          </h2>
          <p className="text-on-surface-variant mt-4 max-w-md text-base leading-relaxed">
            {escrow.body}
          </p>

          <ol className="mt-10 space-y-5">
            {steps.map((step, i) => (
              <li key={step.id ?? i} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      i === 0
                        ? "bg-primary text-on-primary"
                        : "border-outline-variant text-on-surface-variant border-2"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {i < steps.length - 1 && (
                    <span className="bg-outline-variant/50 mt-1 w-px flex-1" />
                  )}
                </div>
                <div className="border-outline-variant/40 bg-surface-lowest shadow-ambient-sm flex-1 rounded-lg border p-5">
                  <h3 className="font-bold">{step.title}</h3>
                  <p className="text-on-surface-variant mt-1 text-sm leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <EscrowVisual />
      </Container>
    </section>
  );
}

/** ויזואל דקורטיבי — כרטיסי סטטוס מוערמים. CSS בלבד. */
function EscrowVisual() {
  return (
    <div className="relative hidden h-[440px] lg:block">
      <div className="from-primary/5 absolute inset-0 rounded-3xl bg-gradient-to-tr to-transparent" />

      {/* שלב 1 — הפקדה */}
      <div className="border-outline-variant/40 bg-surface-lowest shadow-ambient absolute end-6 top-6 w-60 -rotate-2 rounded-xl border p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="bg-primary-fixed text-primary flex size-8 items-center justify-center rounded-full text-xs font-bold">
            ₪
          </span>
          <span className="text-sm font-bold">הפקדת מותג</span>
        </div>
        <div className="space-y-2">
          <div className="bg-surface-container h-2 w-full rounded-full" />
          <div className="bg-surface-container h-2 w-3/4 rounded-full" />
        </div>
        <div className="border-outline-variant/30 mt-3 flex items-center justify-between border-t pt-3">
          <span className="text-sm font-bold">₪18,000</span>
          <span className="bg-success-container text-success rounded px-2 py-0.5 text-xs font-semibold">
            מומן
          </span>
        </div>
      </div>

      {/* שלב 2 — הגשת תוכן */}
      <div className="border-primary/20 bg-surface-lowest shadow-ambient-lg absolute start-1/2 top-1/2 w-64 -translate-x-1/2 -translate-y-1/2 rounded-xl border p-5">
        <div className="mb-3 flex items-center gap-3">
          <span className="from-primary to-primary-container text-on-primary flex size-10 items-center justify-center rounded-lg bg-gradient-to-br text-lg font-bold">
            ↻
          </span>
          <div>
            <p className="text-sm font-bold">הגשת תוכן</p>
            <p className="text-on-surface-variant text-xs">סטטוס: ממתין לבדיקה</p>
          </div>
        </div>
        <div className="border-outline-variant/30 bg-surface-low text-on-surface-variant flex h-20 items-center justify-center rounded-lg border border-dashed text-xs">
          קובץ וידאו
        </div>
      </div>

      {/* שלב 3 — תשלום שוחרר */}
      <div className="border-outline-variant/40 bg-surface-lowest shadow-ambient absolute start-6 bottom-6 w-60 rotate-2 rounded-xl border p-5">
        <div className="mb-3 flex items-center gap-3">
          <span className="bg-success-container text-success flex size-9 items-center justify-center rounded-full">
            <ShieldCheckIcon className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold">תשלום שוחרר</p>
            <p className="text-success text-xs">הועבר בהצלחה</p>
          </div>
        </div>
        <div className="border-outline-variant/30 bg-surface-low flex items-center justify-between rounded-lg border px-3 py-2">
          <span className="text-on-surface-variant text-xs font-semibold">חשבון יוצר</span>
          <span className="text-sm font-bold">+ ₪18,000</span>
        </div>
      </div>
    </div>
  );
}
