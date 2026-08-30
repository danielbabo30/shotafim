import Link from "next/link";
import type { ComponentType } from "react";
import {
  RocketIcon,
  BankIcon,
  UploadFileIcon,
  GavelIcon,
  ClockIcon,
  ArrowIcon,
} from "@/components/marketing/icons";
import type { GuideCategoryIcon } from "@/lib/guide-categories";
import type { GuideListItem } from "@/lib/guides";

export const CATEGORY_ICONS: Record<GuideCategoryIcon, ComponentType<{ className?: string }>> = {
  rocket: RocketIcon,
  bank: BankIcon,
  upload: UploadFileIcon,
  gavel: GavelIcon,
};

/** כרטיס קטגוריה בלובי — אייקון, כותרת, תיאור ורשימת מדריכים מקושרים. */
export function GuideCategoryCard({
  label,
  description,
  icon,
  guides,
  total,
}: {
  label: string;
  description: string;
  icon: GuideCategoryIcon;
  guides: GuideListItem[];
  total: number;
}) {
  const Icon = CATEGORY_ICONS[icon] ?? RocketIcon;
  const shown = guides.slice(0, 4);
  const remaining = total - shown.length;

  return (
    <div className="border-outline-variant/60 bg-surface-lowest shadow-ambient-sm hover:shadow-ambient group flex flex-col rounded-xl border p-6 transition-shadow">
      <span className="bg-primary-fixed text-primary flex size-12 items-center justify-center rounded-lg">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-4 text-lg font-bold">{label}</h3>
      <p className="text-on-surface-variant mt-1 text-sm leading-relaxed">{description}</p>

      <ul className="mt-5 space-y-3 text-sm">
        {shown.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guides/${g.slug}`}
              className="text-primary hover:text-primary-hover flex items-start gap-2 font-medium hover:underline"
            >
              <ArrowIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                {g.title}
                <span className="text-on-surface-variant ms-2 me-1 font-normal whitespace-nowrap">
                  · {g.readingMinutes} דק׳
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {remaining > 0 && (
        <p className="text-on-surface-variant mt-4 flex items-center gap-1.5 text-xs">
          <ClockIcon className="size-3.5" />
          ועוד {remaining} מדריכים בקטגוריה
        </p>
      )}
    </div>
  );
}
