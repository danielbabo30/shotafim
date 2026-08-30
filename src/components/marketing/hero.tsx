import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { VerifiedIcon } from "@/components/marketing/icons";
import type { Homepage } from "@/payload-types";

/** Hero של עמוד הבית — תווית, כותרת עם חלק מודגש בגרדיאנט, תיאור, שני CTA, ויזואל מרחף. */
export function Hero({ hero }: { hero: Homepage["hero"] }) {
  return (
    <section className="relative overflow-hidden">
      {/* הילות רקע */}
      <div className="from-surface-low via-background to-surface-lowest absolute inset-0 -z-10 bg-gradient-to-bl" />
      <div className="bg-primary/10 absolute -end-40 -top-40 -z-10 size-96 rounded-full blur-2xl" />
      <div className="bg-primary-fixed/30 absolute -start-24 top-20 -z-10 size-72 rounded-full blur-2xl" />

      <Container className="grid items-center gap-16 py-20 lg:grid-cols-2 lg:py-28">
        <div className="flex flex-col items-start gap-6">
          {hero.badge && (
            <span className="bg-success-container text-success shadow-ambient-sm inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold">
              <VerifiedIcon className="size-4" />
              {hero.badge}
            </span>
          )}

          <h1 className="text-4xl leading-tight font-bold text-balance sm:text-5xl lg:text-[3.25rem]">
            {hero.headingLead}
            <span className="from-primary to-primary-container bg-gradient-to-l bg-clip-text text-transparent">
              {hero.headingHighlight}
            </span>
            {hero.headingTail ? ` ${hero.headingTail}` : null}
          </h1>

          <p className="text-on-surface-variant max-w-xl text-lg leading-relaxed">{hero.body}</p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            {hero.primaryCta?.href && (
              <Button href={hero.primaryCta.href} size="lg">
                {hero.primaryCta.label}
              </Button>
            )}
            {hero.secondaryCta?.href && (
              <Button href={hero.secondaryCta.href} variant="ghost" size="lg">
                {hero.secondaryCta.label}
              </Button>
            )}
          </div>
        </div>

        <HeroVisual />
      </Container>
    </section>
  );
}

/** ויזואל דקורטיבי — חלון דמה עם אלמנטים מרחפים. CSS בלבד. */
function HeroVisual() {
  return (
    <div className="relative hidden h-[460px] lg:block">
      <div className="from-surface-low via-surface-lowest to-surface-high shadow-ambient-lg absolute inset-6 rounded-xl bg-gradient-to-tr opacity-70" />
      <div className="border-outline-variant/40 bg-surface-lowest shadow-ambient-lg absolute inset-10 flex flex-col overflow-hidden rounded-xl border">
        <div className="border-outline-variant/40 flex h-11 items-center gap-2 border-b px-4">
          <span className="bg-error/70 size-3 rounded-full" />
          <span className="bg-outline/50 size-3 rounded-full" />
          <span className="bg-success/70 size-3 rounded-full" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
          <GridGlyph className="text-primary/30 size-16" />
          <div className="bg-surface-high h-4 w-48 rounded-full" />
          <div className="bg-surface-container h-3 w-32 rounded-full" />
        </div>
      </div>

      <div className="border-outline-variant/40 bg-surface-lowest shadow-ambient-lg absolute -start-2 top-16 -rotate-3 rounded-lg border p-3">
        <TrendGlyph className="text-success size-7" />
      </div>
      <div className="border-outline-variant/40 bg-surface-lowest shadow-ambient-lg absolute -end-1 bottom-20 rotate-3 rounded-lg border p-3">
        <BellGlyph className="text-primary size-6" />
      </div>
    </div>
  );
}

function GridGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}
function TrendGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 17l6-6 4 4 6-7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 8h4v4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function BellGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 20a2 2 0 004 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
