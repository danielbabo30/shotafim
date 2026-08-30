import { BoltIcon, CheckCircleIcon } from "@/components/marketing/icons";
import { cn } from "@/lib/cn";
import { splitParagraphs, type RenderBlock } from "@/lib/post-content";

/**
 * רינדור בלוק גוף בודד — מקור אמת יחיד לבלוקים המשותפים
 * (מאמרים דרך `ArticleBody`, מדריכים דרך `GuideBody`).
 * שומר על היררכיית H2/H3 עם עוגנים יציבים.
 */
export function ProseBlock({ block }: { block: RenderBlock }) {
  switch (block.type) {
    case "lead":
      return (
        <p className="text-on-surface-variant mb-8 text-lg leading-relaxed font-medium sm:text-xl">
          {block.text}
        </p>
      );

    case "prose":
      return (
        <>
          {splitParagraphs(block.text).map((p, i) => (
            <p key={i} className="text-on-surface-variant mb-6 leading-[1.8]">
              {p}
            </p>
          ))}
        </>
      );

    case "heading":
      if (block.level === "h3") {
        return (
          <h3 id={block.anchor} className="mt-8 mb-3 scroll-mt-28 text-xl font-bold">
            {block.text}
          </h3>
        );
      }
      return (
        <h2
          id={block.anchor}
          className="border-primary mt-12 mb-4 scroll-mt-28 border-s-4 ps-3 text-2xl font-bold"
        >
          {block.text}
        </h2>
      );

    case "image":
      return (
        <figure className="border-outline-variant/60 bg-surface-lowest my-8 overflow-hidden rounded-xl border p-1">
          {block.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.url} alt={block.alt} loading="lazy" className="w-full rounded-lg" />
          )}
          {block.caption && (
            <figcaption className="text-on-surface-variant px-2 pt-2 pb-1 text-center text-sm">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "quote":
      return (
        <blockquote className="border-primary bg-surface-highest text-on-surface-variant my-8 rounded-e-xl border-s-4 p-6 text-lg italic">
          <p>{block.text}</p>
          {block.attribution && (
            <cite className="text-on-surface-variant mt-3 block text-sm not-italic">
              — {block.attribution}
            </cite>
          )}
        </blockquote>
      );

    case "keyPoints":
      return (
        <div className="border-outline-variant/60 bg-surface-low shadow-ambient-sm my-8 rounded-xl border p-6">
          <p className="mb-4 font-bold">{block.title}</p>
          <ul className="space-y-3">
            {block.points.map((point, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircleIcon className="text-primary mt-0.5 size-5 shrink-0" />
                <span className="text-on-surface-variant">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "list": {
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag
          className={cn(
            "text-on-surface-variant mb-6 space-y-2 ps-6",
            block.ordered ? "list-decimal" : "list-disc",
          )}
        >
          {block.items.map((item, i) => (
            <li key={i} className="marker:text-outline ps-1 leading-[1.8]">
              {item.lead && <strong className="text-on-surface font-semibold">{item.lead} </strong>}
              {item.text}
            </li>
          ))}
        </ListTag>
      );
    }

    case "callout":
      return (
        <div className="bg-inverse-surface text-inverse-on-surface my-8 flex items-start gap-4 rounded-xl p-6">
          <span className="bg-primary/25 text-primary-fixed flex size-10 shrink-0 items-center justify-center rounded-full">
            <BoltIcon className="size-5" />
          </span>
          <div>
            <p className="mb-2 font-bold">{block.title}</p>
            <p className="text-sm leading-relaxed opacity-90">{block.body}</p>
          </div>
        </div>
      );
  }
}
