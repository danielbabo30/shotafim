/* THIS FILE WAS GENERATED FOR PAYLOAD — נוסף עטיפת rate limit ל-login (SEC-M-04) */
import config from "@payload-config";
import "@payloadcms/next/css";
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
} from "@payloadcms/next/routes";

import { rateLimitRequest } from "@/lib/rate-limit";

export const GET = REST_GET(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const OPTIONS = REST_OPTIONS(config);

const restPost = REST_POST(config);

/** POST: login / forgot-password / reset-password מוגבלים לפי IP; שאר הפעולות — תקרה כללית. */
export const POST: typeof restPost = async (request, ctx) => {
  const { pathname } = new URL(request.url);
  const isAuthEndpoint = /\/(login|forgot-password|reset-password|unlock|first-register)\/?$/.test(
    pathname,
  );
  const limited = isAuthEndpoint
    ? await rateLimitRequest(request, "payload:auth", 10, 600)
    : await rateLimitRequest(request, "payload:post", 120, 60);
  if (limited) return limited;
  return restPost(request, ctx);
};
