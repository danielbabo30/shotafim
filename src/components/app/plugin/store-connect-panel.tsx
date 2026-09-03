"use client";

import { useActionState, useId, useState } from "react";
import type { SiteStatus } from "@prisma/client";
import { cn } from "@/lib/cn";
import { connectStore, rotateStoreKey, disconnectStore } from "@/lib/actions/plugin-actions";
import { PLUGIN_ACTION_INITIAL } from "@/lib/plugin-form";
import { StorefrontIcon, CheckCircleIcon, ShieldCheckIcon } from "@/components/marketing/icons";
import type { ConnectedStore } from "@/lib/plugin-connection";

const STATUS_META: Record<SiteStatus, { label: string; className: string }> = {
  ACTIVE: { label: "מחובר", className: "bg-success-container text-success" },
  STALE: { label: "אין דיווח אחרון", className: "bg-warning-container text-warning" },
  OFFLINE: { label: "אופליין", className: "bg-error-container text-error" },
  DEACTIVATED: { label: "מנותק", className: "bg-surface-high text-on-surface-variant" },
};

const fieldClass =
  "w-full rounded-lg bg-surface-container px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/70 " +
  "outline-none transition-colors focus:bg-surface-lowest focus:ring-2 focus:ring-primary";

const heDateTime = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" });

export function StoreConnectPanel({ stores }: { stores: ConnectedStore[] }) {
  const [state, formAction, pending] = useActionState(connectStore, PLUGIN_ACTION_INITIAL);
  const uid = useId();

  return (
    <div className="flex flex-col gap-4">
      {state.status === "key" && <KeyReveal siteUrl={state.siteUrl} token={state.token} />}

      {stores.length > 0 && (
        <ul className="flex flex-col gap-2">
          {stores.map((store) => (
            <StoreRow key={store.id} store={store} />
          ))}
        </ul>
      )}

      <form
        action={formAction}
        className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col gap-3 rounded-xl border p-4"
      >
        <label htmlFor={`${uid}-url`} className="text-on-surface text-sm font-semibold">
          {stores.length > 0 ? "חיבור חנות נוספת" : "חיבור החנות שלך"}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={`${uid}-url`}
            name="siteUrl"
            type="url"
            dir="ltr"
            inputMode="url"
            placeholder="https://mystore.co.il"
            className={cn(fieldClass, "text-start")}
          />
          <button
            type="submit"
            disabled={pending}
            className="bg-primary text-on-primary hover:bg-primary-hover shadow-ambient-sm inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors disabled:opacity-60"
          >
            <StorefrontIcon className="size-4" />
            {pending ? "מייצר קוד…" : "צור קוד צימוד"}
          </button>
        </div>
        {state.status === "error" && (
          <p className="text-on-error-container text-xs font-medium">{state.message}</p>
        )}
        <p className="text-on-surface-variant text-xs leading-relaxed">
          נייצר קוד צימוד ייחודי לחנות הזו. הדביקו אותו בתוסף (WooCommerce ▸ BridgeAd) כדי לחבר.
        </p>
      </form>
    </div>
  );
}

function StoreRow({ store }: { store: ConnectedStore }) {
  const meta = STATUS_META[store.status];
  const [rotateState, rotateAction, rotating] = useActionState(
    rotateStoreKey,
    PLUGIN_ACTION_INITIAL,
  );

  return (
    <li className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col gap-3 rounded-xl border p-4">
      {rotateState.status === "key" && (
        <KeyReveal siteUrl={rotateState.siteUrl} token={rotateState.token} />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p dir="ltr" className="text-on-surface truncate text-start text-sm font-semibold">
            {store.siteUrl}
          </p>
          <p className="text-on-surface-variant mt-0.5 text-xs">
            {store.lastHeartbeatAt
              ? `דיווח אחרון: ${heDateTime.format(store.lastHeartbeatAt)}`
              : "טרם התקבל דיווח מהתוסף"}
            {store.pluginVersion ? ` · גרסה ${store.pluginVersion}` : ""}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            meta.className,
          )}
        >
          {store.status === "ACTIVE" && <CheckCircleIcon className="size-3.5" />}
          {meta.label}
        </span>
      </div>

      <div className="border-outline-variant flex flex-wrap gap-2 border-t pt-3">
        <form action={rotateAction}>
          <input type="hidden" name="siteId" value={store.id} />
          <button
            type="submit"
            disabled={rotating}
            className="text-on-surface-variant hover:bg-surface-container border-outline-variant inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60"
          >
            <ShieldCheckIcon className="size-3.5" />
            {rotating ? "מחליף…" : "החלף מפתח"}
          </button>
        </form>
        {store.status !== "DEACTIVATED" && (
          <form action={disconnectStore}>
            <input type="hidden" name="siteId" value={store.id} />
            <button
              type="submit"
              className="text-error hover:bg-error-container inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              ניתוק חנות
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

function KeyReveal({ siteUrl, token }: { siteUrl: string; token: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="border-primary/40 bg-primary-fixed/25 flex flex-col gap-2 rounded-xl border p-4">
      <p className="text-on-surface text-sm font-bold">קוד הצימוד נוצר עבור {siteUrl}</p>
      <p className="text-on-surface-variant text-xs">
        מוצג פעם אחת בלבד. הדביקו אותו בשדה “קוד צימוד” בהגדרות התוסף (WooCommerce ▸ BridgeAd). אם
        איבדתם — צרו חדש דרך “החלף מפתח”.
      </p>
      <div className="flex items-center gap-2">
        <code
          dir="ltr"
          className="border-outline-variant bg-surface-lowest text-on-surface min-w-0 flex-1 truncate rounded-lg border px-3 py-2 text-start font-mono text-xs"
        >
          {token}
        </code>
        <button
          type="button"
          onClick={copy}
          className="bg-primary text-on-primary hover:bg-primary-hover shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
        >
          {copied ? "הועתק ✓" : "העתק"}
        </button>
      </div>
    </div>
  );
}
