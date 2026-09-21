import Link from "next/link";
import { cn } from "@/lib/cn";
import { LockIcon, CheckIcon } from "@/components/marketing/icons";
import { CONTRACT_STEPS, formatShekels, type CreatorContractVM } from "@/lib/dashboard-creator";

function ContractStepper({ step }: { step: CreatorContractVM["step"] }) {
  return (
    <div className="relative pt-1">
      <div className="relative z-10 flex justify-between">
        {CONTRACT_STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <div key={label} className="flex flex-1 flex-col items-center gap-1.5 text-center">
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full text-xs font-bold",
                  done && "bg-primary text-on-primary",
                  current && "border-primary text-primary bg-surface-lowest border-2",
                  !done && !current && "bg-surface-container text-outline",
                )}
              >
                {done ? <CheckIcon className="size-3.5" /> : n}
              </span>
              <span
                className={cn(
                  "text-[11px] leading-tight",
                  current ? "text-primary font-semibold" : "text-on-surface-variant",
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="bg-surface-container absolute start-8 end-8 top-[14px] -z-0 h-0.5">
        <div className="bg-primary h-full" style={{ width: `${((step - 1) / 3) * 100}%` }} />
      </div>
    </div>
  );
}

/** כרטיס חוזה בעבודה בלוח-הבקרה של היוצר — עם timeline 4 שלבים */
export function ContractProgressCard({ item }: { item: CreatorContractVM }) {
  const overdue = item.deadlineLabel.includes("באיחור");

  return (
    <article className="border-outline-variant bg-surface-lowest shadow-ambient-sm overflow-hidden rounded-xl border">
      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-on-surface text-base font-bold">{item.campaignTitle}</h3>
            <p className="text-on-surface-variant mt-0.5 text-sm">
              {item.brandName} · {item.stepHint}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
                overdue
                  ? "bg-error-container text-on-error-container"
                  : "bg-warning-container text-warning",
              )}
            >
              {item.deadlineLabel}
            </span>
            <span className="text-primary flex items-center gap-1 text-sm font-bold whitespace-nowrap">
              <LockIcon className="size-3.5" />
              {formatShekels(item.escrowAmount)} נעולים בנאמנות
            </span>
          </div>
        </div>

        {item.deliverables.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.deliverables.map((d) => (
              <span
                key={d}
                className="bg-surface-container text-on-surface-variant rounded px-2 py-1 text-xs font-medium"
              >
                {d}
              </span>
            ))}
          </div>
        )}

        <ContractStepper step={item.step} />
      </div>

      <div className="border-outline-variant bg-surface-low flex justify-end border-t p-4">
        <Link
          href={item.cta.href}
          className={cn(
            "inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold transition-colors",
            item.cta.primary
              ? "bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm"
              : "border-outline text-primary hover:bg-surface-container border",
          )}
        >
          {item.cta.label}
        </Link>
      </div>
    </article>
  );
}
