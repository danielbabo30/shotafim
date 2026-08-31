import Link from "next/link";
import { cn } from "@/lib/cn";
import { LockIcon, ArrowIcon } from "@/components/marketing/icons";
import type { ConversationContext } from "@/lib/messages";

/**
 * רצועת ההקשר של השיחה — צ'יפ "חוזה פעיל בנאמנות" + מעבר לחדר העבודה.
 * מוצגת רק כשלשיחה יש הקשר חוזה (context.kind === "contract").
 */
export function ThreadContextBar({ context }: { context: ConversationContext }) {
  if (context.kind !== "contract") return null;

  return (
    <div className="border-outline-variant bg-surface-low flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
      <span className="border-outline-variant bg-surface-lowest text-on-surface-variant inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
        <LockIcon className="size-3.5" />
        {typeof context.escrowAmountILS === "number"
          ? `חוזה פעיל בנאמנות: ₪${context.escrowAmountILS.toLocaleString("en-US")}`
          : "חוזה פעיל בנאמנות"}
      </span>

      {context.workspaceHref ? (
        <Link
          href={context.workspaceHref}
          className={cn(
            "bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm",
            "inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors",
          )}
        >
          מעבר לחדר עבודה ואישור סקיצה
          <ArrowIcon className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}
