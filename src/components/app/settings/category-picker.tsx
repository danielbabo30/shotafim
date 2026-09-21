"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export type CategoryOption = { slug: string; name: string };

/**
 * בורר קטגוריות מרובה-בחירה (pills) — משותף לסקציית מותג ויוצר בהגדרות.
 * שולח את הבחירה כ-hidden input בשם "categories" (getAll בצד השרת).
 */
export function CategoryPicker({
  name = "categories",
  options,
  defaultSelected,
  error,
}: {
  name?: string;
  options: CategoryOption[];
  defaultSelected: string[];
  error?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));

  const toggle = (slug: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((c) => {
          const on = selected.has(c.slug);
          return (
            <button
              key={c.slug}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c.slug)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                on
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container",
              )}
            >
              {c.name}
            </button>
          );
        })}
      </div>
      {[...selected].map((slug) => (
        <input key={slug} type="hidden" name={name} value={slug} />
      ))}
      {error && <p className="text-on-error-container mt-1.5 text-xs font-medium">{error}</p>}
    </div>
  );
}
