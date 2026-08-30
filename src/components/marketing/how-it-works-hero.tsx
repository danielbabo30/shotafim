import { Container } from "@/components/ui/container";
import { LockIcon, ShieldCheckIcon, CheckIcon } from "@/components/marketing/icons";
import type { HowItWorks } from "@/payload-types";

/** Hero של עמוד "איך זה עובד" — כותרת ממורכזת עם חלק מודגש, תיאור, וויזואל תהליך דקורטיבי. */
export function HowItWorksHero({ hero }: { hero: HowItWorks["hero"] }) {
  return (
    <section className="relative overflow-hidden">
      <div className="from-surface-low via-background to-surface-lowest absolute inset-0 -z-10 bg-gradient-to-bl" />
      <div className="bg-primary/10 absolute -end-40 -top-40 -z-10 size-96 rounded-full blur-3xl" />
      <div className="bg-primary-fixed/40 absolute -start-24 top-24 -z-10 size-72 rounded-full blur-3xl" />

      <Container className="flex flex-col items-center gap-6 py-20 text-center lg:py-24">
        <h1 className="max-w-3xl text-4xl leading-tight font-bold text-balance sm:text-5xl">
          {hero.headingLead}
          <span className="from-primary to-primary-container bg-gradient-to-l bg-clip-text text-transparent">
            {hero.headingHighlight}
          </span>
          {hero.headingTail ? ` ${hero.headingTail}` : null}
        </h1>

        <p className="text-on-surface-variant max-w-2xl text-lg leading-relaxed">{hero.body}</p>

        <HeroVisual />
      </Container>
    </section>
  );
}

/** ויזואל דקורטיבי — פאנל "תהליך מאובטח". CSS בלבד. */
function HeroVisual() {
  return (
    <div className="border-outline-variant/40 bg-surface-lowest/70 shadow-ambient-lg mt-8 w-full max-w-4xl rounded-xl border p-6 backdrop-blur-md sm:p-8">
      <div className="border-outline-variant/40 mb-6 flex items-center justify-between border-b pb-4">
        <span className="text-sm font-bold">תהליך אבטחת פיקדון נאמנות</span>
        <span className="bg-success-container text-success rounded-full px-3 py-1 text-xs font-semibold">
          100% מאובטח
        </span>
      </div>

      <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="from-primary to-primary-container text-on-primary mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br">
          <LockIcon className="size-9" />
        </div>

        <ol className="grid gap-3 sm:grid-cols-2">
          {["הפקדת תקציב", "העלאת תוכן", "אישור סופי", "שחרור תשלום"].map((label, i) => (
            <li
              key={label}
              className="border-outline-variant/40 bg-surface-low flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold"
            >
              <span
                className={
                  i === 0
                    ? "bg-primary text-on-primary flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    : "border-outline-variant text-on-surface-variant flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold"
                }
              >
                {i === 0 ? <CheckIcon className="size-3.5" /> : i + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
      </div>

      <div className="border-outline-variant/40 text-on-surface-variant mt-6 flex items-center gap-2 border-t pt-4 text-xs">
        <ShieldCheckIcon className="text-primary size-4" />
        הכספים נעולים בנאמנות עד לאישור סופי — לשני הצדדים שקט נפשי.
      </div>
    </div>
  );
}
