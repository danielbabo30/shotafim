import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { hasEmail, hasGoogle } from "@/env";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "כניסה" };

type SearchParams = Promise<{ callbackUrl?: string; check?: string; error?: string }>;

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const { callbackUrl, check, error } = await searchParams;

  const session = await auth();
  if (session?.user) redirect(callbackUrl || "/dashboard");

  const redirectTo = callbackUrl || "/dashboard";
  const noProviders = !hasGoogle && !hasEmail;

  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="text-center">
        <Link href="/" className="text-xl font-bold">
          {site.name}
        </Link>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">כניסה לאזור האישי</p>
      </div>

      {check === "email" && (
        <p className="rounded-lg bg-green-500/10 p-3 text-center text-sm text-green-700 dark:text-green-400">
          שלחנו לך קישור כניסה למייל. בדוק את תיבת הדואר.
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-500/10 p-3 text-center text-sm text-red-700 dark:text-red-400">
          הכניסה נכשלה. נסה שוב.
        </p>
      )}

      {noProviders && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
          עדיין לא הוגדר אף ספק כניסה. הוסף <code>AUTH_GOOGLE_ID</code>/
          <code>AUTH_GOOGLE_SECRET</code> או <code>AUTH_RESEND_KEY</code> בקובץ <code>.env</code>.
        </p>
      )}

      {hasGoogle && (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg border border-black/15 px-4 py-2.5 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
          >
            כניסה עם Google
          </button>
        </form>
      )}

      {hasEmail && (
        <form
          action={async (formData: FormData) => {
            "use server";
            try {
              await signIn("resend", {
                email: String(formData.get("email")),
                redirectTo,
              });
            } catch (err) {
              if (err instanceof AuthError) {
                redirect("/sign-in?error=email");
              }
              throw err;
            }
          }}
          className="flex flex-col gap-2"
        >
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-lg border border-black/15 px-4 py-2.5 dark:border-white/20"
          />
          <button
            type="submit"
            className="bg-foreground text-background w-full rounded-lg px-4 py-2.5 font-medium"
          >
            שלח לי קישור כניסה
          </button>
        </form>
      )}

      <p className="text-center text-sm text-black/60 dark:text-white/60">
        אין לך חשבון?{" "}
        <Link href="/register" className="text-primary font-semibold hover:underline">
          הרשמה למערכת
        </Link>
      </p>
    </div>
  );
}
