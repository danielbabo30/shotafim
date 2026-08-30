import { Container } from "@/components/ui/container";
import { ChevronDownIcon } from "@/components/marketing/icons";
import type { HowItWorks } from "@/payload-types";

/** אקורדיון שאלות נפוצות — <details> נטיבי, עובד גם בלי JS. */
export function FaqAccordion({ faq }: { faq: HowItWorks["faq"] }) {
  const items = faq.items ?? [];
  if (!items.length) return null;

  return (
    <section>
      <Container className="pb-24">
        <div className="border-outline-variant/40 bg-surface-lowest shadow-ambient-sm mx-auto max-w-3xl rounded-xl border p-6 sm:p-8">
          <h2 className="mb-6 text-2xl font-bold">{faq.heading}</h2>

          <div className="space-y-2">
            {items.map((item, i) => (
              <details
                key={item.id ?? i}
                className="group border-outline-variant/40 bg-surface-low rounded-lg border"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 text-start text-base font-semibold [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <ChevronDownIcon className="text-on-surface-variant size-5 shrink-0 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="text-on-surface-variant px-4 pb-4 text-sm leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
