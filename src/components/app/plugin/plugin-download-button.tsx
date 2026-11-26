"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon, CheckCircleIcon } from "@/components/marketing/icons";
import { acceptPluginTerms } from "@/lib/actions/plugin-download-actions";
import { PLUGIN_TERMS_TEXT } from "@/lib/plugin-terms";

/** כפתור הורדה → מודאל תקנון (‎<dialog>‎ מקורי: focus trap + ESC) → אישור נרשם בשרת → הורדה. */
export function PluginDownloadButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function open() {
    setChecked(false);
    setError(null);
    setDone(false);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await acceptPluginTerms(checked);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setDone(true);
      const a = document.createElement("a");
      a.href = res.downloadUrl;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors"
      >
        <DownloadIcon className="size-4" />
        הורדת התוסף
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="plugin-terms-title"
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="bg-surface-lowest text-on-surface shadow-ambient-lg border-outline-variant m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl border p-0 backdrop:bg-black/40"
      >
        <div className="flex flex-col gap-4 p-6">
          <h2 id="plugin-terms-title" className="text-on-surface text-lg font-bold">
            תקנון הורדה
          </h2>

          <div className="border-outline-variant bg-surface-container text-on-surface-variant max-h-64 overflow-y-auto rounded-lg border p-4 text-sm leading-relaxed">
            {PLUGIN_TERMS_TEXT.map((p, i) => (
              <p key={i} className={i > 0 ? "mt-3" : undefined}>
                {p}
              </p>
            ))}
          </div>

          {done ? (
            <p
              role="status"
              className="text-on-surface flex items-center gap-2 text-sm font-semibold"
            >
              <CheckCircleIcon className="text-primary size-5 shrink-0" />
              האישור נשמר וההורדה החלה.
            </p>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="accent-primary size-4"
              />
              קראתי ואני מאשר/ת את התקנון
            </label>
          )}

          {error && (
            <p role="alert" className="text-error text-sm">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>
              {done ? "סגירה" : "ביטול"}
            </Button>
            {!done && (
              <Button type="button" onClick={confirm} disabled={!checked || pending}>
                {pending ? "שומר…" : "אישור"}
              </Button>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
