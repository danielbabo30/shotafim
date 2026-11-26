/** קישור "דילוג לתוכן" — נראה רק בפוקוס מקלדת. היעד: אלמנט עם id="main-content". */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="bg-primary text-on-primary sr-only z-[100] rounded-lg px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
    >
      דילוג לתוכן הראשי
    </a>
  );
}
