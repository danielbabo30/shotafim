import type { ReactNode } from "react";
import { CookieConsent } from "@/components/consent/cookie-consent";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <CookieConsent />
    </>
  );
}
