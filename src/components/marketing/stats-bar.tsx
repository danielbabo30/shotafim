import { Container } from "@/components/ui/container";

type Stat = { value: string; label: string; id?: string | null };

/** רצועת מספרים מרכזיים. משותפת לעמוד הבית ולעמודי הפתרונות. */
export function StatsBar({ stats }: { stats: Stat[] }) {
  if (!stats.length) return null;

  return (
    <section className="border-outline-variant/40 bg-surface-low border-y">
      <Container className="py-14">
        <dl className="grid gap-y-8 text-center sm:grid-cols-3">
          {stats.map((stat, i) => (
            <div
              key={stat.id ?? i}
              className="border-outline-variant/40 flex flex-col items-center gap-1 sm:px-8 sm:[&:not(:first-child)]:border-s"
            >
              <dt className="text-primary font-display text-4xl font-bold tracking-tight">
                {stat.value}
              </dt>
              <dd className="text-on-surface-variant text-sm font-semibold tracking-wide">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
