import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

/** תוכן עמוד 404 משותף — עברית, בעיצוב האתר, עם קישורי חזרה */
export function NotFoundView() {
  return (
    <Container className="py-24 text-center lg:py-32">
      <p className="text-primary font-display text-6xl font-bold sm:text-7xl">404</p>
      <h1 className="mt-4 text-3xl font-bold text-balance sm:text-4xl">העמוד לא נמצא</h1>
      <p className="text-on-surface-variant mx-auto mt-4 max-w-md text-lg leading-relaxed">
        ייתכן שהקישור שגוי או שהעמוד הוסר. אפשר לחזור לדף הבית ולהמשיך משם.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button href="/" size="lg">
          חזרה לדף הבית
        </Button>
        <Button href="/contact" variant="ghost" size="lg">
          צור קשר
        </Button>
      </div>
    </Container>
  );
}
