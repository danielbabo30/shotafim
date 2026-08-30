"use client";

import { useState } from "react";
import type { SiteSetting } from "@/payload-types";

type Newsletter = NonNullable<SiteSetting["newsletter"]>;

/**
 * טופס הרשמה לניוזלטר. כרגע UI בלבד — חיבור לשירות דיוור יתווסף בהמשך.
 */
export function NewsletterForm({ newsletter }: { newsletter: Newsletter }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  if (newsletter.enabled === false) return null;

  return (
    <div>
      <h4 className="font-display text-on-surface mb-4 text-xs font-bold tracking-wider uppercase">
        {newsletter.heading}
      </h4>
      <p className="text-on-surface-variant mb-4 text-sm">{newsletter.text}</p>

      {done ? (
        <p className="text-success text-sm font-semibold">תודה! נרשמת לרשימת התפוצה.</p>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (email) setDone(true); // TODO: חיבור לספק דיוור
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={newsletter.placeholder ?? ""}
            className="border-outline-variant bg-surface-lowest focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-4 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="הרשמה"
            className="bg-primary text-on-primary hover:bg-primary-hover rounded-lg px-4 py-2 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
              {/* חץ לכיוון ההתקדמות ב-RTL (שמאלה) */}
              <path
                d="M19 12H5M12 19l-7-7 7-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>
      )}
    </div>
  );
}
