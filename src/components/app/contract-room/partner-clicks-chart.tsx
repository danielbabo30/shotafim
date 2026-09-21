import type { PartnerClickPoint } from "@/lib/partner-dashboard";

/**
 * גרף עמודות זעיר של קליקים ל-14 יום — SVG inline, בלי ספרייה, בלי client.
 * דלג ברינדור כשאין לינק (COUPON בלבד) או כשאין קליקים כלל.
 */
export function PartnerClicksChart({ series }: { series: PartnerClickPoint[] }) {
  const max = Math.max(1, ...series.map((p) => p.count));
  const total = series.reduce((s, p) => s + p.count, 0);
  const W = 100;
  const H = 32;
  const gap = 1.5;
  const bw = (W - gap * (series.length - 1)) / series.length;

  return (
    <div className="border-outline-variant bg-surface-lowest flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-on-surface-variant text-xs">קליקים · 14 ימים אחרונים</span>
        <span className="text-on-surface text-xs font-semibold">
          {total.toLocaleString("en-US")}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-12 w-full"
        role="img"
        aria-label={`סך ${total} קליקים ב-14 הימים האחרונים`}
      >
        {series.map((p, i) => {
          const h = p.count === 0 ? 0.6 : (p.count / max) * (H - 2);
          return (
            <rect
              key={p.key}
              x={i * (bw + gap)}
              y={H - h}
              width={bw}
              height={h}
              rx={0.6}
              fill="currentColor"
              className={p.count === 0 ? "text-outline-variant" : "text-primary"}
            />
          );
        })}
      </svg>
      <div className="text-on-surface-variant flex justify-between text-[10px]">
        <span>{series[0]?.label}</span>
        <span>{series[series.length - 1]?.label}</span>
      </div>
    </div>
  );
}
