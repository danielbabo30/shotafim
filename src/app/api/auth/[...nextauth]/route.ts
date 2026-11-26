import { handlers } from "@/auth";
import { rateLimitRequest } from "@/lib/rate-limit";

export const { GET } = handlers;

/**
 * POST ל-/api/auth/* (signin/resend, callback, signout...) — מוגבל לפי IP כדי למנוע
 * הצפת קישורי כניסה / brute-force (SEC-A-03). הגבלה נוספת לפי מייל בטפסי הכניסה עצמם.
 */
export async function POST(request: Request) {
  const limited = await rateLimitRequest(request, "auth:post", 30, 600);
  if (limited) return limited;
  return handlers.POST(request as Parameters<typeof handlers.POST>[0]);
}
