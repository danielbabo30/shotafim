import type { Media, PostBlock } from "@/payload-types";

/**
 * צורת בלוק ידידותית-לרינדור — כל המדיה כבר פתורה ל-URL.
 * ה-normalization נעשה בשרת (src/lib/posts.ts); הרכיבים מקבלים את זה מוכן.
 */
export type RenderBlock =
  | { type: "lead"; text: string }
  | { type: "prose"; text: string }
  | { type: "heading"; level: "h2" | "h3"; text: string; anchor: string }
  | { type: "image"; url: string | null; alt: string; caption: string | null }
  | { type: "quote"; text: string; attribution: string | null }
  | { type: "keyPoints"; title: string; points: string[] }
  | { type: "callout"; title: string; body: string }
  | { type: "list"; ordered: boolean; items: { lead: string | null; text: string }[] };

function mediaUrl(m: unknown): string | null {
  return m && typeof m === "object" && "url" in m ? ((m as Media).url ?? null) : null;
}
function mediaAlt(m: unknown, fallback: string): string {
  return m && typeof m === "object" && "alt" in m ? ((m as Media).alt ?? fallback) : fallback;
}

/** ממיר את בלוקי ה-CMS לרשימת RenderBlock, כולל עוגני כותרות יציבים. */
export function toRenderBlocks(blocks: PostBlock[]): RenderBlock[] {
  let headingCount = 0;
  const out: RenderBlock[] = [];

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
    }
  }

  return out;
}

/** כותרות ה-H2 בלבד — לניווט הצדדי (TOC). */
export function getTocItems(blocks: RenderBlock[]): { anchor: string; text: string }[] {
  return blocks
    .filter((b): b is Extract<RenderBlock, { type: "heading" }> => b.type === "heading")
    .filter((b) => b.level === "h2")
    .map((b) => ({ anchor: b.anchor, text: b.text }));
}

/** פסקאות מטקסט חופשי — שורה ריקה כפולה = פסקה. */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}
