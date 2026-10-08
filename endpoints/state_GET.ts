import { db } from "../helpers/db";
import { ok, fail, errMessage } from "../helpers/endpointUtils";
import { parseItems, parseStrings, parseToppings, parseParticipants } from "../helpers/drinkTypes";
import type { OutputType } from "./state_GET.schema";

export async function handle(_request: Request) {
  try {
    const [shops, units, sessions, orders] = await Promise.all([
      db.selectFrom("shops").selectAll().orderBy("createdAt", "asc").execute(),
      db.selectFrom("units").selectAll().orderBy("ord", "asc").execute(),
      db.selectFrom("sessions").selectAll().orderBy("createdAt", "desc").limit(100).execute(),
      db.selectFrom("orders").selectAll().orderBy("createdAt", "asc").limit(10000).execute(),
    ]);
    return ok({
      shops: shops.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        sizes: parseStrings(s.sizes),
        items: parseItems(s.items),
        toppings: parseToppings(s.toppings),
      })),
      units: units.map((u) => ({
        id: u.id,
        name: u.name,
        members: parseStrings(u.members),
        ord: u.ord,
      })),
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        shopId: s.shopId,
        shopName: s.shopName,
        status: s.status,
        participants: parseParticipants(s.participants),
        createdAt: s.createdAt as Date,
      })),
      orders: orders.map((o) => ({
        id: o.id,
        sessionId: o.sessionId,
        unit: o.unit,
        name: o.name,
        item: o.item,
        size: o.size,
        price: o.price,
        toppings: parseToppings(o.toppings),
        sugar: o.sugar,
        ice: o.ice,
        note: o.note,
        createdAt: o.createdAt as Date,
      })),
    } satisfies OutputType);
  } catch (e) {
    return fail(errMessage(e), 500);
  }
}