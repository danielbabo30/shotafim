"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowIcon } from "@/components/marketing/icons";
import { submitApplication } from "@/lib/actions/application-actions";
import { APPLICATION_FORM_INITIAL } from "@/lib/pitch";

export type OfferOption = { id: string; label: string; price: number; days?: number };

const field =
  "bg-surface-low text-on-surface focus:bg-surface-lowest focus:ring-primary h-11 w-full rounded-lg border-0 px-4 transition-colors focus:ring-2 focus:outline-none";
const labelCls = "text-on-surface mb-1 block text-sm font-semibold";
const errCls = "text-error mt-1 text-xs";

export type PitchPrefillProp = { price: number; days: number } | null;

/** טופס הגשת הצעה לבריף (יוצר / בעל שטחים) */
export function ApplyForm({
  campaignId,
  packages = [],
  assets = [],
  prefill = null,
}: {
  campaignId: string;
  packages?: OfferOption[];
  assets?: OfferOption[];
  /** ערכים למילוי מוקדם כשמדובר בהשלמת הזמנה (INVITED) */
  prefill?: PitchPrefillProp;
}) {
  const [state, formAction, pending] = useActionState(submitApplication, APPLICATION_FORM_INITIAL);
  const errors = state?.fieldErrors ?? {};

  const offers = packages.length ? packages : assets;
  const offerName = packages.length ? "pricingPackageId" : "adSpaceAssetId";
  const [price, setPrice] = useState(prefill && prefill.price > 0 ? String(prefill.price) : "");
  const [days, setDays] = useState(prefill ? String(prefill.days) : "");

  return (
    <form
      action={formAction}
      className="border-outline-variant bg-surface-lowest shadow-ambient flex flex-col gap-4 rounded-xl border p-6"
    >
      <input type="hidden" name="campaignId" value={campaignId} />
      <h2 className="text-on-surface text-lg font-bold">
        {prefill ? "השלמת ההזמנה — הגשת הצעה" : "הגשת הצעה לבריף"}
      </h2>
      {prefill && (
        <p className="bg-primary-fixed text-on-primary-fixed rounded-lg p-3 text-sm">
          הוזמנת לבריף הזה. הפרטים מולאו מראש — עדכנו לפי הצורך ושלחו.
        </p>
      )}

      {state?.status === "error" && state.message && (
        <p className="bg-error-container text-on-error-container rounded-lg p-3 text-sm">
          {state.message}
        </p>
      )}

      {offers.length > 0 && (
        <div>
          <label htmlFor="offer" className={labelCls}>
            {packages.length ? "חבילת שירות" : "שטח פרסום"}
          </label>
          <select
            id="offer"
            name={offerName}
            className={field}
            defaultValue=""
            onChange={(e) => {
              const o = offers.find((x) => x.id === e.target.value);
              if (o) {
                setPrice(String(o.price));
                if (o.days) setDays(String(o.days));
              }
            }}
          >
            <option value="">ללא — הצעה חופשית</option>
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="proposedPriceILS" className={labelCls}>
            הצעת מחיר (₪)
          </label>
          <input
            id="proposedPriceILS"
            name="proposedPriceILS"
            type="number"
            min="1"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={field}
          />
          {errors.proposedPriceILS && <p className={errCls}>{errors.proposedPriceILS}</p>}
        </div>
        <div>
          <label htmlFor="estimatedDeliveryDays" className={labelCls}>
            זמן אספקה (ימים)
          </label>
          <input
            id="estimatedDeliveryDays"
            name="estimatedDeliveryDays"
            type="number"
            min="1"
            required
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className={field}
          />
          {errors.estimatedDeliveryDays && <p className={errCls}>{errors.estimatedDeliveryDays}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="coverLetter" className={labelCls}>
          דברי הסבר (אופציונלי)
        </label>
        <textarea
          id="coverLetter"
          name="coverLetter"
          rows={4}
          placeholder="רעיון קצר לביצוע, ניסיון רלוונטי, שאלות…"
          className={`${field} h-auto py-2.5`}
        />
        {errors.coverLetter && <p className={errCls}>{errors.coverLetter}</p>}
      </div>

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "שולח…" : "שלח הצעה"}
        <ArrowIcon className="size-5" />
      </Button>
    </form>
  );
}
