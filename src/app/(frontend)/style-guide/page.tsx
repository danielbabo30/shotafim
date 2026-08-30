import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Style Guide",
  robots: { index: false },
};

const COLORS: { name: string; var: string }[] = [
  { name: "primary", var: "--color-primary" },
  { name: "primary-hover", var: "--color-primary-hover" },
  { name: "primary-container", var: "--color-primary-container" },
  { name: "surface", var: "--color-surface" },
  { name: "surface-low", var: "--color-surface-low" },
  { name: "surface-container", var: "--color-surface-container" },
  { name: "surface-high", var: "--color-surface-high" },
  { name: "on-surface", var: "--color-on-surface" },
  { name: "on-surface-variant", var: "--color-on-surface-variant" },
  { name: "outline", var: "--color-outline" },
  { name: "outline-variant", var: "--color-outline-variant" },
  { name: "error", var: "--color-error" },
  { name: "success", var: "--color-success" },
  { name: "warning", var: "--color-warning" },
];

const RADII = ["sm", "DEFAULT", "md", "lg", "xl"] as const;

export default function StyleGuidePage() {
  return (
    <Container className="flex flex-col gap-16 py-16">
      <header>
        <h1 className="text-4xl font-bold">Style Guide — שותפים</h1>
        <p className="text-on-surface-variant mt-2">
          רפרנס חי של ה-Design Tokens והרכיבים. מקור: DESIGN.md.
        </p>
      </header>

      {/* צבעים */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">צבעים</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {COLORS.map((c) => (
            <div key={c.name} className="border-outline-variant overflow-hidden rounded-lg border">
              <div className="h-20" style={{ background: `var(${c.var})` }} />
              <div className="bg-surface-lowest p-3">
                <div className="font-mono text-xs font-semibold">{c.name}</div>
                <div className="text-on-surface-variant font-mono text-xs">var({c.var})</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* טיפוגרפיה */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">טיפוגרפיה</h2>
        <div className="border-outline-variant bg-surface-lowest flex flex-col gap-3 rounded-lg border p-6">
          <p className="font-display text-5xl font-bold tracking-[-0.04em]">
            Display · כותרת ראשית
          </p>
          <p className="font-display text-3xl font-semibold tracking-[-0.02em]">
            Headline · כותרת משנית
          </p>
          <p className="font-display text-xl font-semibold">Headline מדיום · כותרת קטנה</p>
          <p className="text-lg">Body large · פסקת גוף גדולה לקריאה נוחה של טקסט ארוך.</p>
          <p className="text-base">Body medium · פסקת גוף רגילה עם מידע.</p>
          <p className="text-on-surface-variant text-sm">Body small · הערות ומטא-מידע.</p>
        </div>
        <p className="text-on-surface-variant text-sm">
          כותרות: <span className="font-display font-semibold">Assistant</span> · גוף:{" "}
          <span className="font-semibold">Heebo</span>
        </p>
      </section>

      {/* כפתורים */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">כפתורים</h2>
        <div className="border-outline-variant bg-surface-lowest flex flex-wrap items-center gap-4 rounded-lg border p-6">
          <Button variant="primary" size="md">
            Primary · MD
          </Button>
          <Button variant="primary" size="lg">
            Primary · LG (CTA)
          </Button>
          <Button variant="ghost" size="md">
            Ghost · MD
          </Button>
          <Button variant="ghost" size="lg">
            Ghost · LG
          </Button>
          <Button variant="primary" size="md" disabled>
            Disabled
          </Button>
        </div>
      </section>

      {/* רדיוסים וצללים */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">רדיוסים וצללים</h2>
        <div className="flex flex-wrap gap-6">
          {RADII.map((r) => (
            <div key={r} className="flex flex-col items-center gap-2">
              <div
                className="bg-surface-container border-outline-variant size-20 border"
                style={{ borderRadius: `var(--radius-${r})` }}
              />
              <span className="font-mono text-xs">rounded-{r === "DEFAULT" ? "" : r}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-6 pt-2">
          {(["shadow-ambient-sm", "shadow-ambient", "shadow-ambient-lg"] as const).map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div className={`bg-surface-lowest size-20 rounded-lg ${s}`} />
              <span className="font-mono text-xs">{s}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Cards & Chips */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">כרטיסים ותגיות</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm rounded-lg border p-6">
            <h3 className="font-display font-semibold">כרטיס בסיסי</h3>
            <p className="text-on-surface-variant mt-1 text-sm">
              רקע לבן, מסגרת 1px, פינות 16px, ריפוד 24px.
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <Chip tone="success">פעיל</Chip>
            <Chip tone="warning">ממתין</Chip>
            <Chip tone="error">נכשל</Chip>
            <Chip tone="primary">חדש</Chip>
          </div>
        </div>
      </section>
    </Container>
  );
}

function Chip({
  tone,
  children,
}: {
  tone: "success" | "warning" | "error" | "primary";
  children: React.ReactNode;
}) {
  const tones = {
    success: "bg-success-container text-success",
    warning: "bg-warning-container text-warning",
    error: "bg-error-container text-on-error-container",
    primary: "bg-primary-fixed text-on-primary-fixed",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
