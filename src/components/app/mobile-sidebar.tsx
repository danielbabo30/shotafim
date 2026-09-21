"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MenuIcon, CloseIcon } from "@/components/marketing/icons";
import { SidebarContent } from "@/components/app/sidebar-content";
import type { RoleKey } from "@/lib/app-nav";

/** מגירת ניווט למובייל — כפתור ההפעלה בטופ-בר + פאנל נשלף */
export function MobileSidebar({ siteName, activeRole }: { siteName: string; activeRole: RoleKey }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const drawer = open ? (
    <div className="fixed inset-0 z-[100] lg:hidden">
      <div className="bg-on-surface/40 absolute inset-0" onClick={() => setOpen(false)} />
      <div className="bg-surface-lowest shadow-ambient-lg absolute inset-y-0 start-0 flex w-72 max-w-[85%] flex-col">
        <div className="flex justify-end p-2">
          <button
            type="button"
            aria-label="סגירת התפריט"
            onClick={() => setOpen(false)}
            className="hover:bg-surface-container rounded-lg p-2"
          >
            <CloseIcon className="size-6" />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <SidebarContent
            siteName={siteName}
            activeRole={activeRole}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="פתיחת התפריט"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="hover:bg-surface-container -ms-2 rounded-lg p-2"
      >
        <MenuIcon className="size-6" />
      </button>
      {drawer && typeof document !== "undefined" ? createPortal(drawer, document.body) : null}
    </div>
  );
}
