"use client";

import { openConsentSettings } from "@/lib/consent";

export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openConsentSettings} className={className}>
      הגדרות עוגיות
    </button>
  );
}
