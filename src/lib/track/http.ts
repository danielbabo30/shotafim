import "server-only";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/** גוף JSON גולמי → אובייקט, או null אם לא תקין */
export function parseJsonBody(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function badRequest(err: ZodError): NextResponse {
  const issue = err.issues[0];
  return NextResponse.json(
    { error: issue?.message ?? "payload שגוי", field: issue?.path.join(".") },
    { status: 400 },
  );
}

export function accepted(data: Record<string, unknown>): NextResponse {
  return NextResponse.json({ ok: true, ...data }, { status: 202 });
}

export function ok(data: Record<string, unknown>): NextResponse {
  return NextResponse.json({ ok: true, ...data }, { status: 200 });
}

/** מזהה שגיאה עם httpStatus שמושלך ממנוע הקליטה (למשל מטבע לא נתמך → 422) */
export function fromThrown(e: unknown): NextResponse {
  const status = typeof e === "object" && e && "httpStatus" in e ? Number(e.httpStatus) : 500;
  const message = e instanceof Error ? e.message : "שגיאת שרת";
  return NextResponse.json({ error: message }, { status });
}
