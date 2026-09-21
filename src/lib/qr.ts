/**
 * מחולל מטריצת QR מינימלי — Byte mode, רמת תיקון שגיאות M, גרסאות 1–10.
 * טהור (בלי תלויות, בלי server-only) — משמש גם רכיב לקוח. מספיק ל-URLים
 * (עד ~213 בתים). מחזיר מטריצה בוליאנית (true = מודול כהה) לרינדור כ-SVG.
 *
 * מימוש התקן ISO/IEC 18004: קידוד נתונים, Reed-Solomon מעל GF(256),
 * שיבוץ תבניות, 8 מסכות עם ניקוד עונשין ובחירת המסכה הטובה ביותר.
 */

// ── GF(256) ──
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
const gfMul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function rsGenerator(degree: number): number[] {
  let poly = [1];
  for (let d = 0; d < degree; d++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let i = 0; i < poly.length; i++) {
      next[i] ^= gfMul(poly[i], EXP[d]);
      next[i + 1] ^= poly[i];
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: number[], ecLen: number): number[] {
  const gen = rsGenerator(ecLen);
  const res = new Array<number>(ecLen).fill(0);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.shift();
    res.push(0);
    for (let i = 0; i < ecLen; i++) res[i] ^= gfMul(gen[i], factor);
  }
  return res;
}

// ── טבלאות גרסה (רמת M בלבד) ──
// [ecCodewordsPerBlock, [ [blockCount, dataCodewordsPerBlock], ... ]]
const EC_BLOCKS_M: Array<[number, Array<[number, number]>]> = [
  [10, [[1, 16]]], // v1
  [16, [[1, 28]]], // v2
  [26, [[1, 44]]], // v3
  [18, [[2, 32]]], // v4
  [24, [[2, 43]]], // v5
  [16, [[4, 27]]], // v6
  [18, [[4, 31]]], // v7
  [
    22,
    [
      [2, 38],
      [2, 39],
    ],
  ], // v8
  [
    22,
    [
      [3, 36],
      [2, 37],
    ],
  ], // v9
  [
    26,
    [
      [4, 43],
      [1, 44],
    ],
  ], // v10
];
// קיבולת בתים (byte mode, רמת M) לפי גרסה
const BYTE_CAPACITY_M = [14, 26, 42, 62, 84, 106, 122, 152, 180, 213];
const ALIGN_CENTERS: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

function chooseVersion(byteLen: number): number {
  for (let v = 1; v <= 10; v++) if (byteLen <= BYTE_CAPACITY_M[v - 1]) return v;
  throw new Error("QR: המחרוזת ארוכה מדי (מעל 213 בתים)");
}

// ── קידוד נתונים ל-bitstream → codewords ──
function encodeData(bytes: number[], version: number): number[] {
  const dataCodewords = EC_BLOCKS_M[version - 1][1].reduce((s, [c, d]) => s + c * d, 0);
  const totalBits = dataCodewords * 8;
  const bits: number[] = [];
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  push(0b0100, 4); // מצב Byte
  push(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  // Terminator
  for (let i = 0; i < 4 && bits.length < totalBits; i++) bits.push(0);
  // יישור לבית
  while (bits.length % 8 !== 0) bits.push(0);
  // בתי ריפוד
  const pads = [0xec, 0x11];
  let p = 0;
  while (bits.length < totalBits) {
    push(pads[p % 2], 8);
    p++;
  }
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    codewords.push(v);
  }
  return codewords;
}

function interleave(codewords: number[], version: number): number[] {
  const [ecLen, groups] = EC_BLOCKS_M[version - 1];
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let offset = 0;
  for (const [count, size] of groups) {
    for (let b = 0; b < count; b++) {
      const block = codewords.slice(offset, offset + size);
      offset += size;
      dataBlocks.push(block);
      ecBlocks.push(rsEncode(block, ecLen));
    }
  }
  const maxData = Math.max(...dataBlocks.map((b) => b.length));
  const out: number[] = [];
  for (let i = 0; i < maxData; i++) {
    for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
  }
  for (let i = 0; i < ecLen; i++) {
    for (const block of ecBlocks) out.push(block[i]);
  }
  return out;
}

// ── שיבוץ מטריצה ──
type Grid = (boolean | null)[][];

function makeGrid(size: number): Grid {
  return Array.from({ length: size }, () => new Array<boolean | null>(size).fill(null));
}

function placeFinder(g: Grid, r: number, c: number) {
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= g.length || cc >= g.length) continue;
      const inRing =
        (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) ||
        (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6));
      const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      g[rr][cc] = inRing || inCore;
    }
  }
}

function placeFunctionPatterns(g: Grid, version: number): boolean[][] {
  const size = g.length;
  const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const reserve = (r: number, c: number) => {
    if (r >= 0 && c >= 0 && r < size && c < size) reserved[r][c] = true;
  };

  // Finder + separators
  for (const [fr, fc] of [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ]) {
    placeFinder(g, fr, fc);
    for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) reserve(fr + dr, fc + dc);
  }

  // Timing
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0;
    g[6][i] = dark;
    g[i][6] = dark;
    reserve(6, i);
    reserve(i, 6);
  }

  // Alignment
  const centers = ALIGN_CENTERS[version - 1];
  for (const ar of centers) {
    for (const ac of centers) {
      if (reserved[ar]?.[ac]) continue; // חופף לתבנית איתור
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const ring = Math.max(Math.abs(dr), Math.abs(dc));
          g[ar + dr][ac + dc] = ring !== 1;
          reserve(ar + dr, ac + dc);
        }
      }
    }
  }

  // Dark module + format-info reservation
  g[size - 8][8] = true;
  reserve(size - 8, 8);
  for (let i = 0; i < 9; i++) {
    reserve(8, i);
    reserve(i, 8);
  }
  for (let i = 0; i < 8; i++) {
    reserve(8, size - 1 - i);
    reserve(size - 1 - i, 8);
  }

  // Version info (v7+)
  if (version >= 7) {
    const vbits = versionInfoBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((vbits >> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = (i % 3) + size - 11;
      g[a][b] = bit;
      g[b][a] = bit;
      reserve(a, b);
      reserve(b, a);
    }
  }

  return reserved;
}

