import superjson from "superjson";
import { flootAi, FlootAiOutOfCreditsError } from "@floot/ai";
import { schema, OutputType } from "./recognize_POST.schema";
import { ok, fail, errMessage, assertAdmin } from "../../helpers/endpointUtils";

const PROMPT = `你是專業的飲料店菜單輸入員。這是台灣一家飲料店的菜單(可能是照片、螢幕截圖或 PDF,可能傾斜、反光、字小、多欄排版)。請仔細讀出「所有」飲料品項與價格,以及「加料」清單。

輸出規則:
1. sizes:菜單上的規格/價格欄位名稱,依由左到右(或由上到下)順序,例如 ["中杯","大杯"]、["M","L"]、["冷","熱"]、["小杯","中杯","大杯"]。若每個品項只有一個價格,用 ["中杯"]。
2. items:每個飲料一筆 {"n":品名,"p":[各規格價格]}。p 的長度必須等於 sizes 的長度,順序一致;該規格沒有販售或看不到價格就填 null。價格是新台幣整數(去掉 $、元、NT)。
3. 品名只放飲料名稱,不要放價格、熱量、備註;分類標題(例如「找好茶」「鮮奶茶類」)不是品項。同一個品項不要重複。
4. toppings:菜單上「加料」「配料」「加購」區塊的項目 {"n":名稱,"p":加價金額};免費或沒寫價格填 0。沒有加料區塊就回傳空陣列。
5. 若菜單分成多欄或多區,每一欄都要讀完,不要只讀第一欄。看不清楚的品項請略過,不要猜測或編造。
只輸出符合格式的 JSON。`;

const JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sizes", "items", "toppings"],
  properties: {
    sizes: { type: "array", items: { type: "string" } },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["n", "p"],
        properties: {
          n: { type: "string" },
          p: { type: "array", items: { type: ["integer", "null"] } },
        },
      },
    },
    toppings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["n", "p"],
        properties: { n: { type: "string" }, p: { type: "integer" } },
      },
    },
  },
};

function toPrice(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return Math.max(0, Math.round(v));
  if (typeof v === "string") {
    const m = v.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
    return m ? Math.round(parseFloat(m[0])) : null;
  }
  return null;
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no json");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalize(raw: any): OutputType | null {
  if (!raw || typeof raw !== "object") return null;
  let sizes: string[] = Array.isArray(raw.sizes)
    ? raw.sizes.map((s: unknown) => String(s ?? "").trim().slice(0, 20)).filter(Boolean)
    : [];
  sizes = Array.from(new Set(sizes)).slice(0, 8);
  if (sizes.length === 0) sizes = ["中杯"];
  const seen = new Set<string>();
  const items: OutputType["items"] = [];
  for (const it of Array.isArray(raw.items) ? raw.items : []) {
    const n = String(it?.n ?? "").trim().slice(0, 100);
    if (!n || seen.has(n)) continue;
    const src: unknown[] = Array.isArray(it?.p) ? it.p : it?.p != null ? [it.p] : [];
    const p = sizes.map((_, i) => toPrice(src[i]));
    if (p.every((x) => x == null)) continue;
    seen.add(n);
    items.push({ n, p });
    if (items.length >= 500) break;
  }
  const tseen = new Set<string>();
  const toppings: OutputType["toppings"] = [];
  for (const t of Array.isArray(raw.toppings) ? raw.toppings : []) {
    const n = String(t?.n ?? "").trim().slice(0, 40);
    if (!n || tseen.has(n)) continue;
    tseen.add(n);
    toppings.push({ n, p: Math.min(1000, toPrice(t?.p) ?? 0) });
    if (toppings.length >= 60) break;
  }
  return { sizes, items, toppings };
}

async function callModel(filePart: Record<string, unknown>, structured: boolean) {
  const r = await flootAi.chat({
    model: "gpt-6-sol",
    reasoning: { effort: "low" },
    ...(structured
      ? { text: { format: { type: "json_schema", name: "menu", strict: true, schema: JSON_SCHEMA } } }
      : {}),
    input: [
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: PROMPT }, filePart],
      },
    ],
  } as any);
  return String((r as any).output_text ?? "");
}

export async function handle(request: Request) {
  try {
    const input = schema.parse(superjson.parse(await request.text()));
    assertAdmin(input.password);
    const isPdf = input.dataUrl.startsWith("data:application/pdf");
    const filePart: Record<string, unknown> = isPdf
      ? { type: "input_file", file_data: input.dataUrl, filename: "menu.pdf" }
      : { type: "input_image", image_url: input.dataUrl, detail: "high" };

    let text = "";
    try {
      text = await callModel(filePart, true);
    } catch (e) {
      if (e instanceof FlootAiOutOfCreditsError) throw e;
      console.error("recognize: structured call failed, retrying plain:", errMessage(e));
      text = await callModel(filePart, false);
    }

    let result: OutputType | null = null;
    try {
      result = normalize(extractJson(text));
    } catch (e) {
      console.error("recognize: parse failed:", errMessage(e), "output:", text.slice(0, 600));
    }
    if (!result || result.items.length === 0) {
      console.error("recognize: no items. output:", text.slice(0, 600));
      return fail("AI 沒有讀到品項。請試試:拍正面、光線充足、字要清楚;長菜單請分段截圖(可一次選多張)", 422);
    }
    return ok(result);
  } catch (e) {
    if (e instanceof FlootAiOutOfCreditsError) {
      return fail("AI 辨識功能暫時無法使用,請聯絡網站擁有者", 503, "OUT_OF_CREDITS");
    }
    console.error("recognize: error:", errMessage(e));
    return fail(errMessage(e), 400);
  }
}