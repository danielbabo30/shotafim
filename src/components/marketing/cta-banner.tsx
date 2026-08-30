import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

type Props = {
  headingLead: string;
  headingTail?: string | null;
  body: string;
  action: { label: string; href: string };
};

/** כרטיס קריאה לפעולה על רקע כהה — משותף לעמודי השיווק. */
export function CtaBanner({ headingLead, headingTail, body, action }: Props) {
  return (
    <section className="bg-surface">
      <Container className="py-24">
        <div className="bg-inverse-surface shadow-ambient-lg relative mx-auto max-w-4xl overflow-hidden rounded-xl p-12 text-center md:p-16">
          <div className="bg-primary-fixed/20 pointer-events-none absolute -end-24 -top-24 size-64 rounded-full blur-3xl" />

          <h2 className="text-inverse-on-surface relative text-3xl font-bold text-balance sm:text-4xl">
            {headingLead}
            {headingTail ? <> {headingTail}</> : null}
          </h2>
          <p className="text-inverse-on-surface/80 relative mx-auto mt-5 max-w-2xl text-lg leading-relaxed">
            {body}
          </p>

          {action?.href && (
            <div className="relative mt-10">
              <Button href={action.href} size="lg">
                {action.label}
              </Button>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
