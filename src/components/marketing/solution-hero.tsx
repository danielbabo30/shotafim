import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { VerifiedIcon, TrendUpIcon } from "@/components/marketing/icons";

type Cta = { label: string; href: string };

type Props = {
  badge?: string | null;
  headingLead: string;
  headingHighlight: string;
  headingTail?: string | null;
  body: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
};

/**
 * Hero ממורכז לעמודי הפתרונות — תווית, כותרת עם חלק מודגש בגרדיאנט,
 * תיאור, שני CTA וויזואל דמה של לוח בקרה. CSS בלבד.
 */
export function SolutionHero({
  badge,
  headingLead,
  headingHighlight,
  headingTail,
  body,
  primaryCta,
  secondaryCta,
}: Props) {
  return (
    <section className="relative overflow-hidden">
      <div className="from-surface-low via-background to-surface-lowest absolute inset-0 -z-10 bg-gradient-to-bl" />
      <div className="bg-primary/10 absolute -end-40 -top-40 -z-10 size-96 rounded-full blur-3xl" />
      <div className="bg-primary-fixed/40 absolute -start-24 top-24 -z-10 size-72 rounded-full blur-3xl" />

      <Container className="flex flex-col items-center gap-6 py-20 text-center lg:py-24">
        {badge && (
          <span className="bg-surface-container text-primary border-primary-fixed shadow-ambient-sm inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold">
            <VerifiedIcon className="size-4" />
            {badge}
          </span>
        )}

        <h1 className="max-w-4xl text-4xl leading-tight font-bold text-balance sm:text-5xl">
          {headingLead}{" "}
          <span className="from-primary to-primary-container bg-gradient-to-l bg-clip-text text-transparent">
            {headingHighlight}
          </span>
          {headingTail ? ` ${headingTail}` : null}
        </h1>

        <p className="text-on-surface-variant max-w-2xl text-lg leading-relaxed">{body}</p>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          {primaryCta?.href && (
            <Button href={primaryCta.href} size="lg">
              {primaryCta.label}
            </Button>
          )}
          {secondaryCta?.href && (
            <Button href={secondaryCta.href} variant="ghost" size="lg">
              {secondaryCta.label}
            </Button>
          )}
        </div>

        <DashboardVisual />
      </Container>
    </section>
  );
}

/** ויזואל דקורטיבי — חלון דמה של לוח בקרה ליוצר. */
function DashboardVisual() {
  return (
    <div className="border-outline-variant/40 bg-surface-lowest shadow-ambient-lg mt-12 w-full max-w-4xl overflow-hidden rounded-xl border">
      <div className="border-outline-variant/40 bg-surface-low flex h-9 items-center gap-2 border-b px-4">
        <span className="bg-error/70 size-3 rounded-full" />
        <span className="bg-outline/50 size-3 rounded-full" />
        <span className="bg-success/70 size-3 rounded-full" />
      </div>

      <div className="grid gap-5 p-6 text-start sm:grid-cols-[1fr_1.4fr] sm:p-8">
        {/* יתרה בארנק */}
        <div className="border-outline-variant/40 from-primary to-primary-container text-on-primary flex flex-col justify-between rounded-lg border-0 bg-gradient-to-br p-5">
          <span className="text-xs font-semibold opacity-90">יתרה זמינה למשיכה</span>
          <span className="mt-3 text-3xl font-bold tracking-tight">₪48,756</span>
          <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <TrendUpIcon className="size-3.5" />
            8.1%+ החודש
          </span>
        </div>

        {/* גרף עולה */}
        <div className="border-outline-variant/40 bg-surface-low rounded-lg border p-5">
          <span className="text-on-surface-variant text-xs font-semibold">הכנסות — 6 חודשים</span>
          <div className="mt-4 flex h-24 items-end gap-2">
            {[38, 52, 46, 64, 58, 82].map((h, i) => (
              <span
                key={i}
                className="bg-primary/70 flex-1 rounded-t-sm"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* תנועות אחרונות */}
        <div className="border-outline-variant/40 bg-surface-low rounded-lg border p-5 sm:col-span-2">
          <span className="text-on-surface-variant text-xs font-semibold">תשלומים אחרונים</span>
          <ul className="mt-3 space-y-2.5">
            {[
              { name: "קמפיין קיץ · מותג אופנה", amount: "₪12,400" },
              { name: "סרטון ביקורת מוצר", amount: "₪6,800" },
              { name: "סטורי משותף · אפליקציה", amount: "₪3,200" },
            ].map((row) => (
              <li key={row.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5">
                  <span className="bg-success-container text-success flex size-6 items-center justify-center rounded-full text-xs font-bold">
                    ✓
                  </span>
                  <span className="text-on-surface-variant">{row.name}</span>
                </span>
                <span className="font-bold">+ {row.amount}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
