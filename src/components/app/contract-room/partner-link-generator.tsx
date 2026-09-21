"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { LinkIcon, PriceTagIcon, CheckIcon, GridIcon } from "@/components/marketing/icons";
import { qrMatrix } from "@/lib/qr";

const REF_PARAM = "bgad_ref";

function withRef(rawUrl: string, refCode: string): { url: string; valid: boolean } {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { url: "", valid: false };
  try {
    const u = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    u.searchParams.set(REF_PARAM, refCode);
    return { url: u.toString(), valid: true };
  } catch {
    return { url: "", valid: false };
  }
}

function QrCode({ text }: { text: string }) {
  const path = useMemo(() => {
    const m = qrMatrix(text);
    let d = "";
    for (let r = 0; r < m.length; r++)
      for (let c = 0; c < m.length; c++) if (m[r][c]) d += `M${c} ${r}h1v1h-1z`;
    return { d, n: m.length };
  }, [text]);
  const margin = 2;
  const dim = path.n + margin * 2;
  return (
    <svg
      viewBox={`0 0 ${dim} ${dim}`}
      className="border-outline-variant size-40 rounded-lg border bg-white"
      shapeRendering="crispEdges"
      role="img"
      aria-label="קוד QR ללינק השיוך"
    >
      <path d={path.d} transform={`translate(${margin} ${margin})`} fill="#000" />
    </svg>
  );
}

function CopyButton({ value, disabled }: { value: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* ignore */
        }
      }}
      className="border-outline text-primary hover:bg-surface-container inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-colors disabled:opacity-50"
    >
      {copied ? <CheckIcon className="size-3.5" /> : null}
      {copied ? "הועתק" : "העתק"}
    </button>
  );
}

type Props = {
  refCode: string;
  destinationUrl: string;
  couponCode: string | null;
  couponDiscountPct: number | null;
  hasLink: boolean;
  active: boolean;
};

/** מחולל לינקים ליוצר — deep-link לכל עמוד מוצר + QR ל-offline (סטוריז, פודקאסט, פרינט). */
export function PartnerLinkGenerator({
  refCode,
  destinationUrl,
  couponCode,
  couponDiscountPct,
  hasLink,
  active,
}: Props) {
  const [raw, setRaw] = useState(destinationUrl);
  const { url, valid } = withRef(raw, refCode);

  return (
    <div className="border-outline-variant bg-surface-lowest flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <LinkIcon className="text-on-surface-variant size-4" />
        <h3 className="text-on-surface text-sm font-semibold">
          {hasLink ? "מחולל לינקים ו-QR" : "קוד הקופון שלך"}
        </h3>
        {!active && (
          <span className="bg-surface-container text-on-surface-variant ms-auto rounded-full px-2 py-0.5 text-[11px] font-medium">
            יופעל אחרי הפקדת הפיקדון
          </span>
        )}
      </div>

      {hasLink && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-on-surface-variant text-xs">כתובת יעד (כל עמוד באתר המפרסם)</span>
            <input
              type="url"
              inputMode="url"
              dir="ltr"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="border-outline-variant bg-surface-container focus:border-primary rounded-lg border px-3 py-2 font-mono text-xs outline-none"
              placeholder="https://shop.example.co.il/product/…"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-on-surface-variant text-xs">הלינק שלך (עם קוד שיוך)</span>
            <div className="border-outline-variant flex items-center gap-2 rounded-lg border px-3 py-2">
              <span
                dir="ltr"
                className={cn(
                  "min-w-0 flex-1 truncate font-mono text-xs",
                  valid ? "text-on-surface" : "text-on-surface-variant",
                )}
              >
                {valid ? url : "כתובת לא תקינה"}
              </span>
              <CopyButton value={url} disabled={!valid || !active} />
            </div>
          </div>
        </>
      )}

      {couponCode && (
        <div className="border-outline-variant flex items-center gap-2 rounded-lg border px-3 py-2">
          <PriceTagIcon className="text-on-surface-variant size-4 shrink-0" />
          <span dir="ltr" className="text-on-surface font-mono text-xs">
            {couponCode}
          </span>
          {couponDiscountPct != null && (
            <span className="text-on-surface-variant text-[11px]">
              ({couponDiscountPct}% הנחה לקונה)
            </span>
          )}
          <span className="ms-auto">
            <CopyButton value={couponCode} disabled={!active} />
          </span>
        </div>
      )}

      {hasLink && valid && (
        <div className="flex flex-col items-center gap-2 pt-1">
          <QrCode text={url} />
          <span className="text-on-surface-variant flex items-center gap-1 text-[11px]">
            <GridIcon className="size-3" />
            סרקו לשיתוף בסטוריז, פודקאסט או פרינט
          </span>
        </div>
      )}
    </div>
  );
}
