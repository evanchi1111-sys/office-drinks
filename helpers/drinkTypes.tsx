import { z } from "zod";

export const SUGAR_OPTIONS = ["正常糖", "少糖", "半糖", "微糖", "無糖"] as const;
export const ICE_OPTIONS = ["正常冰", "少冰", "微冰", "去冰", "常溫", "熱"] as const;

export const menuItemSchema = z.object({
  n: z.string().trim().min(1).max(100),
  p: z.array(z.number().int().nonnegative().nullable()).max(10),
});

/** 加料:名稱 + 加價(0 = 免費) */
export const toppingSchema = z.object({
  n: z.string().trim().min(1).max(40),
  p: z.number().int().nonnegative().max(1000),
});

export const shopInputSchema = z.object({
  id: z.string().min(1).max(40).optional(),
  name: z.string().trim().min(1).max(60),
  sizes: z.array(z.string().trim().min(1).max(20)).min(1).max(8),
  items: z.array(menuItemSchema).max(500),
  toppings: z.array(toppingSchema).max(60).default([]),
  phone: z.string().trim().max(30).default(""),
});

export const unitInputSchema = z.object({
  id: z.string().min(1).max(40).optional(),
  name: z.string().trim().min(1).max(60),
  members: z.array(z.string().trim().min(1).max(40)).max(300),
});

export const participantSchema = z.object({
  unit: z.string().trim().max(60),
  name: z.string().trim().min(1).max(40),
});

export type MenuItem = z.infer<typeof menuItemSchema>;
export type Topping = z.infer<typeof toppingSchema>;
export type ShopInput = z.infer<typeof shopInputSchema>;
export type UnitInput = z.infer<typeof unitInputSchema>;
export type Participant = z.infer<typeof participantSchema>;

export type Shop = { id: string; name: string; phone: string; sizes: string[]; items: MenuItem[]; toppings: Topping[] };
export type Unit = { id: string; name: string; members: string[]; ord: number };
export type SessionRow = {
  id: string;
  title: string;
  shopId: string;
  shopName: string;
  status: "open" | "closed";
  /** null = 全部名單上的人 */
  participants: Participant[] | null;
  createdAt: Date;
};
export type OrderRow = {
  id: string;
  sessionId: string;
  unit: string;
  name: string;
  item: string;
  size: string;
  price: number | null;
  toppings: Topping[];
  sugar: string;
  ice: string;
  note: string;
  createdAt: Date;
};

export const orderFieldsSchema = z.object({
  unit: z.string().trim().max(60),
  name: z.string().trim().min(1).max(40),
  item: z.string().trim().min(1).max(100),
  size: z.string().trim().max(20),
  /** 含加料的總價 */
  price: z.number().int().nonnegative().nullable(),
  toppings: z.array(toppingSchema).max(10).default([]),
  sugar: z.string().trim().max(20),
  ice: z.string().trim().max(20),
  note: z.string().trim().max(100),
});
export type OrderFields = z.infer<typeof orderFieldsSchema>;

export type ApiError = { error: string; code?: string };

export function parseItems(raw: unknown): MenuItem[] {
  const r = z.array(menuItemSchema).safeParse(raw);
  return r.success ? r.data : [];
}
export function parseStrings(raw: unknown): string[] {
  const r = z.array(z.string()).safeParse(raw);
  return r.success ? r.data : [];
}
export function parseToppings(raw: unknown): Topping[] {
  const r = z.array(toppingSchema).safeParse(raw);
  return r.success ? r.data : [];
}
export function parseParticipants(raw: unknown): Participant[] | null {
  if (raw == null) return null;
  const r = z.array(participantSchema).safeParse(raw);
  return r.success ? r.data : null;
}

export function formatPrice(p: number | null | undefined): string {
  return p == null ? "—" : `$${p}`;
}
