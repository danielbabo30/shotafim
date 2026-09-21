import Image from "next/image";
import type { AuthPanel, Media } from "@/payload-types";
import {
  WalletIcon,
  LockIcon,
  PlayCircleIcon,
  BankIcon,
  TrendUpIcon,
} from "@/components/marketing/icons";

type AuthPanelData = Omit<AuthPanel, "id" | "updatedAt" | "createdAt">;

const STEP_ICONS = {
  lock: LockIcon,
  video: PlayCircleIcon,
  payments: BankIcon,
} as const;

/**
 * הפאנל הצדדי הכהה של מסכי ההרשמה/כניסה — מיתוג, כותרת, וידג'ט נאמנות והמלצה.
 * כל התוכן מגיע מה-CMS (global `auth-panel`). מוסתר במובייל.
 */
export function AuthSidePanel({ panel, siteName }: { panel: AuthPanelData; siteName: string }) {
  const steps = panel.metric.steps ?? [];
  const avatars = (panel.metric.trustAvatars ?? [])
    .map((a) => (typeof a.image === "object" ? a.image : null))
    .filter((m): m is Media => Boolean(m?.url));
  const photo =
    panel.testimonial.photo && typeof panel.testimonial.photo === "object"
      ? panel.testimonial.photo
      : null;

  return (
    <aside className="bg-on-surface text-inverse-on-surface relative hidden overflow-hidden p-12 lg:flex lg:flex-col">
      {/* הילת רקע */}
      <div
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--color-primary) 40%, transparent) 0%, transparent 55%)",
        }}
      />

      {/* מיתוג + סטטוס */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="font-display inline-flex items-center gap-2 text-xl font-extrabold">
          <span className="text-primary-fixed">
            <WalletIcon className="size-6" />
          </span>
          {siteName}
        </span>
        {panel.statusLabel && (
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            <span className="bg-success size-2 rounded-full" />
            {panel.statusLabel}
          </span>
        )}
      </div>

      {/* כותרת ראשית */}
      <div className="relative z-10 mt-20">
        <h2 className="font-display text-4xl leading-tight font-bold">
          {panel.heading.lead}
          <br />
          <span className="text-primary-fixed">{panel.heading.highlight}</span>
        </h2>
        <p className="text-inverse-on-surface/70 mt-4 max-w-md text-lg leading-relaxed">
          {panel.body}
        </p>
      </div>

      {/* וידג'ט נאמנות */}
      <div className="shadow-ambient-lg relative z-10 mt-14 rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <span className="text-inverse-on-surface/80 text-sm font-medium">
            {panel.metric.label}
          </span>
          <TrendUpIcon className="text-inverse-on-surface/60 size-5" />
        </div>
        <div className="mt-3 text-3xl font-bold" dir="ltr">
          {panel.metric.value}
        </div>

        {steps.length > 0 && (
          <div className="relative mt-6 flex items-start justify-between">
            <div className="absolute inset-x-0 top-4 -z-0 h-px bg-white/20" />
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[step.icon] ?? LockIcon;
              const active = i === 0;
              return (
                <div
                  key={step.id ?? i}
                  className="relative z-10 flex flex-1 flex-col items-center gap-2 text-center"
                >
                  <span
                    className={
                      active
                        ? "bg-primary text-on-primary flex size-8 items-center justify-center rounded-full border-2 border-white/20"
                        : "text-inverse-on-surface/80 flex size-8 items-center justify-center rounded-full border-2 border-white/20 bg-white/15 backdrop-blur"
                    }
                  >
                    <Icon className="size-4" />
                  </span>
                  <span
                    className={
                      active
                        ? "text-inverse-on-surface/90 text-xs font-semibold"
                        : "text-inverse-on-surface/60 text-xs font-semibold"
                    }
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {panel.metric.trustText && (
          <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-4">
            <div className="flex">
              {avatars.length > 0
                ? avatars
                    .slice(0, 4)
                    .map((m, i) => (
                      <Image
                        key={m.id}
                        src={m.url!}
                        alt={m.alt || ""}
                        width={24}
                        height={24}
                        className={`size-6 rounded-full border border-white object-cover ${
                          i > 0 ? "-ms-2" : ""
                        }`}
                      />
                    ))
                : [0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`size-6 rounded-full border border-white bg-white/25 ${
                        i > 0 ? "-ms-2" : ""
                      }`}
                    />
                  ))}
            </div>
            <span className="text-inverse-on-surface/80 text-xs font-semibold">
              {panel.metric.trustText}
            </span>
          </div>
        )}
      </div>

      {/* המלצה */}
      <div className="relative z-10 mt-auto pt-14">
        <div className="flex items-start gap-4">
          {photo?.url ? (
            <Image
              src={photo.url}
              alt={photo.alt || panel.testimonial.name}
              width={48}
              height={48}
              className="size-12 shrink-0 rounded-full border border-white/20 object-cover"
            />
          ) : (
            <span className="bg-primary-container text-on-primary flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold">
              {initials(panel.testimonial.name)}
            </span>
          )}
          <div>
            <p className="text-inverse-on-surface/90 mb-2 text-sm italic">
              &ldquo;{panel.testimonial.quote}&rdquo;
            </p>
            <p className="text-xs font-bold">{panel.testimonial.name}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("");
}
