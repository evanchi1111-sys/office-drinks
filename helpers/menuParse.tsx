import type { MenuItem, Topping } from "./drinkTypes";

/** Split pasted text / CSV into rows. Tab-delimited if any tab exists, otherwise comma. */
export function splitCSV(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const delim = src.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQ = false;
      } else cell += c;
    } else if (c === '"' && cell === "") {
      inQ = true;
    } else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  rows.push(row);
  return rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some((x) => x !== ""));
}

export function parsePrice(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return m ? Math.round(parseFloat(m[0])) : null;
}

const NAME_PRICE = /^(.+?)[\s:：]*(?:NT\$?|\$|＄)?\s*(\d+)\s*(?:元)?$/i;

export type ParsedMenu = { sizes: string[]; items: MenuItem[]; toppings?: Topping[] };

const TOPPING_LINE = /^(.+?)[\s,\uFF0C:\uFF1A]*[+\uFF0B]?\s*(?:NT\$?|\$|\uFF04)?\s*(\d+)?\s*(?:\u5143)?$/i;

/** 每行一個加料:「大珍珠 10」「小珍珠,10」「椰果」(沒寫價格 = 0)。 */
export function parseToppingsText(text: string): Topping[] {
  const out: Topping[] = [];
  for (const raw of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(TOPPING_LINE);
    const n = (m?.[1] ?? line).trim();
    if (!n || out.some((t) => t.n === n)) continue;
    out.push({ n: n.slice(0, 40), p: m?.[2] ? Math.min(1000, parseInt(m[2], 10)) : 0 });
  }
  return out;
}

export function mergeToppings(existing: Topping[], incoming: Topping[], mode: "append" | "replace"): Topping[] {
  if (mode === "replace") return incoming.length ? incoming : existing;
  const out = existing.map((t) => ({ ...t }));
  for (const t of incoming) {
    const hit = out.find((x) => x.n === t.n);
    if (hit) hit.p = t.p;
    else out.push({ ...t });
  }
  return out;
}

function defaultSizes(n: number): string[] {
  if (n <= 1) return ["中杯"];
  if (n === 2) return ["中杯", "大杯"];
  return Array.from({ length: n }, (_, i) => `規格${i + 1}`);
}

export function parseMenu(text: string): ParsedMenu {
  let rows = splitCSV(text);
  if (rows.length === 0) return { sizes: ["中杯"], items: [] };
  // Single-cell lines like "珍珠奶茶 50": split name/price
  rows = rows.map((r) => {
    if (r.length === 1) {
      const m = r[0].match(NAME_PRICE);
      if (m) return [m[1].trim(), m[2]];
    }
    return r;
  });
  const first = rows[0];
  const looksHeader =
    first.length > 1 && first.slice(1).every((c) => c !== "" && parsePrice(c) === null);
  let sizes: string[];
  let body = rows;
  if (looksHeader) {
    sizes = first.slice(1).filter((c) => c !== "");
    body = rows.slice(1);
  } else {
    const cols = Math.max(1, ...rows.map((r) => r.length - 1));
    sizes = defaultSizes(cols);
  }
  if (sizes.length === 0) sizes = ["中杯"];
  const items: MenuItem[] = [];
  for (const r of body) {
    const n = r[0]?.trim();
    if (!n) continue;
    const p = sizes.map((_, i) => parsePrice(r[i + 1]));
    if (r.length === 1 && p.every((x) => x === null)) continue; // category line
    items.push({ n, p });
  }
  return { sizes, items };
}

