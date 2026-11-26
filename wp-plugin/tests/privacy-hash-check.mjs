#!/usr/bin/env node
/**
 * בדיקת תאימות hash v2 בין PHP (class-bridgead-api.php) לבין המפרט בצד השרת
 * (src/lib/track/crypto.ts). דורש php ב-CLI.   node wp-plugin/tests/privacy-hash-check.mjs
 */
import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const KEY = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
const DATE = new Date().toISOString().slice(0, 10);
const sub = (p) => createHmac("sha256", KEY).update(p).digest();
const mac = (k, m) => createHmac("sha256", k).update(m).digest("hex");

function trunc(ip) {
  const m = ip.match(/^(?:::ffff:)?(\d+)\.(\d+)\.(\d+)\.\d+$/i);
  if (m) return `${m[1]}.${m[2]}.${m[3]}.0`;
  return null; // IPv6 נבדק רק ע"י PHP (ראו להלן)
}

const cases = [
  { ip: "203.0.113.77", email: "  Alice@Example.COM ", ua: "Mozilla/5.0" },
  { ip: "203.0.113.200", email: "alice@example.com", ua: "Mozilla/5.0" },
  { ip: "::ffff:198.51.100.9", email: "b@x.io", ua: "curl/8" },
  { ip: "2001:db8:abcd:1234:5678::1", email: "c@x.io", ua: "x" },
  { ip: "2001:db8:abcd:ffff::9", email: "c@x.io", ua: "x" },
];
let fail = 0;
const out = cases.map((c) => {
  const r = JSON.parse(
    execFileSync("php", [
      join(here, "privacy-hash-harness.php"),
      KEY,
      DATE,
      c.ip,
      c.email,
      c.ua,
    ]).toString(),
  );
  const t = trunc(c.ip) ?? r.trunc;
  const exp = {
    ip: "v2:" + mac(sub("ip"), `${DATE}|${t}`),
    ua: "v2:" + mac(sub("ua"), `${DATE}|${c.ua}`),
    customer: "v2:" + mac(sub("customer"), c.email.trim().toLowerCase()),
  };
  for (const k of ["ip", "ua", "customer"]) {
    if (r[k] !== exp[k]) {
      fail++;
      console.error(`MISMATCH ${k} for`, c, r[k], exp[k]);
    }
  }
  return { ...c, trunc: r.trunc, ip_hash: r.ip, customer_hash: r.customer };
});
// עקביות: אותו /24 → אותו ipHash; /48 זהה ב-IPv6; אימייל מנורמל → אותו customerHash
const eq = (a, b, n) => {
  if (a !== b) {
    fail++;
    console.error("EXPECTED EQUAL:", n);
  }
};
eq(out[0].ip_hash, out[1].ip_hash, "same /24 same ipHash");
eq(out[0].customer_hash, out[1].customer_hash, "normalized email same hash");
eq(out[3].ip_hash, out[4].ip_hash, "same /48 same ipHash");
eq(out[3].trunc, "2001:db8:abcd::", "ipv6 /48 canonical");
eq(out[2].trunc, "198.51.100.0", "ipv4-mapped → /24");
console.log(out.map((o) => `${o.ip} -> ${o.trunc}  ${o.ip_hash.slice(0, 16)}…`).join("\n"));
console.log(fail ? `FAIL (${fail})` : "OK — PHP and reference agree");
process.exit(fail ? 1 : 0);
