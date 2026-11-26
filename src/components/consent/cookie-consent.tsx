"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  CONSENT_OPEN_EVENT,
  parseConsent,
  readConsentRaw,
  saveConsent,
  subscribeConsent,
} from "@/lib/consent";

const CATEGORIES = [
  {
    key: "necessary",
    title: "הכרחיות",
    text: "נדרשות לתפעול ולאבטחה של האתר, כמו שמירת ההתחברות ושמירת בחירת העוגיות שלך. תמיד פעילות.",
  },
  {
    key: "analytics",
    title: "סטטיסטיקה",
    text: "מסייעות להבין איך משתמשים באתר כדי לשפר אותו. כרגע האתר לא משתמש בעוגיות כאלה, והבחירה שלך תחול אם נוסיף אותן.",
  },
  {
    key: "marketing",
    title: "שיווק",
    text: "משמשות למדידת מודעות ולהתאמת פרסום ברשתות חיצוניות. כרגע האתר לא משתמש בעוגיות כאלה, והבחירה שלך תחול אם נוסיף אותן.",
  },
] as const;

type Choice = { analytics: boolean; marketing: boolean };

export function CookieConsent() {
  const raw = useSyncExternalStore(subscribeConsent, readConsentRaw, () => "");
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const consent = parseConsent(raw);
  const [customizing, setCustomizing] = useState(false);
  const [choice, setChoice] = useState<Choice>({ analytics: false, marketing: false });
  const openerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  function openPanel() {
    setChoice({
      analytics: consent?.analytics ?? false,
      marketing: consent?.marketing ?? false,
    });
    setCustomizing(true);
  }

  // פתיחה מחדש מהקישור בפוטר
  useEffect(() => {
    function onOpen() {
      openerRef.current = document.activeElement as HTMLElement | null;
      const c = parseConsent(readConsentRaw());
      setChoice({ analytics: c?.analytics ?? false, marketing: c?.marketing ?? false });
      setCustomizing(true);
    }
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen);
  }, []);

  function close() {
    setCustomizing(false);
    openerRef.current?.focus();
    openerRef.current = null;
  }

  function commit(c: Choice) {
    saveConsent(c);
    close();
  }

  // פוקוס ומלכודת מקלדת בחלון ההתאמה. ESC סוגר בלי לשמור הסכמה.
  useEffect(() => {
    if (!customizing) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>("button, a[href]")).filter(
        (el) => !el.hasAttribute("disabled"),
      );
    focusables()[0]?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [customizing]);

  if (!hydrated) return null;

  return (
    <>
      {!consent && !customizing && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="border-outline-variant bg-surface-lowest shadow-ambient-lg fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-xl border p-5 md:p-6"
        >
          <h2 id={titleId} className="font-display text-on-surface mb-2 text-lg font-bold">
            אנחנו משתמשים בעוגיות
          </h2>
          <p id={descId} className="text-on-surface-variant mb-4 text-sm leading-relaxed">
            עוגיות הכרחיות מאפשרות לאתר לפעול. עוגיות סטטיסטיקה ושיווק יופעלו רק אם תאשר. אפשר
            לבחור, וגם לשנות את הבחירה בכל עת דרך &quot;הגדרות עוגיות&quot; בתחתית האתר. פרטים
            נוספים ב
            <Link href="/legal/cookies" className="text-primary underline">
              מדיניות העוגיות
            </Link>{" "}
            וב
            <Link href="/legal/privacy" className="text-primary underline">
              מדיניות הפרטיות
            </Link>
            .
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="primary"
              className="min-h-11 flex-1"
              onClick={() => commit({ analytics: true, marketing: true })}
            >
              אישור הכל
            </Button>
            <Button
              variant="primary"
              className="min-h-11 flex-1"
              onClick={() => commit({ analytics: false, marketing: false })}
            >
              דחיית עוגיות לא הכרחיות
            </Button>
            <Button
              variant="ghost"
              className="min-h-11 flex-1"
              onClick={() => {
                openerRef.current = null;
                openPanel();
              }}
            >
              התאמה אישית
            </Button>
          </div>
        </div>
      )}

      {customizing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center">
          <div className="bg-on-surface/40 absolute inset-0" aria-hidden="true" onClick={close} />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="border-outline-variant bg-surface-lowest shadow-ambient-lg relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border p-5 md:p-6"
          >
            <h2 id={titleId} className="font-display text-on-surface mb-1 text-lg font-bold">
              הגדרות עוגיות
            </h2>
            <p className="text-on-surface-variant mb-4 text-sm">
              בחר אילו עוגיות לאפשר. פרטים ב
              <Link href="/legal/cookies" className="text-primary underline">
                מדיניות העוגיות
              </Link>{" "}
              וב
              <Link href="/legal/privacy" className="text-primary underline">
                מדיניות הפרטיות
              </Link>
              .
            </p>
            <ul className="mb-5 space-y-4">
              {CATEGORIES.map((cat) => {
                const locked = cat.key === "necessary";
                const on = locked ? true : choice[cat.key];
                return (
                  <li
                    key={cat.key}
                    className="border-outline-variant flex items-start justify-between gap-4 border-b pb-4 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p id={`${titleId}-${cat.key}`} className="text-on-surface font-semibold">
                        {cat.title}
                      </p>
                      <p className="text-on-surface-variant mt-1 text-sm leading-relaxed">
                        {cat.text}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-labelledby={`${titleId}-${cat.key}`}
                      disabled={locked}
                      onClick={() =>
                        !locked && setChoice((c) => ({ ...c, [cat.key]: !c[cat.key] }))
                      }
                      className={cn(
                        "focus-visible:outline-primary relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors before:absolute before:-inset-2.5 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60",
                        on ? "bg-primary" : "bg-outline-variant",
                      )}
                    >
                      <span
                        className={cn(
                          "bg-surface-lowest absolute top-0.5 size-5 rounded-full transition-all",
                          on ? "start-5" : "start-0.5",
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="primary" className="min-h-11 flex-1" onClick={() => commit(choice)}>
                שמירת הבחירה
              </Button>
              <Button
                variant="primary"
                className="min-h-11 flex-1"
                onClick={() => commit({ analytics: true, marketing: true })}
              >
                אישור הכל
              </Button>
              <Button
                variant="primary"
                className="min-h-11 flex-1"
                onClick={() => commit({ analytics: false, marketing: false })}
              >
                דחיית הכל
              </Button>
            </div>
            <button
              type="button"
              onClick={close}
              className="text-on-surface-variant hover:text-primary mt-4 inline-flex min-h-11 items-center text-sm"
            >
              סגירה בלי שמירה
            </button>
          </div>
        </div>
      )}
    </>
  );
}
