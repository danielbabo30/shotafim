import { Container } from "@/components/ui/container";

/** Hero של לובי המדריכים — כותרת ותת-כותרת ממורכזות על רקע עדין. */
export function GuideHero({ heading, subheading }: { heading: string; subheading: string }) {
  return (
    <section className="relative overflow-hidden">
      <div className="from-surface-low via-background to-surface-lowest absolute inset-0 -z-10 bg-gradient-to-bl" />
      <div className="bg-primary/10 absolute -end-40 -top-40 -z-10 size-96 rounded-full blur-3xl" />

      <Container className="flex flex-col items-center gap-4 py-16 text-center lg:py-20">
        <h1 className="max-w-3xl text-3xl leading-tight font-bold text-balance sm:text-4xl md:text-5xl">
          {heading}
        </h1>
        <p className="text-on-surface-variant max-w-2xl text-lg leading-relaxed">{subheading}</p>
      </Container>
    </section>
  );
}
