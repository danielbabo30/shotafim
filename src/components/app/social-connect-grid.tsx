"use client";

import { useActionState, useState } from "react";
import { cn } from "@/lib/cn";
import { recordSocialConsent, deleteCreatorChannel } from "@/lib/actions/settings-actions";
import { SOCIAL_NETWORKS } from "@/components/auth/social-networks";
import { CloseIcon } from "@/components/marketing/icons";
import type { SocialConnectionVM } from "@/lib/social-connections";

const NET_BY_ID = new Map(SOCIAL_NETWORKS.map((n) => [n.id, n]));

function ConsentCheckbox({
  conn,
  onConsented,
}: {
  conn: SocialConnectionVM;
  onConsented: () => void;
}) {
  const consented = conn.consentedAt != null;
  const [, formAction, pending] = useActionState(async (_prev: null, formData: FormData) => {
    await recordSocialConsent(formData);
    onConsented();
    return null;
  }, null);

  return (
    <form action={formAction} className="flex items-start gap-2">
      <input type="hidden" name="platform" value={conn.platform} />
      <input
        type="checkbox"
        id={`consent-${conn.platform}`}
        name="consent"
        defaultChecked={consented}
        disabled={consented || pending}
        onChange={(e) => {
          if (e.currentTarget.checked) e.currentTarget.form?.requestSubmit();
        }}
        className="accent-primary mt-0.5 size-4 shrink-0"
      />
      <label
        htmlFor={`consent-${conn.platform}`}
        className="text-on-surface-variant text-xs leading-snug"
      >
        אני מאשר/ת חיבור {conn.name} למערכת והעברת נתוני הערוץ הציבוריים (עוקבים, צפיות, מעורבות)
        לצורך הצגתם למפרסמים.
        {consented && conn.consentedAt && (
          <span className="text-on-surface-variant/70 mt-0.5 block">
            אושר ב-{new Date(conn.consentedAt).toLocaleDateString("he-IL")}
          </span>
        )}
      </label>
    </form>
  );
}

function DisconnectButton({ channelId, label }: { channelId: string; label: string }) {
  return (
    <form action={deleteCreatorChannel}>
      <input type="hidden" name="channelId" value={channelId} />
      <button
        type="submit"
        className="border-outline-variant text-on-surface-variant hover:border-error hover:text-error inline-flex h-8 items-center gap-1 rounded-lg border px-3 text-xs font-semibold transition-colors"
      >
        <CloseIcon className="size-3.5" />
        {label}
      </button>
    </form>
  );
}

function ConnectButton({ conn }: { conn: SocialConnectionVM }) {
  // אישור מקומי מיידי — לא ממתינים ל-revalidation של השרת כדי לפתוח את כפתור החיבור.
  const [locallyConsented, setLocallyConsented] = useState(false);
  const consented = conn.consentedAt != null || locallyConsented;

  return (
    <div className="flex flex-col gap-2">
      <ConsentCheckbox conn={conn} onConsented={() => setLocallyConsented(true)} />
      {conn.platform === "INSTAGRAM" && (
        <p className="text-on-surface-variant/80 text-xs">
          אינסטגרם מתחבר יחד עם עמוד הפייסבוק העסקי המקושר אליו.
        </p>
      )}
      {consented ? (
        <a
          href={conn.connectPath ?? "#"}
          className="bg-primary text-on-primary hover:bg-primary-hover inline-flex h-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors"
        >
          {conn.connected
            ? "חבר מחדש לסנכרון אוטומטי"
            : `התחבר עם ${conn.platform === "YOUTUBE" ? "Google" : "פייסבוק"}`}
        </a>
      ) : (
        <button
          type="button"
          disabled
          aria-disabled
          className="border-outline-variant text-on-surface-variant/60 inline-flex h-10 cursor-not-allowed items-center justify-center rounded-lg border text-sm font-semibold"
        >
          יש לאשר קודם את תיבת ההסכמה
        </button>
      )}
    </div>
  );
}

function ConnectionCard({ conn }: { conn: SocialConnectionVM }) {
  const net = NET_BY_ID.get(conn.platform);

  return (
    <div className="border-outline-variant bg-surface-lowest flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            net?.iconClass,
          )}
        >
          {net && <net.Icon className="size-5" />}
        </span>
        <div className="min-w-0">
          <div className="text-on-surface text-sm font-bold">{conn.name}</div>
          {conn.connected ? (
            <p dir="ltr" className="text-on-surface-variant truncate text-start text-xs">
              {conn.handle}
              {conn.followersCount != null &&
                ` · ${conn.followersCount.toLocaleString("he-IL")} עוקבים`}
            </p>
          ) : (
            <p className="text-on-surface-variant text-xs">
              {conn.oauthReady ? "לא מחובר" : "בקרוב"}
            </p>
          )}
        </div>
      </div>

      {conn.connected && conn.synced ? (
        <div className="flex items-center justify-between gap-2">
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-semibold">
            מחובר · מסונכרן אוטומטית
          </span>
          {conn.channelId && <DisconnectButton channelId={conn.channelId} label="נתק" />}
        </div>
      ) : conn.connected ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="bg-surface-container text-on-surface-variant rounded-full px-2 py-0.5 text-xs font-semibold">
              הוזן ידנית — לא מאומת
            </span>
            {conn.channelId && <DisconnectButton channelId={conn.channelId} label="הסר" />}
          </div>
          {conn.oauthReady && <ConnectButton conn={conn} />}
        </div>
      ) : !conn.oauthReady ? (
        <button
          type="button"
          disabled
          className="border-outline-variant text-on-surface-variant/60 inline-flex h-10 cursor-not-allowed items-center justify-center rounded-lg border text-sm font-semibold"
        >
          בקרוב
        </button>
      ) : (
        <ConnectButton conn={conn} />
      )}
    </div>
  );
}

/**
 * רשת חיבור הרשתות החברתיות של היוצר — נועד למשיכת נתוני הערוץ מהפלטפורמה (לא להתחברות).
 * משותף למסך "ההרשמה הושלמה" ולמסך ההגדרות. כל חיבור דורש אישור הסכמה מראש (נשמר ב-DB).
 */
export function SocialConnectGrid({ connections }: { connections: SocialConnectionVM[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {connections.map((conn) => (
        <ConnectionCard key={conn.platform} conn={conn} />
      ))}
    </div>
  );
}
