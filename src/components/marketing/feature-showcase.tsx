import type { ComponentType } from "react";
import { Container } from "@/components/ui/container";
import {
  GridIcon,
  BankIcon,
  ShieldCheckIcon,
  ReceiptIcon,
  ChatIcon,
  RocketIcon,
  BoltIcon,
  LockIcon,
  CalendarIcon,
  ChartBarIcon,
  CheckIcon,
} from "@/components/marketing/icons";

/**
 * מקטע יתרונות בפריסת זיג-זג — לכל פריט אייקון, כותרת, תיאור ורשימת נקודות
 * אופציונלית, לצד ויזואל דמה. הויזואל מתחלף צד בכל שורה. CSS בלבד.
 * משותף לעמודי הפתרונות (creators / brands / ad-spaces).
 */

type ShowcasePoint = { text: string; id?: string | null };
type ShowcaseItem = {
  icon: string;
  title: string;
  body: string;
  points?: (ShowcasePoint | null)[] | null;
  id?: string | null;
};
type Showcase = {
  heading?: string | null;
  items?: (ShowcaseItem | null)[] | null;
};

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  workspace: GridIcon,
  wallet: BankIcon,
  shield: ShieldCheckIcon,
  receipt: ReceiptIcon,
  chat: ChatIcon,
  rocket: RocketIcon,
  bolt: BoltIcon,
  lock: LockIcon,
  chart: ChartBarIcon,
  calendar: CalendarIcon,
};

export function FeatureShowcase({ showcase }: { showcase: Showcase }) {
  const items = (showcase.items ?? []).filter((i): i is ShowcaseItem => Boolean(i));
  if (!items.length) return null;

  return (
    <section className="bg-surface">
      <Container className="flex flex-col gap-20 py-24 lg:gap-28">
        {showcase.heading && (
          <h2 className="mx-auto max-w-3xl text-center text-3xl font-bold text-balance sm:text-4xl">
            {showcase.heading}
          </h2>
        )}

        {items.map((item, i) => {
          const Icon = ICONS[item.icon] ?? GridIcon;
          const flip = i % 2 === 1;
          const points = (item.points ?? []).filter((p): p is ShowcasePoint => Boolean(p));
          return (
            <div
              key={item.id ?? i}
              className="flex flex-col items-center gap-12 md:flex-row lg:gap-20"
            >
              <div className={`w-full md:w-1/2 ${flip ? "md:order-2" : ""}`}>
                <div className="bg-surface-container text-primary border-primary-fixed mb-6 flex size-12 items-center justify-center rounded-full border">
                  <Icon className="size-6" />
                </div>
                <h3 className="text-2xl font-bold sm:text-3xl">{item.title}</h3>
                <p className="text-on-surface-variant mt-4 text-base leading-relaxed">
                  {item.body}
                </p>

                {points.length > 0 && (
                  <ul className="mt-6 space-y-3">
                    {points.map((p, pi) => (
                      <li
                        key={p.id ?? pi}
                        className="text-on-surface flex items-start gap-3 text-sm font-medium"
                      >
                        <span className="bg-success-container text-success mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                          <CheckIcon className="size-3" />
                        </span>
                        {p.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={`w-full md:w-1/2 ${flip ? "md:order-1" : ""}`}>
                <ShowcasePanel icon={<Icon className="size-7" />} />
              </div>
            </div>
          );
        })}
      </Container>
    </section>
  );
}

/** ויזואל דמה גנרי — כרטיס עם שלד תוכן. */
function ShowcasePanel({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="bg-primary/5 absolute -inset-4 rounded-2xl blur-xl" />
      <div className="border-outline-variant/40 bg-surface-lowest shadow-ambient-lg relative rounded-xl border p-6">
        <div className="border-outline-variant/40 mb-4 flex items-center gap-3 border-b pb-4">
          <span className="from-primary to-primary-container text-on-primary flex size-10 items-center justify-center rounded-lg bg-gradient-to-br">
            {icon}
          </span>
          <div className="flex-1 space-y-1.5">
            <div className="bg-surface-high h-2.5 w-2/3 rounded-full" />
            <div className="bg-surface-container h-2 w-1/3 rounded-full" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((r) => (
            <div
              key={r}
              className="border-outline-variant/30 bg-surface-low flex items-center gap-3 rounded-lg border px-4 py-3"
            >
              <span className="bg-primary-fixed size-6 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="bg-surface-container h-2 w-4/5 rounded-full" />
                <div className="bg-surface-container h-2 w-2/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
