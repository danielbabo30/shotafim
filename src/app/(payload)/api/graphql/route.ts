/* THIS FILE WAS GENERATED FOR PAYLOAD — נוסף עטיפת rate limit (SEC-M-03) */
import config from "@payload-config";
import { GRAPHQL_POST, REST_OPTIONS } from "@payloadcms/next/routes";

import { rateLimitRequest } from "@/lib/rate-limit";

const graphqlPost = GRAPHQL_POST(config);

export const POST: typeof graphqlPost = async (request) => {
  const limited = await rateLimitRequest(request, "payload:graphql", 60, 60);
  if (limited) return limited;
  return graphqlPost(request);
};
export const OPTIONS = REST_OPTIONS(config);
