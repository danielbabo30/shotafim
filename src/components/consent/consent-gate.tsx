"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import {
  parseConsent,
  readConsentRaw,
  subscribeConsent,
  type ConsentCategory,
} from "@/lib/consent";

/**
 * עוטף תוכן (סקריפט, פיקסל, iframe) שייטען רק לאחר הסכמה לקטגוריה.
 * בשרת ובהידרציה — לא מרנדר דבר.
 */
export function ConsentGate({
  category,
  children,
}: {
  category: Exclude<ConsentCategory, "necessary">;
  children: ReactNode;
}) {
  const raw = useSyncExternalStore(subscribeConsent, readConsentRaw, () => "");
  const consent = parseConsent(raw);
  return consent?.[category] ? <>{children}</> : null;
}
