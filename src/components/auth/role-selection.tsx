"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { RegisterRolesRole } from "@/payload-types";
import { cn } from "@/lib/cn";
import { saveRoles } from "@/lib/actions/registration-actions";
import {
  MegaphoneIcon,
  VideoIcon,
  ScreenIcon,
  CheckIcon,
  CheckCircleIcon,
  ArrowIcon,
  InfoIcon,
} from "@/components/marketing/icons";

type RoleKey = "brand" | "creator" | "space";

const ICONS = {
  brand: MegaphoneIcon,
  creator: VideoIcon,
  space: ScreenIcon,
} as const;

/**
 * שלב 2 בהרשמה — בחירת תפקיד (רב-בחירה).
 * שלושת התפקידים קבועים; הטקסטים מגיעים מ-CMS.
 * שליחה → server action saveRoles שכותב את user.roles ומנתב לשלב 3.
 */
export function RoleSelection({
  brand,
  creator,
  space,
  initialSelected = [],
}: {
  brand: RegisterRolesRole;
  creator: RegisterRolesRole;
  space: RegisterRolesRole;
  initialSelected?: RoleKey[];
}) {
  const roles: { key: RoleKey; data: RegisterRolesRole }[] = [
    { key: "brand", data: brand },
    { key: "creator", data: creator },
    { key: "space", data: space },
  ];

  const [selected, setSelected] = useState<Set<RoleKey>>(() => new Set(initialSelected));
  const [state, formAction, pending] = useActionState(saveRoles, null);

  const toggle = (key: RoleKey) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const count = selected.size;
  const selectedTitles = roles.filter((r) => selected.has(r.key)).map((r) => r.data.eyebrow);

  return (
    <form action={formAction}>
      {[...selected].map((key) => (
        <input key={key} type="hidden" name="role" value={key} />
      ))}

      <div className="mb-6 grid gap-6 md:grid-cols-3">
        {roles.map(({ key, data }) => {
          const Icon = ICONS[key];
          const isOn = selected.has(key);
          return (
            <button
              key={key}
              type="button"
              role="checkbox"
              aria-checked={isOn}
              onClick={() => toggle(key)}
              className={cn(
                "group relative flex flex-col rounded-xl border-2 p-5 text-start transition-all",
                isOn
                  ? "border-primary bg-surface-low ring-primary/15 ring-2"
                  : "border-outline-variant bg-surface-lowest hover:border-primary/50 hover:bg-surface-low/40",
              )}
            >
              <div className="mb-4 flex items-start justify-between">
                <span
                  className={cn(
                    "flex size-12 items-center justify-center rounded-xl transition-colors",
                    isOn
                      ? "bg-primary/10 text-primary"
                      : "bg-surface-container text-on-surface-variant",
                  )}
                >
                  <Icon className="size-6" />
                </span>
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border-2 transition-colors",
                    isOn
                      ? "border-primary bg-primary text-on-primary"
                      : "border-outline-variant bg-transparent",
                  )}
                >
                  {isOn && <CheckIcon className="size-3.5" />}
                </span>
              </div>

              <span
                className={cn(
                  "mb-1 block text-xs font-semibold tracking-wide",
                  isOn ? "text-primary" : "text-on-surface-variant",
                )}
              >
                {data.eyebrow}
              </span>
              <h3 className="text-on-surface mb-1 text-lg font-bold">{data.title}</h3>
              <p className="border-outline-variant/40 text-on-surface-variant mb-3 border-b pb-3 text-sm">
                {data.subtitle}
              </p>

              {data.benefits?.length ? (
                <ul className="space-y-2">
                  {data.benefits.map((b, i) => (
                    <li
                      key={b.id ?? i}
                      className="text-on-surface-variant flex items-start gap-2 text-sm"
                    >
                      <CheckCircleIcon
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          isOn ? "text-primary" : "text-outline",
                        )}
                      />
                      <span>{b.text}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </button>
          );
        })}
      </div>

      {state?.error && (
        <p className="text-error mb-6 text-center text-sm font-semibold">{state.error}</p>
      )}

      {/* סרגל פעולה תחתון */}
      <div className="border-outline-variant bg-surface-lowest shadow-ambient-lg fixed inset-x-0 bottom-0 z-40 border-t p-4">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="bg-surface-container text-on-surface hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-medium sm:flex">
            <InfoIcon className="text-primary size-4" />
            {count > 0 ? (
              <span>
                נבחרו {count} תפקידים: {selectedTitles.join(" + ")}
              </span>
            ) : (
              <span>בחר לפחות תפקיד אחד כדי להמשיך</span>
            )}
          </div>

          <div className="flex w-full items-center gap-3 sm:w-auto">
            <Link
              href="/register"
              className="border-outline-variant text-on-surface hover:bg-surface-container inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border px-6 text-sm font-semibold transition-colors sm:flex-none"
            >
              <ArrowIcon className="size-5 rotate-180" />
              חזרה לשלב הקודם
            </Link>
            <button
              type="submit"
              disabled={count === 0 || pending}
              className="bg-primary text-on-primary shadow-ambient-lg hover:bg-primary-hover inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 sm:flex-none"
            >
              {pending ? "שומר…" : "המשך להגדרת הפרופיל"}
              {!pending && <ArrowIcon className="size-5" />}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
