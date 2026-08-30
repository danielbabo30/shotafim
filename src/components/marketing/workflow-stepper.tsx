import { Container } from "@/components/ui/container";

type Step = { title: string; body: string; id?: string | null };
type Workflow = {
  heading: string;
  subheading?: string | null;
  steps?: (Step | null)[] | null;
};

/**
 * שלושה שלבים בשורה, ממוספרים, מחוברים בקו אופקי (דסקטופ).
 * מספר קבוע של שלבים (3) — הפריסה מותאמת לכך.
 */
export function WorkflowStepper({ workflow }: { workflow: Workflow }) {
  const steps = (workflow.steps ?? []).filter((s): s is Step => Boolean(s));
  if (!steps.length) return null;

  return (
    <section className="bg-surface-low border-outline-variant/40 border-y">
      <Container className="py-24">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">{workflow.heading}</h2>
          {workflow.subheading && (
            <p className="text-on-surface-variant mt-3 text-base leading-relaxed">
              {workflow.subheading}
            </p>
          )}
        </div>

        <ol className="relative grid gap-8 md:grid-cols-3">
          {/* קו מחבר — דסקטופ בלבד */}
          <span
            aria-hidden
            className="bg-outline-variant/40 absolute start-[16.66%] end-[16.66%] top-8 hidden h-px md:block"
          />

          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            return (
              <li
                key={step.id ?? i}
                className="border-outline-variant/40 bg-surface-lowest shadow-ambient-sm relative z-10 flex flex-col items-center rounded-xl border p-8 text-center"
              >
                <span
                  className={`font-display mb-6 flex size-16 items-center justify-center rounded-full text-xl font-bold ${
                    isLast
                      ? "bg-primary text-on-primary shadow-ambient-lg"
                      : "border-primary text-primary bg-surface border-2"
                  }`}
                >
                  {i + 1}
                </span>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="text-on-surface-variant mt-2 text-sm leading-relaxed">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
