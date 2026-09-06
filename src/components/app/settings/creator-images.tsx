"use client";

import { useActionState, useRef, useState } from "react";
import { uploadCreatorImage, removeCreatorImage } from "@/lib/actions/settings-actions";
import { SETTINGS_FORM_INITIAL } from "@/lib/actions/settings-form-state";
import { FormAlert, SectionCard } from "@/components/app/settings/form-ui";
import {
  PROFILE_IMAGE_ACCEPT,
  MAX_PROFILE_IMAGE_MB,
  type ProfileImageField,
} from "@/lib/profile-image-upload";
import { CloseIcon } from "@/components/marketing/icons";

function ImageSlot({
  field,
  label,
  currentUrl,
  aspect,
}: {
  field: ProfileImageField;
  label: string;
  currentUrl: string | null;
  aspect: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(
    async (prev: typeof SETTINGS_FORM_INITIAL, formData: FormData) => {
      const result = await uploadCreatorImage(prev, formData);
      if (result?.status === "success") setPreview(null);
      return result;
    },
    SETTINGS_FORM_INITIAL,
  );

  const shown = preview ?? currentUrl;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-on-surface text-sm font-medium">{label}</span>

      <div
        className={`border-outline-variant bg-surface-container relative overflow-hidden rounded-lg border ${aspect}`}
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="size-full object-cover" />
        ) : (
          <div className="text-on-surface-variant flex size-full items-center justify-center text-xs">
            אין תמונה
          </div>
        )}
      </div>

      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="field" value={field} />
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept={PROFILE_IMAGE_ACCEPT}
          required
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
          className="text-on-surface-variant file:bg-surface-container file:text-on-surface hover:file:bg-surface-high text-sm file:me-3 file:rounded-lg file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-on-primary hover:bg-primary-hover inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {pending ? "מעלה…" : "העלה"}
        </button>
        {currentUrl && (
          <button
            type="button"
            onClick={() => {
              const fd = new FormData();
              fd.set("field", field);
              void removeCreatorImage(fd);
              setPreview(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="border-outline-variant text-on-surface-variant hover:border-error hover:text-error inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs font-semibold transition-colors"
          >
            <CloseIcon className="size-3.5" />
            הסר
          </button>
        )}
      </form>

      <p className="text-on-surface-variant text-xs">
        JPG, PNG, WEBP, GIF או AVIF · עד {MAX_PROFILE_IMAGE_MB}MB
      </p>
      <FormAlert state={state} />
    </div>
  );
}

export function CreatorImages({
  avatarUrl,
  coverImageUrl,
}: {
  avatarUrl: string | null;
  coverImageUrl: string | null;
}) {
  return (
    <SectionCard
      title="תמונות פרופיל"
      description="תמונת הפרופיל והרקע מוצגות למפרסמים באינדקס ובמרקטפלייס."
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <ImageSlot
          field="avatar"
          label="תמונת פרופיל"
          currentUrl={avatarUrl}
          aspect="aspect-square max-w-[12rem]"
        />
        <ImageSlot
          field="cover"
          label="תמונת רקע"
          currentUrl={coverImageUrl}
          aspect="aspect-[3/1]"
        />
      </div>
    </SectionCard>
  );
}
