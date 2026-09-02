"use client";

import { useActionState, useState } from "react";
import { cn } from "@/lib/cn";
import { LocationIcon, CheckCircleIcon } from "@/components/marketing/icons";
import { CONTRACT_ACTION_INITIAL, type ContractParty } from "@/lib/contract-room";
import { updateContractShipping } from "@/lib/actions/contract-actions";
import type { ContractShippingView } from "@/lib/contracts";
import type { CityOption } from "@/lib/cities";

const dateFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "long" });

export function ShippingPanel({
  contractId,
  viewerParty,
  shipping,
  cities,
}: {
  contractId: string;
  viewerParty: ContractParty;
  shipping: ContractShippingView | null;
  cities: CityOption[];
}) {
  const isProvider = viewerParty === "provider";
  const [state, action, pending] = useActionState(
    updateContractShipping,
    CONTRACT_ACTION_INITIAL,
  );
  const [editing, setEditing] = useState(false);
  const showForm = isProvider && (editing || !shipping);

  return (
    <div className="border-outline-variant bg-surface-lowest shadow-ambient-sm flex flex-col gap-4 rounded-lg border p-6">
      <div className="flex items-center gap-2">
        <LocationIcon className="text-primary size-5" />
        <h2 className="text-on-surface text-sm font-semibold">משלוח מוצר פיזי</h2>
      </div>

      {state.status !== "idle" && state.message && (
        <p
          role="status"
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium",
            state.status === "success"
              ? "bg-success-container text-success"
              : "bg-error-container text-on-error-container",
          )}
        >
          {state.message}
        </p>
      )}

      {!showForm && shipping && (
        <div className="border-outline-variant bg-surface-container flex flex-col gap-1 rounded-lg border p-4 text-sm">
          <p className="text-on-surface font-semibold">{shipping.recipientName}</p>
          <p className="text-on-surface-variant">{shipping.phone}</p>
          <p className="text-on-surface-variant">
            {shipping.address}
            {shipping.cityLabel ? `, ${shipping.cityLabel}` : ""}
          </p>
          {shipping.notes && (
            <p className="text-on-surface-variant mt-1 text-xs">הערות: {shipping.notes}</p>
          )}
          <p className="text-on-surface-variant mt-2 flex items-center gap-1 text-xs">
            <CheckCircleIcon className="text-success size-3.5" />
            עודכן {dateFmt.format(shipping.updatedAt)}
          </p>
        </div>
      )}

      {!showForm && !shipping && !isProvider && (
        <p className="text-on-surface-variant text-sm">
          היוצר טרם עדכן כתובת משלוח. נשלח לך עדכון כשהכתובת תוזן.
        </p>
      )}

      {!showForm && shipping && isProvider && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="border-outline text-on-surface hover:bg-surface-container h-10 rounded-lg border text-sm font-medium"
        >
          עדכן פרטי משלוח
        </button>
      )}

      {showForm && (
        <form action={action} className="flex flex-col gap-3 text-sm">
          <input type="hidden" name="contractId" value={contractId} />
          <label className="flex flex-col gap-1">
            <span className="text-on-surface-variant text-xs">שם מקבל המשלוח</span>
            <input
              name="recipientName"
              required
              defaultValue={shipping?.recipientName ?? ""}
              className="border-outline-variant bg-surface-container focus:border-primary text-on-surface rounded-lg border px-3 py-2 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-on-surface-variant text-xs">טלפון</span>
            <input
              name="phone"
              required
              inputMode="tel"
              defaultValue={shipping?.phone ?? ""}
              className="border-outline-variant bg-surface-container focus:border-primary text-on-surface rounded-lg border px-3 py-2 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-on-surface-variant text-xs">כתובת מלאה (רחוב, מספר, דירה)</span>
            <input
              name="address"
              required
              defaultValue={shipping?.address ?? ""}
              className="border-outline-variant bg-surface-container focus:border-primary text-on-surface rounded-lg border px-3 py-2 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-on-surface-variant text-xs">עיר</span>
            <select
              name="cityId"
              defaultValue={shipping?.cityId ?? ""}
              className="border-outline-variant bg-surface-container focus:border-primary text-on-surface rounded-lg border px-3 py-2 focus:outline-none"
            >
              <option value="">— בחר עיר —</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameHe}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-on-surface-variant text-xs">הערות לשליח (אופציונלי)</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={shipping?.notes ?? ""}
              className="border-outline-variant bg-surface-container focus:border-primary text-on-surface rounded-lg border px-3 py-2 focus:outline-none"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="bg-primary text-on-primary hover:bg-primary-hover h-11 flex-1 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {pending ? "שומר…" : "שמור פרטי משלוח"}
            </button>
            {shipping && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-on-surface-variant h-11 px-3 text-sm"
              >
                ביטול
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
