import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { hasEmail, hasGoogle } from "@/env";
import { AuthSplitScreen } from "@/components/auth/auth-split-screen";
import { AuthProgress } from "@/components/auth/auth-progress";

export const metadata: Metadata = {
  title: "הרשמה",
  description: "פתיחת חשבון במערכת שותפים — תהליך הרשמה מאובטח בשלושה שלבים.",
};

const REDIRECT_TO = "/register/roles";

type SearchParams = Promise<{ check?: string; error?: string }>;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const { check, error } = await searchParams;

  const session = await auth();
  if (session?.user) redirect(REDIRECT_TO);

  const noProviders = !hasGoogle && !hasEmail;

  return (
    <AuthSplitScreen>
      <AuthProgress step={1} total={3} label="פתיחת חשבון משתמש" />

      <h1 className="text-on-surface mb-8 text-3xl font-bold">צור חשבון חדש</h1>

      {check === "email" && (
        <p className="bg-success-container text-success mb-6 rounded-lg p-3 text-center text-sm font-medium">
          שלחנו לך קישור הרשמה למייל. פתח אותו כדי להמשיך — הקישור פתוח לשעה.
        </p>
      )}
      {error === "email" && (
        <p className="bg-error-container text-on-error-container mb-6 rounded-lg p-3 text-center text-sm font-medium">
          שליחת הקישור נכשלה. בדוק את כתובת הדוא״ל ונסה שוב.
        </p>
      )}
      {error === "consent" && (
        <p className="bg-error-container text-on-error-container mb-6 rounded-lg p-3 text-center text-sm font-medium">
          יש לאשר את תנאי השימוש ומדיניות הפרטיות כדי להמשיך.
        </p>
      )}

      {noProviders && (
        <p className="border-warning/40 bg-warning-container text-warning mb-6 rounded-lg border p-3 text-sm">
          עדיין לא הוגדר אף ספק כניסה. הוסף <code>AUTH_GOOGLE_ID</code>/
          <code>AUTH_GOOGLE_SECRET</code> או <code>AUTH_RESEND_KEY</code> בקובץ <code>.env</code>.
        </p>
      )}

      {hasGoogle && (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: REDIRECT_TO });
          }}
        >
          <button
            type="submit"
            className="border-outline-variant hover:bg-surface-container bg-surface-lowest mb-6 flex h-11 w-full items-center justify-center gap-3 rounded border text-sm font-semibold transition-colors"
          >
            <GoogleGlyph />
            הרשמה באמצעות Google
          </button>
        </form>
      )}

      {hasGoogle && hasEmail && (
        <div className="mb-6 flex items-center gap-4">
          <span className="border-outline-variant h-px flex-1 border-t" />
          <span className="text-on-surface-variant text-xs">או באמצעות דוא״ל</span>
          <span className="border-outline-variant h-px flex-1 border-t" />
        </div>
      )}

      {hasEmail && (
        <form
          action={async (formData: FormData) => {
            "use server";
            if (formData.get("consent") !== "on") {
              redirect("/register?error=consent");
            }
            try {
              await signIn("resend", {
                email: String(formData.get("email")),
                redirectTo: REDIRECT_TO,
              });
            } catch (err) {
              if (err instanceof AuthError) {
                redirect("/register?error=email");
              }
              throw err;
            }
          }}
          className="space-y-5"
        >
          <div>
            <label htmlFor="email" className="text-on-surface mb-1 block text-sm font-semibold">
              כתובת דוא״ל עסקית
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              dir="ltr"
              placeholder="name@company.com"
              className="bg-surface-low text-on-surface placeholder:text-on-surface-variant/60 focus:bg-surface-lowest focus:ring-primary h-11 w-full rounded border-0 px-4 transition-colors focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="bg-surface-low flex items-start gap-3 rounded p-4">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              required
              className="text-primary focus:ring-primary border-outline mt-0.5 size-4 rounded"
            />
            <label htmlFor="consent" className="text-on-surface-variant text-sm leading-relaxed">
              אני מסכים/ה{" "}
              <Link href="/legal/terms" className="text-primary hover:underline">
                לתנאי השימוש
              </Link>{" "}
              ו
              <Link href="/legal/privacy" className="text-primary hover:underline">
                למדיניות הפרטיות
              </Link>{" "}
              של שותפים, לרבות שימוש בפרטים אלו לצורך אימות זהות מול ספק הנאמנות.
            </label>
          </div>

          <button
            type="submit"
            className="bg-primary text-on-primary shadow-ambient-lg hover:bg-primary-hover flex h-12 w-full items-center justify-center gap-2 rounded-lg text-base font-semibold transition-colors"
          >
            שלח לי קישור הרשמה
            <ArrowGlyph />
          </button>
        </form>
      )}

      <p className="text-on-surface-variant mt-8 text-center text-sm">
        כבר יש לך חשבון?{" "}
        <Link href="/sign-in" className="text-primary font-bold hover:underline">
          התחבר כאן
        </Link>
      </p>
    </AuthSplitScreen>
  );
}

function ArrowGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
