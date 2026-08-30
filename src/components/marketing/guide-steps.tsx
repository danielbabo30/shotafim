import { Button } from "@/components/ui/button";
import type { GuideStep } from "@/lib/guide-content";

/** ציר שלבים ממוספר — עיגול מספר, קו מחבר רציף וכרטיס לכל שלב. */
export function GuideSteps({ heading, steps }: { heading: string | null; steps: GuideStep[] }) {
  if (!steps.length) return null;

  return (
    <div className="my-10">
      {heading && <h2 className="mb-6 text-2xl font-bold">{heading}</h2>}
      <ol className="space-y-5">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <li key={step.anchor} id={step.anchor} className="flex scroll-mt-28 gap-5">
              <div className="flex flex-col items-center">
                <span className="bg-primary text-on-primary flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold">
                  {i + 1}
                </span>
                {!isLast && <span className="bg-outline-variant/50 mt-1 w-px flex-1" />}
              </div>
              <div className="border-outline-variant/60 bg-surface-lowest shadow-ambient-sm flex-1 rounded-xl border p-6">
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="text-on-surface-variant mt-2 leading-relaxed">{step.body}</p>
                {step.ctaLabel && step.ctaHref && (
                  <Button href={step.ctaHref} size="md" className="mt-4">
                    {step.ctaLabel}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
