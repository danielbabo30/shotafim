"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SiteSetting } from "@/payload-types";

type AuthConfig = NonNullable<SiteSetting["auth"]>;

/**
 * כפתורי הכניסה בהדר. איי-לנד קטן בצד לקוח כדי שהעמודים יישארו סטטיים ל-SEO:
 * ברירת המחדל היא מצב "מנותק" (התחברות + הרשמה), ואם נמצא session — מוחלף ב"האזור האישי".
 * כל הקישורים והטקסטים מגיעים מ-CMS.
 */
export function HeaderAuthActions({ auth, className }: { auth: AuthConfig; className?: string }) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => alive && setLoggedIn(Boolean(s?.user)))
      .catch(() => alive && setLoggedIn(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loggedIn) {
    return (
      <div className={className}>
        <Button href={auth.personalAreaUrl} variant="primary">
          {auth.loggedInLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button href={auth.loginUrl} variant="ghost">
        {auth.loginLabel}
      </Button>
      <Button href={auth.signupUrl} variant="primary">
        {auth.signupLabel}
      </Button>
    </div>
  );
}
