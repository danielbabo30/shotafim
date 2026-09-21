import "server-only";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

/**
 * אחסון קבצים פרטיים — ממשק אחיד עם דרייבר לפי env STORAGE_DRIVER.
 *
 *  • local (ברירת מחדל) — כותב ל-<repo>/.storage (מחוץ ל-public; ב-.gitignore). dev בלבד.
 *  • blob — @vercel/blob לפרודקשן. נקודת הרחבה בלבד, טרם מומש.
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
  process.env.STORAGE_DRIVER === "blob" ? blobDriver : localDriver;
