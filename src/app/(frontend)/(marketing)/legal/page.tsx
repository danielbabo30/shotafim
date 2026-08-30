import { redirect } from "next/navigation";
import { LEGAL_PAGES } from "@/lib/legal-pages";

/** /legal → המסמך הראשון (הצהרת נגישות). כל מסמך נגיש ישירות ב-/legal/<slug>. */
export default function LegalIndexPage() {
  redirect(`/legal/${LEGAL_PAGES[0].slug}`);
}
