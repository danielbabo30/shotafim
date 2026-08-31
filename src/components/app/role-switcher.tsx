"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { CheckIcon, ChevronDownIcon, SwapIcon } from "@/components/marketing/icons";
import { setActiveRole } from "@/lib/actions/app-actions";
import { ROLE_META, type RoleKey } from "@/lib/app-nav";

/**
 * מתג החלפת "כובע" למי שיש כמה תפקידים.
 * כל אפשרות היא <form> שמפעיל server action — עובד גם בלי JS.
 * עם JS: נסגר אוטומטית ומרענן את המעטפת.
 */
export function RoleSwitcher({
  roleKeys,
  activeRole,
}: {
  roleKeys: RoleKey[];
  activeRole: RoleKey;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (roleKeys.length < 2) return null;

  const current = ROLE_META[activeRole];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="border-outline-variant bg-surface-lowest text-on-surface-variant hover:bg-surface-container flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
      >
        <span>{current.emoji}</span>
        <span>{current.label}</span>
        <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-outline-variant bg-surface-lowest shadow-ambient absolute end-0 top-full z-50 mt-2 min-w-60 rounded-lg border p-1.5">
          <p className="text-on-surface-variant flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold">
            <SwapIcon className="size-4" />
            החלפת מצב עבודה
          </p>
          {roleKeys.map((key) => {
            const meta = ROLE_META[key];
            const isCurrent = key === activeRole;
            return (
              <form
                key={key}
                action={async (formData) => {
                  await setActiveRole(formData);
                  setOpen(false);
                  router.refresh();
                }}
              >
                <input type="hidden" name="role" value={key} />
                <button
                  type="submit"
                  disabled={isCurrent}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-start text-sm transition-colors",
                    isCurrent
                      ? "text-on-surface font-semibold"
                      : "text-on-surface-variant hover:bg-surface-container",
                  )}
                >
                  <span>{meta.emoji}</span>
                  <span className="flex-1">{meta.label}</span>
                  {isCurrent && <CheckIcon className="text-primary size-4" />}
                </button>
              </form>
            );
          })}
        </div>
      )}
    </div>
  );
}