function versionInfoBits(version: number): number {
  let d = version << 12;
  const rem = (() => {
    let r = d;
    for (let i = 17; i >= 12; i--) if ((r >> i) & 1) r ^= 0x1f25 << (i - 12);
    return r;
  })();
  d |= rem;
  return d;
}

function formatInfoBits(mask: number): number {
  // רמת M = 00
  const data = (0b00 << 3) | mask;
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
  return ((data << 10) | rem) ^ 0x5412;
}

function placeData(g: Grid, reserved: boolean[][], bytes: number[]) {
  const size = g.length;
  const bits: number[] = [];
  for (const b of bytes) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  let bi = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col = 5; // דילוג על עמודת התזמון
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (reserved[row][cc]) continue;
        g[row][cc] = bi < bits.length ? bits[bi] === 1 : false;
        bi++;
      }
    }
    upward = !upward;
  }
}

const MASK_FN: Array<(r: number, c: number) => boolean> = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyMask(g: Grid, reserved: boolean[][], mask: number): boolean[][] {
  const size = g.length;
  const out = g.map((row) => row.map((v) => v === true));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      if (MASK_FN[mask](r, c)) out[r][c] = !out[r][c];
    }
  }
  return out;
}

function placeFormat(m: boolean[][], mask: number) {
  const size = m.length;
  const bits = formatInfoBits(mask);
  for (let i = 0; i < 15; i++) {
    const bit = ((bits >> i) & 1) === 1;
    // עותק סביב תבנית האיתור השמאלית-עליונה
    if (i < 6) m[8][i] = bit;
    else if (i === 6) m[8][7] = bit;
    else if (i === 7) m[8][8] = bit;
    else if (i === 8) m[7][8] = bit;
    else m[14 - i][8] = bit;
    // עותק שני
    if (i < 8) m[size - 1 - i][8] = bit;
    else m[8][size - 15 + i] = bit;
  }
  m[size - 8][8] = true; // מודול כהה
}

function penalty(m: boolean[][]): number {
  const n = m.length;
  let score = 0;
  // כלל 1 — רצפים
  for (let r = 0; r < n; r++) {
    for (const line of [m[r], m.map((row) => row[r])]) {
      let run = 1;
      for (let i = 1; i < n; i++) {
        if (line[i] === line[i - 1]) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score += 1;
        } else run = 1;
      }
    }
  }
  // כלל 2 — בלוקים 2x2
  for (let r = 0; r < n - 1; r++)
    for (let c = 0; c < n - 1; c++)
      if (m[r][c] === m[r + 1][c] && m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c + 1])
        score += 3;
  // כלל 3 — תבנית דמוית finder
  const p1 = [true, false, true, true, true, false, true, false, false, false, false];
  const p2 = [...p1].reverse();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c <= n - 11; c++) {
      const rowSeg = m[r].slice(c, c + 11);
      const colSeg = m.slice(c, c + 11).map((row) => row[r]);
      if (eq(rowSeg, p1) || eq(rowSeg, p2)) score += 40;
      if (eq(colSeg, p1) || eq(colSeg, p2)) score += 40;
    }
  }
  // כלל 4 — איזון כהה/בהיר
  let dark = 0;
  for (const row of m) for (const v of row) if (v) dark++;
  const ratio = (dark / (n * n)) * 100;
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10;
  return score;
}
const eq = (a: boolean[], b: boolean[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** מחזיר מטריצת QR (true = מודול כהה) עבור הטקסט הנתון. */
export function qrMatrix(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  const version = chooseVersion(bytes.length);
  const size = version * 4 + 17;

  const dataCodewords = encodeData(bytes, version);
  const finalCodewords = interleave(dataCodewords, version);

  const base = makeGrid(size);
  const reserved = placeFunctionPatterns(base, version);
  placeData(base, reserved, finalCodewords);

  let best: boolean[][] | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const masked = applyMask(base, reserved, mask);
    placeFormat(masked, mask);
    const s = penalty(masked);
    if (s < bestScore) {
      bestScore = s;
      best = masked;
    }
  }
  return best!;
}

/** מרנדר מטריצת QR כמחרוזת SVG (מודולים כהים כ-<rect> אחד ב-path). */
export function qrSvg(text: string, opts: { size?: number; margin?: number } = {}): string {
  const matrix = qrMatrix(text);
  const n = matrix.length;
  const margin = opts.margin ?? 2;
  const dim = n + margin * 2;
  const px = opts.size ?? 160;
  let d = "";
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (matrix[r][c]) d += `M${c + margin} ${r + margin}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${px}" height="${px}" shape-rendering="crispEdges"><rect width="${dim}" height="${dim}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
