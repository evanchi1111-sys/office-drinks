import type { OrderRow, Participant, SessionRow, Shop, Topping, Unit } from "./drinkTypes";

type Drinkish = {
  item: string;
  size: string;
  sugar: string;
  ice: string;
  note: string;
  toppings?: Topping[];
};

export type AggRow = Drinkish & {
  count: number;
  price: number | null;
  total: number;
};

const toppingKey = (t?: Topping[]) => (t ?? []).map((x) => x.n).sort().join("+");

export function aggregate(orders: OrderRow[]): AggRow[] {
  const map = new Map<string, AggRow>();
  for (const o of orders) {
    const k = [o.item, o.size, o.sugar, o.ice, toppingKey(o.toppings), o.note, o.price ?? ""].join("|");
    const hit = map.get(k);
    if (hit) {
      hit.count += 1;
      hit.total += o.price ?? 0;
    } else {
      map.set(k, {
        item: o.item,
        size: o.size,
        sugar: o.sugar,
        ice: o.ice,
        note: o.note,
        toppings: o.toppings,
        count: 1,
        price: o.price,
        total: o.price ?? 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.item.localeCompare(b.item, "zh-Hant"));
}

export function aggKey(r: AggRow): string {
  return [r.item, r.size, r.sugar, r.ice, toppingKey(r.toppings), r.note, r.price ?? ""].join("|");
}

export function totalOf(orders: OrderRow[]): number {
  return orders.reduce((s, o) => s + (o.price ?? 0), 0);
}

export const NO_UNIT = "(未分單位)";

/** 這個團預期要訂的人:有指定成員用指定名單,否則是整份名單。 */
export function expectedPeople(session: SessionRow | undefined, units: Unit[]): Participant[] {
  if (session?.participants) return session.participants;
  return units.flatMap((u) => u.members.map((name) => ({ unit: u.name, name })));
}

export type UnitGroup = { unit: string; orders: OrderRow[]; notYet: string[] };

export function groupByUnit(orders: OrderRow[], units: Unit[], session?: SessionRow): UnitGroup[] {
  const expected = expectedPeople(session, units);
  const done = new Set(orders.map((o) => o.name));
  const keys = new Set<string>();
  for (const o of orders) keys.add(o.unit || NO_UNIT);
  for (const p of expected) keys.add(p.unit || NO_UNIT);
  const rosterNames = units.map((u) => u.name);
  const ordered = [
    ...rosterNames.filter((n) => keys.has(n)),
    ...Array.from(keys).filter((k) => !rosterNames.includes(k)),
  ];
  return ordered.map((unit) => {
    const list = orders.filter((o) => (o.unit || NO_UNIT) === unit);
    const want = expected.filter((p) => (p.unit || NO_UNIT) === unit).map((p) => p.name);
    const notYet = Array.from(new Set(want)).filter((n) => !done.has(n));
    return { unit, orders: list, notYet };
  });
}

export function pendingPeople(orders: OrderRow[], units: Unit[], session: SessionRow): { unit: string; names: string[] }[] {
  return groupByUnit(orders, units, session)
    .filter((g) => g.notYet.length > 0)
    .map((g) => ({ unit: g.unit, names: g.notYet }));
}

export function toppingText(t?: Topping[]): string {
  return t && t.length ? ` 加${t.map((x) => x.n).join("、")}` : "";
}

export function drinkLabel(a: Drinkish) {
  return [a.item, a.size, a.sugar, a.ice].filter(Boolean).join(" ") + toppingText(a.toppings) + (a.note ? `(${a.note})` : "");
}

export function summaryText(session: SessionRow, orders: OrderRow[], phone?: string): string {
  const rows = aggregate(orders);
  const lines = rows.map((r) => `${drinkLabel(r)} × ${r.count}`);
  return [
    `【${session.title}】${session.shopName}${phone ? `(${phone})` : ""}`,
    ...lines,
    `共 ${orders.length} 杯,合計 $${totalOf(orders)}`,
  ].join("\n");
}

export function detailText(orders: OrderRow[], units: Unit[]): string {
  const head = ["單位", "姓名", "品項", "規格", "甜度", "冰量", "加料", "備註", "價格"].join("\t");
  const sorted = groupByUnit(orders, units).flatMap((g) => g.orders);
  const rows = sorted.map((o) =>
    [o.unit, o.name, o.item, o.size, o.sugar, o.ice, o.toppings.map((t) => t.n).join("、"), o.note, o.price ?? ""].join("\t"),
  );
  return [head, ...rows].join("\n");
}

export type Fav = Drinkish & { toppings: Topping[]; price: number; count: number };

export function favsFor(name: string, allOrders: OrderRow[], shop: Shop | undefined): Fav[] {
  if (!name || !shop) return [];
  const map = new Map<string, Fav>();
  for (const o of allOrders) {
    if (o.name !== name) continue;
    const it = shop.items.find((x) => x.n === o.item);
    if (!it) continue;
    const si = shop.sizes.indexOf(o.size);
    const base = si >= 0 ? it.p[si] : null;
    if (base == null) continue;
    // 加料必須這家店現在還有,價格用現在的加價
    const tops: Topping[] = [];
    let missing = false;
    for (const t of o.toppings) {
      const cur = shop.toppings.find((x) => x.n === t.n);
      if (!cur) {
        missing = true;
        break;
      }
      tops.push(cur);
    }
    if (missing) continue;
    const price = base + tops.reduce((s, t) => s + t.p, 0);
    const k = [o.item, o.size, o.sugar, o.ice, toppingKey(tops), o.note].join("|");
    const hit = map.get(k);
    if (hit) hit.count += 1;
    else map.set(k, { item: o.item, size: o.size, sugar: o.sugar, ice: o.ice, note: o.note, toppings: tops, price, count: 1 });
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 8);
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function sheetHTML(session: SessionRow, orders: OrderRow[], units: Unit[], phone?: string): string {
  const agg = aggregate(orders);
  const groups = groupByUnit(orders, units, session).filter((g) => g.orders.length > 0);
  const date = new Date(session.createdAt).toLocaleDateString("zh-TW");
  const summaryRows = agg
    .map(
      (r) =>
        `<tr><td>${esc(drinkLabel(r))}</td><td class="n">${r.count}</td><td class="n">${r.price == null ? "—" : "$" + r.price}</td><td class="n">$${r.total}</td></tr>`,
    )
    .join("");
  const page1 = `<section><h1>${esc(session.title)}</h1><p class="sub">${esc(session.shopName)}${phone ? ` ・ 電話 ${esc(phone)}` : ""} ・ ${date} ・ 品項彙總</p>
<table><thead><tr><th>品項</th><th class="n">杯數</th><th class="n">單價</th><th class="n">小計</th></tr></thead><tbody>${summaryRows}</tbody>
<tfoot><tr><td>合計</td><td class="n">${orders.length}</td><td></td><td class="n">$${totalOf(orders)}</td></tr></tfoot></table></section>`;
  const unitPages = groups
    .map((g) => {
      const rows = g.orders
        .map(
          (o) =>
            `<tr><td>${esc(o.name)}</td><td>${esc(drinkLabel(o))}</td><td class="n">${o.price == null ? "—" : "$" + o.price}</td><td class="sign"></td></tr>`,
        )
        .join("");
      return `<section><h1>${esc(g.unit)}</h1><p class="sub">${esc(session.title)} ・ ${esc(session.shopName)} ・ ${g.orders.length} 杯 ・ 小計 $${totalOf(g.orders)}</p>
<table><thead><tr><th>姓名</th><th>飲料</th><th class="n">金額</th><th class="sign">簽收</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    })
    .join("");
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(session.title)} 分發單</title>
<style>
@page{size:A4;margin:14mm}
*{box-sizing:border-box}
body{font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;color:#222;margin:0;padding:16px}
section{page-break-after:always;max-width:190mm;margin:0 auto 24px}
section:last-child{page-break-after:auto}
h1{font-size:22px;margin:0 0 4px}
.sub{margin:0 0 14px;color:#555;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{border:1px solid #888;padding:8px 10px;text-align:left}
th{background:#eee}
.n{text-align:right;white-space:nowrap}
td.sign{width:30%;height:34px}
tfoot td{font-weight:700;background:#f6f6f6}
.bar{position:sticky;top:0;background:#fff;padding:8px 0;margin-bottom:12px;border-bottom:1px solid #ddd;text-align:center}
.bar button{font-size:16px;padding:8px 20px;border-radius:8px;border:1px solid #2b6a4a;background:#2b6a4a;color:#fff}
@media print{.bar{display:none}body{padding:0}}
</style></head><body><div class="bar"><button onclick="window.print()">列印分發單</button></div>${page1}${unitPages}</body></html>`;
}
