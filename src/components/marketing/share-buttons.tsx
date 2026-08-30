"use client";

import { useState } from "react";
import { CheckIcon, ChatIcon, LinkIcon, ShareIcon } from "@/components/marketing/icons";

/** כפתורי שיתוף למאמר — אי קטן. משתמש ב-URL הנוכחי של הדפדפן. */
export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const currentUrl = () => (typeof window === "undefined" ? "" : window.location.href);

  const openShare = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=520");
  };

  const btn =
    "border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-primary flex size-10 items-center justify-center rounded-full border transition-colors";

  return (
    <div className="flex gap-2">
      <button
        type="button"
        aria-label="שיתוף בלינקדאין"
        className={btn}
        onClick={() =>
          openShare(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl())}`,
          )
        }
      >
        <ShareIcon className="size-5" />
      </button>
      <button
        type="button"
        aria-label="שיתוף בוואטסאפ"
        className={btn}
        onClick={() =>
          openShare(`https://wa.me/?text=${encodeURIComponent(`${title} ${currentUrl()}`)}`)
        }
      >
        <ChatIcon className="size-5" />
      </button>
      <button
        type="button"
        aria-label={copied ? "הקישור הועתק" : "העתקת קישור"}
        className={btn}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(currentUrl());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            /* clipboard לא זמין — מתעלמים */
          }
        }}
      >
        {copied ? <CheckIcon className="text-success size-5" /> : <LinkIcon className="size-5" />}
      </button>
    </div>
  );
}
