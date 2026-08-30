import { Container } from "@/components/ui/container";
import { CheckIcon, CloseIcon, WarningIcon, ShieldCheckIcon } from "@/components/marketing/icons";
import type { HowItWorks } from "@/payload-types";

/** שתי כרטיסיות זו לצד זו — השיטה הישנה (ללא הגנה) מול עסקה מוגנת במערכת. */
export function ComparisonCards({ comparison }: { comparison: HowItWorks["comparison"] }) {
  const oldPoints = comparison.oldWay.points ?? [];
  const newPoints = comparison.newWay.points ?? [];

  return (
    <section>
      <Container className="py-20">
        <h2 className="mb-12 text-center text-3xl font-bold sm:text-4xl">{comparison.heading}</h2>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {/* השיטה הישנה */}
          <article className="border-outline-variant/40 bg-surface-container/50 flex flex-col rounded-xl border p-8">
            <div className="border-outline-variant/40 mb-5 flex items-center gap-3 border-b pb-4">
              <WarningIcon className="text-error size-6 shrink-0" />
              <h3 className="text-xl font-bold">{comparison.oldWay.title}</h3>
            </div>
            <ul className="space-y-4">
              {oldPoints.map((p, i) => (
                <li
                  key={p.id ?? i}
                  className="text-on-surface-variant flex items-start gap-3 text-base leading-relaxed"
                >
                  <CloseIcon className="text-outline mt-1 size-4 shrink-0" />
                  <span>{p.text}</span>
                </li>
              ))}
            </ul>
          </article>

          {/* עסקה מוגנת */}
          <article className="border-primary bg-surface-lowest shadow-ambient relative flex flex-col overflow-hidden rounded-xl border-2 p-8">
            <div className="bg-primary/10 pointer-events-none absolute -end-16 -top-16 size-40 rounded-full blur-3xl" />
            <div className="border-primary/20 relative mb-5 flex items-center gap-3 border-b pb-4">
              <ShieldCheckIcon className="text-primary size-6 shrink-0" />
              <h3 className="text-xl font-bold">{comparison.newWay.title}</h3>
            </div>
            <ul className="relative space-y-4">
              {newPoints.map((p, i) => (
                <li key={p.id ?? i} className="flex items-start gap-3 text-base leading-relaxed">
                  <span className="bg-success-container text-success mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                    <CheckIcon className="size-3" />
                  </span>
                  <span>
                    {p.lead && <strong className="font-bold">{p.lead} </strong>}
                    {p.text}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </Container>
    </section>
  );
}
