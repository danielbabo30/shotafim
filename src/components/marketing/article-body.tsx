import { ProseBlock } from "@/components/marketing/prose-blocks";
import type { RenderBlock } from "@/lib/post-content";

/** גוף המאמר — ממפה בלוקי CMS לפלט מעוצב. שומר על היררכיית H2/H3. */
export function ArticleBody({ blocks }: { blocks: RenderBlock[] }) {
  return (
    <div className="max-w-none">
      {blocks.map((block, i) => (
        <ProseBlock key={i} block={block} />
      ))}
    </div>
  );
}
