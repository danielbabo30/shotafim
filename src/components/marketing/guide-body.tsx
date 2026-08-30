import { ProseBlock } from "@/components/marketing/prose-blocks";
import { GuideSteps } from "@/components/marketing/guide-steps";
import { GuideCaution } from "@/components/marketing/guide-caution";
import type { GuideRenderBlock } from "@/lib/guide-content";

/** גוף המדריך — ממפה בלוקים לפלט מעוצב. steps/caution ייעודיים, השאר משותף עם המאמרים. */
export function GuideBody({ blocks }: { blocks: GuideRenderBlock[] }) {
  return (
    <div className="max-w-none">
      {blocks.map((block, i) => {
        if (block.type === "steps") {
          return <GuideSteps key={i} heading={block.heading} steps={block.steps} />;
        }
        if (block.type === "caution") {
          return <GuideCaution key={i} title={block.title} body={block.body} />;
        }
        return <ProseBlock key={i} block={block} />;
      })}
    </div>
  );
}
