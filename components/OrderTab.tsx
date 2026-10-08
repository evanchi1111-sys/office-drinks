import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, RotateCw, Search } from "lucide-react";
import { toast } from "sonner";
import type { OrderRow, SessionRow, Shop, Topping, Unit } from "../helpers/drinkTypes";
import { SUGAR_OPTIONS, ICE_OPTIONS } from "../helpers/drinkTypes";
import { useOrderAction } from "../helpers/useDrinkData";
import { favsFor, drinkLabel, pendingPeople, expectedPeople, type Fav } from "../helpers/orderLogic";
import { Button } from "./Button";
import { Input } from "./Input";
import { Chips, MultiChips } from "./Chips";
import { PendingCard } from "./PendingCard";
import { QtyStepper } from "./QtyStepper";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./Select";
import styles from "./OrderTab.module.css";

interface Props {
  session: SessionRow;
  shop: Shop | undefined;
  units: Unit[];
  allOrders: OrderRow[];
}

const WHO_KEY = "drink-who";
const MANUAL = "_manual";

function loadWho(): { unit: string; name: string } {
  try {
    const raw = localStorage.getItem(WHO_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { unit: "", name: "" };
}

export function OrderTab({ session, shop, units, allOrders }: Props) {
  const act = useOrderAction();
  const [unit, setUnit] = useState<string>(() => loadWho().unit);
  const [name, setName] = useState<string>(() => loadWho().name);
  const [item, setItem] = useState("");
  const [size, setSize] = useState("");
  const [sugar, setSugar] = useState<string>("正常糖");
  const [ice, setIce] = useState<string>("正常冰");
  const [tops, setTops] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);
  const [favQty, setFavQty] = useState(1);
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const open = session.status === "open";
  const restricted = !!session.participants;

  // 名單:有指定成員就只列指定的人
  const expected = useMemo(() => expectedPeople(session, units), [session, units]);
  const selectableUnits = useMemo(
    () => units.filter((u) => expected.some((p) => p.unit === u.name)),
    [units, expected],
  );
  const unitObj = selectableUnits.find((u) => u.name === unit);
  const memberList = unitObj ? expected.filter((p) => p.unit === unitObj.name).map((p) => p.name) : [];
  const manualName = unit === MANUAL || !unitObj;

  useEffect(() => {
    try {
      localStorage.setItem(WHO_KEY, JSON.stringify({ unit, name }));
    } catch {
      /* ignore */
    }
  }, [unit, name]);

  const sessionOrders = useMemo(
    () => allOrders.filter((o) => o.sessionId === session.id),
    [allOrders, session.id],
  );
  const pending = useMemo(() => pendingPeople(sessionOrders, units, session), [sessionOrders, units, session]);
  const mine = name ? sessionOrders.filter((o) => o.name === name) : [];
  const favs = useMemo(() => favsFor(name, allOrders, shop), [name, allOrders, shop]);

  const itemObj = shop?.items.find((i) => i.n === item);
  const sizeIdx = shop ? shop.sizes.indexOf(size) : -1;
  const base = itemObj && sizeIdx >= 0 ? itemObj.p[sizeIdx] : null;
  const chosenTops: Topping[] = shop ? shop.toppings.filter((t) => tops.includes(t.n)) : [];
  const price = base != null ? base + chosenTops.reduce((s, t) => s + t.p, 0) : null;
  const missingSizes = shop && itemObj ? shop.sizes.filter((_, i) => itemObj.p[i] == null) : [];

  const filtered = useMemo(() => {
    if (!shop) return [];
    const k = q.trim().toLowerCase();
    return k ? shop.items.filter((i) => i.n.toLowerCase().includes(k)) : shop.items;
  }, [shop, q]);

  const pickItem = (n: string) => {
    setItem(n);
    const it = shop?.items.find((i) => i.n === n);
    const first = shop && it ? shop.sizes.find((_, i) => it.p[i] != null) : undefined;
    setSize(first ?? "");
  };

  const resetForm = () => {
    setItem("");
    setSize("");
    setNote("");
    setTops([]);
    setQty(1);
    setEditId(null);
  };

  const fields = (o: {
    item: string;
    size: string;
    price: number | null;
    toppings: Topping[];
    sugar: string;
    ice: string;
    note: string;
  }) => ({
    unit: manualName ? "" : unit,
    name: name.trim(),
    ...o,
  });

  const submit = async () => {
    if (!name.trim()) return toast.error("請先選擇或輸入你的姓名");
    if (!item) return toast.error("請選一杯飲料");
    if (!size || price == null) return toast.error("這個規格沒有販售,請換一個規格");
    const f = fields({ item, size, price, toppings: chosenTops, sugar, ice, note: note.trim() });
    if (editId) {
      await act.mutateAsync({ action: "update", id: editId, order: f });
      toast.success("已更新訂單");
    } else {
      await act.mutateAsync({ action: "add", sessionId: session.id, orders: Array.from({ length: qty }, () => f) });
      toast.success(`已加入 ${qty} 杯:${drinkLabel(f)}`);
    }
    resetForm();
  };

  const reorder = async (f: Fav) => {
    if (!name.trim()) return toast.error("請先選擇你的姓名");
    await act.mutateAsync({
      action: "add",
      sessionId: session.id,
      orders: Array.from({ length: favQty }, () =>
        fields({ item: f.item, size: f.size, price: f.price, toppings: f.toppings, sugar: f.sugar, ice: f.ice, note: f.note }),
      ),
    });
    toast.success(`已再訂 ${favQty} 杯:${drinkLabel(f)}`);
  };

  const loadOrder = (o: { item: string; size: string; sugar: string; ice: string; note: string; toppings: Topping[] }) => {
    setItem(o.item);
    setSize(o.size);
    setSugar(o.sugar);
    setIce(o.ice);
    setNote(o.note);
    setTops(o.toppings.map((t) => t.n).filter((n) => shop?.toppings.some((t) => t.n === n)));
  };

  const loadFav = (f: Fav) => {
    loadOrder(f);
    setEditId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEdit = (o: OrderRow) => {
    loadOrder(o);
    setEditId(o.id);
  };

  const pickPerson = (u: string, n: string) => {
    setUnit(u);
    setName(n);
    toast.success(`已切換為 ${n}`);
  };

  if (!shop) {
    return <p className={styles.empty}>這個團的飲料店已被刪除,請管理者重新開一團。</p>;
  }

  return (
    <div className={styles.wrap}>
      {!open && <div className={styles.closed}>這個團已結束訂購,只能查看。需要加點請管理者「重新開放」。</div>}

      {expected.length > 0 && <PendingCard groups={pending} onPick={open ? pickPerson : undefined} />}

      <section className={styles.card}>
        <h3 className={styles.h}>1. 你是誰?</h3>
        <div className={styles.who}>
          <Select
            value={unitObj ? unit : unit === MANUAL ? MANUAL : undefined}
            onValueChange={(v) => {
              setUnit(v);
              setName("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="選擇單位" />
            </SelectTrigger>
            <SelectContent>
              {selectableUnits.map((u) => (
                <SelectItem key={u.id} value={u.name}>
                  {u.name}
                </SelectItem>
              ))}
              <SelectItem value={MANUAL}>{restricted ? "不在名單上(手動輸入姓名)" : "其他(手動輸入姓名)"}</SelectItem>
            </SelectContent>
          </Select>
          {unitObj && unit !== MANUAL ? (
            <Select value={memberList.includes(name) ? name : undefined} onValueChange={setName}>
              <SelectTrigger>
                <SelectValue placeholder="選擇姓名" />
              </SelectTrigger>
              <SelectContent>
                {memberList.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                    {sessionOrders.some((o) => o.name === m) ? "(已訂)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder="輸入你的姓名" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          )}
        </div>
      </section>

      {favs.length > 0 && open && (
        <section className={styles.card}>
          <h3 className={styles.h}>
            常點的(一鍵再訂)
            <QtyStepper value={favQty} onChange={setFavQty} label="再訂杯數" />
          </h3>
          <ul className={styles.favs}>
            {favs.map((f) => (
              <li key={[f.item, f.size, f.sugar, f.ice, f.note, f.toppings.map((t) => t.n).join("+")].join("|")} className={styles.fav}>
                <button type="button" className={styles.favText} onClick={() => loadFav(f)} title="帶入下方表單修改">
                  <span className={styles.favName}>{drinkLabel(f)}</span>
                  <span className={styles.favMeta}>${f.price}・點過 {f.count} 次</span>
                </button>
                <Button size="sm" onClick={() => void reorder(f)} disabled={act.isPending}>
                  <RotateCw size={14} /> 再訂{favQty > 1 ? ` ${favQty} 杯` : "一杯"}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.card}>
        <h3 className={styles.h}>
          2. 選飲料{editId ? "(修改中)" : ""}
          <span className={styles.shop}>
            {session.shopName}
            {shop.phone && (
              <>
                ・<a href={`tel:${shop.phone.replace(/[^\d+#*]/g, "")}`} className={styles.tel}>{shop.phone}</a>
              </>
            )}
          </span>
        </h3>
        <div className={styles.search}>
          <Search size={16} />
          <Input placeholder="搜尋品名" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ul className={styles.menu}>
          {filtered.map((i) => (
            <li key={i.n}>
              <button
                type="button"
                className={`${styles.menuItem} ${item === i.n ? styles.menuOn : ""}`}
                onClick={() => pickItem(i.n)}
              >
                <span>{i.n}</span>
                <span className={styles.prices}>
                  {shop.sizes.map((s, idx) => (i.p[idx] != null ? `${s} $${i.p[idx]}` : null)).filter(Boolean).join(" / ")}
                </span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className={styles.empty}>找不到符合的飲料</li>}
        </ul>

        {item && (
          <div className={styles.opts}>
            <div className={styles.picked}>已選:{item}</div>
            <label className={styles.label}>規格</label>
            <Chips options={shop.sizes} value={size} onChange={setSize} disabledOptions={missingSizes} />
            <label className={styles.label}>甜度</label>
            <Chips options={[...SUGAR_OPTIONS]} value={sugar} onChange={setSugar} />
            <label className={styles.label}>冰量</label>
            <Chips options={[...ICE_OPTIONS]} value={ice} onChange={setIce} />
            {shop.toppings.length > 0 && (
              <>
                <label className={styles.label}>加料(可多選)</label>
                <MultiChips
                  options={shop.toppings.map((t) => ({ value: t.n, label: t.p > 0 ? `${t.n} +$${t.p}` : t.n }))}
                  selected={tops}
                  onChange={setTops}
                />
              </>
            )}
            <label className={styles.label}>備註(選填)</label>
            <Input placeholder="例如:不要吸管" value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} />
            <div className={styles.submitRow}>
              <div className={styles.price}>
                {price != null ? `$${price * (editId ? 1 : qty)}` : "—"}
                {!editId && qty > 1 && price != null && <small className={styles.each}> ${price} × {qty}</small>}
              </div>
              {!editId && <QtyStepper value={qty} onChange={setQty} />}
              {editId && (
                <Button variant="outline" onClick={resetForm}>
                  取消修改
                </Button>
              )}
              <Button size="lg" onClick={() => void submit()} disabled={!open || act.isPending}>
                {editId ? "儲存修改" : qty > 1 ? `加入 ${qty} 杯` : "加入訂單"}
              </Button>
            </div>
          </div>
        )}
      </section>

      {name && (
        <section className={styles.card}>
          <h3 className={styles.h}>
            {name} 在這團的訂單({mine.length} 杯)
          </h3>
          {mine.length === 0 ? (
            <p className={styles.empty}>還沒有訂單</p>
          ) : (
            <ul className={styles.mine}>
              {mine.map((o) => (
                <li key={o.id} className={styles.mineRow}>
                  <span className={styles.mineText}>
                    {drinkLabel(o)}
                    <b className={styles.mp}> {o.price != null ? `$${o.price}` : ""}</b>
                  </span>
                  {open && (
                    <>
                      <Button size="icon-sm" variant="ghost" onClick={() => startEdit(o)} aria-label="修改">
                        <Pencil size={16} />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="刪除"
                        onClick={() => act.mutate({ action: "delete", id: o.id })}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}