import "server-only";
import { getPayload } from "payload";
import config from "@payload-config";

/** מופע Payload (Local API) — לשימוש ב-Server Components ובפעולות שרת */
export const getPayloadClient = () => getPayload({ config });
