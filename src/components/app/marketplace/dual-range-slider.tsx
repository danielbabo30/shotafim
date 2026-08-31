"use client";

/**
 * סליידר טווח כפול (שתי ידיות) מעל שני input[type=range] שקופים חופפים.
 * העיצוב של המסילה, המילוי והידיות ב-globals.css תחת `.dual-range`.
 */
export function DualRangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
}: {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (next: [number, number]) => void;
  /** תיאור נגישות לקבוצה (למשל "טווח עוקבים") */
  label: string;
}) {
  const [lo, hi] = value;
  const pct = (n: number) => Math.max(0, Math.min(100, ((n - min) / (max - min)) * 100));

  return (
    <div className="dual-range" role="group" aria-label={label}>
      <span
        className="bg-surface-high pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full"
        aria-hidden
      />
      <span
        className="bg-primary pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
        style={{ insetInlineStart: `${pct(lo)}%`, insetInlineEnd: `${100 - pct(hi)}%` }}
        aria-hidden
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={lo}
        aria-label={`${label} — מינימום`}
        onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={hi}
        aria-label={`${label} — מקסימום`}
        onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
      />
    </div>
  );
}
