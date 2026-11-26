import "server-only";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { env } from "@/env";

/**
 * אחסון קבצים פרטיים — ממשק אחיד עם דרייבר לפי env STORAGE_DRIVER.
 *
 *  • local (ברירת מחדל) — כותב ל-<repo>/.storage (מחוץ ל-public; ב-.gitignore). dev בלבד.
 *  • gcs — Google Cloud Storage (Cloud Run). bucket פרטי; התחברות דרך Application Default
 *    Credentials (ה-service account של Cloud Run — אין מפתחות בקוד). דורש GCS_BUCKET.
 *  • blob — @vercel/blob. נקודת הרחבה בלבד, טרם מומש.
 *
 * הקבצים אף פעם לא נגישים ישירות — ההגשה עוברת דרך route handler מאומת
 * (src/app/api/contract-files/[attachmentId]/route.ts).
 */

export type StoredObject = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
};

export interface StorageDriver {
  put(key: string, bytes: Buffer, contentType: string): Promise<{ key: string }>;
  get(key: string): Promise<StoredObject | null>;
  remove(key: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────
//  local driver — dev only
// ─────────────────────────────────────────────────────────────

const LOCAL_ROOT = path.join(process.cwd(), ".storage");

/** מונע path traversal — key יחסי בלבד */
const safeKey = (key: string): string =>
  key
    .replace(/\\/g, "/")
    .split("/")
    .filter((seg) => seg && seg !== "." && seg !== "..")
    .join("/");

const localDriver: StorageDriver = {
  async put(key, bytes, contentType) {
    const k = safeKey(key);
    const file = path.join(LOCAL_ROOT, k);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
    await writeFile(`${file}.meta.json`, JSON.stringify({ contentType, size: bytes.byteLength }));
    return { key: k };
  },

  async get(key) {
    const k = safeKey(key);
    // קובצי ה-sidecar הפנימיים אינם אובייקטים נגישים (RT-04)
    if (k.endsWith(".meta.json")) return null;
    const file = path.join(LOCAL_ROOT, k);
    if (!existsSync(file)) return null;

    let contentType = "application/octet-stream";
    let size = 0;
    try {
      const meta = JSON.parse(await readFile(`${file}.meta.json`, "utf8"));
      if (typeof meta.contentType === "string") contentType = meta.contentType;
      if (typeof meta.size === "number") size = meta.size;
    } catch {
      // אין sidecar — נשארים בברירות המחדל
    }

    return {
      body: Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>,
      contentType,
      size,
    };
  },

  async remove(key) {
    const k = safeKey(key);
    const file = path.join(LOCAL_ROOT, k);
    await rm(file, { force: true });
    await rm(`${file}.meta.json`, { force: true });
  },
};

// ─────────────────────────────────────────────────────────────
//  gcs driver — Google Cloud Storage (פרודקשן ב-Cloud Run)
// ─────────────────────────────────────────────────────────────

type GcsBucket = import("@google-cloud/storage").Bucket;
let gcsBucket: Promise<GcsBucket> | null = null;

/** יצירה עצלה — כך ש-@google-cloud/storage לא נטען בדרייבר local ולא בזמן הבילד. */
const getBucket = (): Promise<GcsBucket> => {
  gcsBucket ??= (async () => {
    const name = env.GCS_BUCKET;
    if (!name) throw new Error("STORAGE_DRIVER=gcs דורש את המשתנה GCS_BUCKET.");
    const { Storage } = await import("@google-cloud/storage");
    return new Storage().bucket(name); // ADC — בלי מפתחות
  })();
  return gcsBucket;
};

const isNotFound = (err: unknown): boolean =>
  typeof err === "object" && err !== null && (err as { code?: unknown }).code === 404;

const gcsDriver: StorageDriver = {
  async put(key, bytes, contentType) {
    const k = safeKey(key);
    const bucket = await getBucket();
    await bucket.file(k).save(bytes, { contentType, resumable: false });
    return { key: k };
  },

  async get(key) {
    const k = safeKey(key);
    if (!k || k.endsWith(".meta.json")) return null;
    const file = (await getBucket()).file(k);

    let contentType = "application/octet-stream";
    let size = 0;
    try {
      const [meta] = await file.getMetadata();
      if (typeof meta.contentType === "string") contentType = meta.contentType;
      size = Number(meta.size ?? 0) || 0;
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }

    // הזרמה מה-bucket — בלי טעינת הקובץ כולו לזיכרון
    return {
      body: Readable.toWeb(file.createReadStream()) as ReadableStream<Uint8Array>,
      contentType,
      size,
    };
  },

  async remove(key) {
    const k = safeKey(key);
    if (!k) return;
    await (await getBucket()).file(k).delete({ ignoreNotFound: true });
  },
};

// ─────────────────────────────────────────────────────────────
//  blob driver — production placeholder
// ─────────────────────────────────────────────────────────────

const NOT_IMPLEMENTED = "STORAGE_DRIVER=blob טרם מומש — התקן @vercel/blob וממש כאן.";

const blobDriver: StorageDriver = {
  // TODO(prod): put → put(key, bytes, { access: "private", contentType });
  //             get → fetch(blobUrl) ; remove → del(blobUrl)
  put: () => Promise.reject(new Error(NOT_IMPLEMENTED)),
  get: () => Promise.reject(new Error(NOT_IMPLEMENTED)),
  remove: () => Promise.reject(new Error(NOT_IMPLEMENTED)),
};

export const storage: StorageDriver =
  env.STORAGE_DRIVER === "gcs"
    ? gcsDriver
    : env.STORAGE_DRIVER === "blob"
      ? blobDriver
      : localDriver;
