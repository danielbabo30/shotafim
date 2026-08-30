import type { ComponentType } from "react";
import { Container } from "@/components/ui/container";
import {
  LockIcon,
  UploadFileIcon,
  MegaphoneIcon,
  ReceiptIcon,
  ShieldCheckIcon,
} from "@/components/marketing/icons";
import type { HowItWorks } from "@/payload-types";

type Step = NonNullable<HowItWorks["timeline"]["steps"]>[number];

const ICONS: Record<Step["icon"], ComponentType<{ className?: string }>> = {
  lock: LockIcon,
  upload: UploadFileIcon,
  campaign: MegaphoneIcon,
  receipt: ReceiptIcon,
  shield: ShieldCheckIcon,
};

/** ציר תהליך אנכי — כרטיס לכל שלב, מחובר בקו רציף עם צמתי אייקון. */
export function ProcessTimeline({ timeline }: { timeline: HowItWorks["timeline"] }) {
  const steps = timeline.steps ?? [];
  if (!steps.length) return null;

  return (
    <section className="border-outline-variant/40 from-background to-surface-low border-t bg-gradient-to-b">
      <Container className="py-20">
        <h2 className="mb-14 text-center text-3xl font-bold sm:text-4xl">{timeline.heading}</h2>

        <ol className="mx-auto max-w-3xl space-y-6">
          {steps.map((step, i) => {
            const Icon = ICONS[step.icon] ?? LockIcon;
            const isLast = i === steps.length - 1;
            return (
              <li key={step.id ?? i} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <span className="bg-primary-fixed text-primary flex size-11 shrink-0 items-center justify-center rounded-full">
                    <Icon className="size-5" />
                  </span>
                  {!isLast && <span className="bg-outline-variant/50 mt-1 w-px flex-1" />}
                </div>
                <div className="border-outline-variant/40 bg-surface-lowest shadow-ambient-sm hover:shadow-ambient flex-1 rounded-lg border p-6 transition-shadow">
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="text-on-surface-variant mt-2 text-base leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
