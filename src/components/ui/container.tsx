import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** רוחב תוכן אחיד לכל האתר */
export function Container({
  children,
  className,
  as: Comp = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  return <Comp className={cn("mx-auto w-full max-w-7xl px-6", className)}>{children}</Comp>;
}