export function applyMenu(
  existing: ParsedMenu,
  parsed: ParsedMenu,
  mode: "append" | "replace",
): ParsedMenu {
  if (mode === "replace") return { ...parsed, toppings: mergeToppings(existing.toppings ?? [], parsed.toppings ?? [], "replace") };
  const sizes = [...existing.sizes];
  for (const s of parsed.sizes) if (!sizes.includes(s)) sizes.push(s);
  const remap = (labels: string[], p: (number | null)[]) =>
    sizes.map((s) => {
      const i = labels.indexOf(s);
      return i >= 0 ? (p[i] ?? null) : null;
    });
  const items: MenuItem[] = existing.items.map((it) => ({
    n: it.n,
    p: remap(existing.sizes, it.p),
  }));
  for (const it of parsed.items) {
    const np = remap(parsed.sizes, it.p);
    const hit = items.find((x) => x.n === it.n);
    if (hit) hit.p = hit.p.map((v, i) => np[i] ?? v);
    else items.push({ n: it.n, p: np });
  }
  return { sizes, items, toppings: mergeToppings(existing.toppings ?? [], parsed.toppings ?? [], "append") };
}

export type RosterUnit = { name: string; members: string[] };

export function parseRoster(text: string): RosterUnit[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  const map = new Map<string, string[]>();
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line
      .split(/[,，\t、;；:：]+/)
      .map((x) => x.trim().replace(/^"|"$/g, "").trim())
      .filter(Boolean);
    if (parts.length < 1) continue;
    if (parts[0] === "單位" && (parts[1] === "姓名" || parts.length === 1)) continue;
    const [unit, ...names] = parts;
    const arr = map.get(unit) ?? [];
    for (const n of names) if (!arr.includes(n)) arr.push(n);
    map.set(unit, arr);
  }
  return Array.from(map, ([name, members]) => ({ name, members }));
}

export function mergeRoster(
  existing: RosterUnit[],
  incoming: RosterUnit[],
  mode: "merge" | "replace",
): RosterUnit[] {
  if (mode === "replace") return incoming;
  const out = existing.map((u) => ({ ...u, members: [...u.members] }));
  for (const u of incoming) {
    const hit = out.find((x) => x.name === u.name);
    if (hit) {
      for (const m of u.members) if (!hit.members.includes(m)) hit.members.push(m);
    } else out.push({ name: u.name, members: [...u.members] });
  }
  return out;
}

/** Read an uploaded text/CSV file; UTF-8 first, Big5 fallback. */
export async function readTextFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("big5").decode(buf);
  }
}

/**
 * Image -> one or more JPEG data URLs. Tall screenshots are cut into overlapping slices so the text
 * stays readable for the AI; PDF -> raw data URL.
 */
export async function fileToDataUrls(file: File): Promise<string[]> {
  if (file.type === "application/pdf") {
    if (file.size > 5_000_000) throw new Error("PDF 檔案太大(上限約 5 MB),請改用截圖");
    const url = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(new Error("讀取檔案失敗"));
      r.readAsDataURL(file);
    });
    return [url];
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("無法讀取這張圖片"));
      i.src = url;
    });
    const tall = img.height > img.width * 1.8;
    const scale = tall
      ? Math.min(1, 1800 / img.width)
      : Math.min(1, 2400 / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const full = document.createElement("canvas");
    full.width = w;
    full.height = h;
    const fctx = full.getContext("2d");
    if (!fctx) throw new Error("瀏覽器不支援圖片處理");
    fctx.fillStyle = "#fff";
    fctx.fillRect(0, 0, w, h);
    fctx.drawImage(img, 0, 0, w, h);
    if (!tall) return [full.toDataURL("image/jpeg", 0.9)];
    // slice tall image: each slice about 1.4x the width, 10% overlap, at most 8 slices
    const sliceH = Math.round(w * 1.4);
    const step = Math.round(sliceH * 0.9);
    const out: string[] = [];
    for (let y = 0; y < h && out.length < 8; y += step) {
      const sh = Math.min(sliceH, h - y);
      if (sh < w * 0.2 && out.length > 0) break;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = sh;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("瀏覽器不支援圖片處理");
      ctx.drawImage(full, 0, y, w, sh, 0, 0, w, sh);
      out.push(c.toDataURL("image/jpeg", 0.9));
      if (y + sh >= h) break;
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}