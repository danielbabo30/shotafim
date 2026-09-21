#!/usr/bin/env node
/**
 * בונה את ה-ZIP של תוסף ה-WooCommerce.
 *
 *   node wp-plugin/build.mjs
 *
 * פלט (מקומיט ל-repo — הדפלוי של Next קורא אותו דרך ה-route המוגן):
 *   wp-plugin/dist/bridgead-woo-plugin.zip   — הארכיון (מכיל תיקיית bridgead-woo/ ברמה העליונה)
 *   wp-plugin/dist/version.txt               — מחרוזת הגרסה (לשם קובץ ההורדה)
 *
 * דורש את ה-CLI ‎`zip`‎ (קיים ב-macOS, Linux ובתמונת ה-build של Vercel).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const pluginDir = "bridgead-woo";
const distDir = join(root, "dist");
const zipPath = join(distDir, "bridgead-woo-plugin.zip");

const header = readFileSync(join(root, pluginDir, "bridgead-woo.php"), "utf8");
const version = (header.match(/^\s*\*\s*Version:\s*([0-9][0-9.]*)/m) || [])[1];
if (!version) {
  console.error("build.mjs: could not read Version from bridgead-woo.php header");
  process.exit(1);
}

mkdirSync(distDir, { recursive: true });
rmSync(zipPath, { force: true });

try {
  execFileSync(
    "zip",
    ["-r", "-q", "-X", zipPath, pluginDir, "-x", "*/.DS_Store", "-x", "__MACOSX/*"],
    { cwd: root, stdio: "inherit" },
  );
} catch (err) {
  console.error("build.mjs: `zip` failed — is the zip CLI installed?", err.message);
  process.exit(1);
}

writeFileSync(join(distDir, "version.txt"), version + "\n");
console.log(`✓ wp-plugin/dist/bridgead-woo-plugin.zip  (v${version})`);
