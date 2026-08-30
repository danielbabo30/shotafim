import type { Media, GuideBlock } from "@/payload-types";
import type { RenderBlock } from "@/lib/post-content";

/**
 * צורת בלוק ידידותית-לרינדור למדריכים — הרחבה של `RenderBlock` (המאמרים)
 * עם שני בלוקים ייעודיים: `steps` (ציר שלבים ממוספר) ו-`caution` (אזהרה אדומה).
 * ה-normalization נעשה בשרת (src/lib/guides.ts); הרכיבים מקבלים את זה מוכן.
 */

export type GuideStep = {
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  anchor: string;
};

export type GuideRenderBlock =
  | RenderBlock
  | { type: "steps"; heading: string | null; steps: GuideStep[] }
  | { type: "caution"; title: string; body: string };

function mediaUrl(m: unknown): string | null {
  return m && typeof m === "object" && "url" in m ? ((m as Media).url ?? null) : null;
}
function mediaAlt(m: unknown, fallback: string): string {
  return m && typeof m === "object" && "alt" in m ? ((m as Media).alt ?? fallback) : fallback;
}

/** ממיר את בלוקי ה-CMS לרשימת GuideRenderBlock, כולל עוגני כותרות/שלבים יציבים. */
export function toGuideRenderBlocks(blocks: GuideBlock[]): GuideRenderBlock[] {
  let headingCount = 0;
  let stepCount = 0;
  const out: GuideRenderBlock[] = [];

  for (const b of blocks) {
    switch (b.blockType) {
      case "lead":
        out.push({ type: "lead", text: b.text });
        break;
      case "prose":
        out.push({ type: "prose", text: b.text });
        break;
      case "heading":
        out.push({
          type: "heading",
          level: b.level,
          text: b.text,
          anchor: `heading-${headingCount++}`,
        });
        break;
      case "image":
        out.push({
          type: "image",
          url: mediaUrl(b.image),
          alt: mediaAlt(b.image, b.caption ?? ""),
          caption: b.caption ?? null,
        });
        break;
      case "quote":
        out.push({ type: "quote", text: b.text, attribution: b.attribution ?? null });
        break;
      case "keyPoints":
        out.push({
          type: "keyPoints",
          title: b.title,
          points: (b.points ?? []).map((p) => p.text),
        });
        break;
      case "callout":
        out.push({ type: "callout", title: b.title, body: b.body });
        break;
      case "list":
        out.push({
          type: "list",
          ordered: Boolean(b.ordered),
          items: (b.items ?? []).map((it) => ({ lead: it.lead ?? null, text: it.text })),
        });
        break;
      case "steps":
        out.push({
          type: "steps",
          heading: b.heading ?? null,
          steps: (b.steps ?? []).map((s) => ({
            title: s.title,
            body: s.body,
            ctaLabel: s.ctaLabel ?? null,
            ctaHref: s.ctaHref ?? null,
            anchor: `step-${++stepCount}`,
          })),
        });
        break;
      case "caution":
        out.push({ type: "caution", title: b.title, body: b.body });
        break;
    }
  }

  return out;
}

/** פריטי הניווט הצדדי ("במדריך זה") — כותרות שלבים + כותרות H2, בסדר המסמך. */
export function getGuideTocItems(blocks: GuideRenderBlock[]): { anchor: string; text: string }[] {
  const items: { anchor: string; text: string }[] = [];
  for (const b of blocks) {
    if (b.type === "steps") {
      for (const s of b.steps) items.push({ anchor: s.anchor, text: s.title });
    } else if (b.type === "heading" && b.level === "h2") {
      items.push({ anchor: b.anchor, text: b.text });
    }
  }
  return items;
}
