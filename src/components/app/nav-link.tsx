"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NavIcon } from "@/components/app/nav-icon";
import type { NavItem } from "@/lib/app-nav";

/** האם הנתיב הנוכחי "בתוך" פריט הניווט */
function useIsActive(item: NavItem) {
  const pathname = usePathname();
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const active = useIsActive(item);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg border-s-4 px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary-fixed/60 text-on-primary-fixed"
          : "text-on-surface-variant hover:bg-surface-container border-transparent",
      )}
    >
      <NavIcon name={item.icon} className="size-5 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}
