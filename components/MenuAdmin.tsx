import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Upload, Save } from "lucide-react";
import { toast } from "sonner";
import type { MenuItem, Shop, Topping } from "../helpers/drinkTypes";
import { useSaveShop, useDeleteShop } from "../helpers/useDrinkData";
import { getAdminPassword } from "../helpers/adminStore";
import { parseToppingsText, mergeToppings, type ParsedMenu } from "../helpers/menuParse";
import { Textarea } from "./Textarea";
import { Button } from "./Button";
import { Input } from "./Input";
import { ConfirmButton } from "./ConfirmButton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./Select";
import { ImportMenuDialog } from "./ImportMenuDialog";
import styles from "./MenuAdmin.module.css";

type Draft = { name: string; phone: string; sizes: string[]; items: MenuItem[]; toppings: Topping[] };

const toDraft = (s: Shop): Draft => ({
  name: s.name,
  phone: s.phone,
  sizes: [...s.sizes],
  items: s.items.map((i) => ({ n: i.n, p: [...i.p] })),
  toppings: s.toppings.map((t) => ({ ...t })),
});

export function MenuAdmin({ shops }: { shops: Shop[] }) {
  const save = useSaveShop();
  const del = useDeleteShop();
  const [selId, setSelId] = useState<string | undefined>(shops[0]?.id);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [topPaste, setTopPaste] = useState("");

  const shop = shops.find((s) => s.id === selId);

  useEffect(() => {
    if (!selId || !shops.find((s) => s.id === selId)) setSelId(shops[0]?.id);
  }, [shops, selId]);

  useEffect(() => {
    if (shop && !dirty) setDraft(toDraft(shop));
    if (!shop) setDraft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop, selId]);

  const edit = (fn: (d: Draft) => Draft) => {
    setDraft((d) => (d ? fn(d) : d));
    setDirty(true);
  };

  const pw = () => {
    const p = getAdminPassword();
    if (!p) toast.error("管理者登入已失效,請重新登入");
    return p;
  };

  const addShop = async () => {
    const p = pw();
    if (!p || !newName.trim()) return;
    const r = await save.mutateAsync({
      password: p,
      shop: { name: newName.trim(), phone: newPhone.trim(), sizes: ["中杯", "大杯"], items: [], toppings: [] },
    });
    setNewName("");
    setNewPhone("");
    setDirty(false);
    setSelId(r.shop.id);
    toast.success("已新增店家,接著匯入菜單吧");
  };

  const saveShop = async () => {
    const p = pw();
    if (!p || !draft || !selId) return;
    if (!draft.name.trim()) return toast.error("店名不能空白");
    const items = draft.items.filter((i) => i.n.trim()).map((i) => ({ n: i.n.trim(), p: draft.sizes.map((_, k) => i.p[k] ?? null) }));
    await save.mutateAsync({
      password: p,
      shop: {
        id: selId,
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        sizes: draft.sizes.map((s) => s.trim() || "規格"),
        items,
        toppings: draft.toppings.filter((t) => t.n.trim()).map((t) => ({ n: t.n.trim(), p: t.p })),
      },
    });
    setDirty(false);
    toast.success("菜單已儲存");
  };

  const removeShop = async () => {
    const p = pw();
    if (!p || !selId) return;
    await del.mutateAsync({ password: p, id: selId });
    setDirty(false);
    setSelId(undefined);
    toast.success("已刪除店家");
  };

  const visible = useMemo(() => {
    if (!draft) return [];
    const k = filter.trim().toLowerCase();
    return draft.items.map((it, idx) => ({ it, idx })).filter(({ it }) => !k || it.n.toLowerCase().includes(k));
  }, [draft, filter]);

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <h3 className={styles.h}>飲料店</h3>
        {shops.length > 0 && (
          <Select
            value={selId}
            onValueChange={(v) => {
              if (dirty && !window.confirm("目前的修改還沒儲存,確定要切換嗎?")) return;
              setDirty(false);
              setSelId(v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="選擇店家" />
            </SelectTrigger>
            <SelectContent>
              {shops.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                  {s.phone ? `・${s.phone}` : ""}({s.items.length} 品項)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className={styles.newShop}>
          <Input
            placeholder="新增店家名稱,例如:五十嵐"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={60}
          />
          <div className={styles.addRow}>
            <Input
              type="tel"
              inputMode="tel"
              placeholder="店家電話(選填)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              maxLength={30}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) void addShop();
              }}
            />
            <Button onClick={() => void addShop()} disabled={!newName.trim() || save.isPending}>
              <Plus size={16} /> 新增
            </Button>
          </div>
        </div>
      </section>

      {draft && (
        <>
          <section className={styles.card}>
            <h3 className={styles.h}>店家設定</h3>
            <label className={styles.label}>店名</label>
            <Input value={draft.name} onChange={(e) => edit((d) => ({ ...d, name: e.target.value }))} maxLength={60} />
            <label className={styles.label}>店家電話</label>
            <Input
              type="tel"
              inputMode="tel"
              placeholder="例如:04-2635-1234"
              value={draft.phone}
              onChange={(e) => edit((d) => ({ ...d, phone: e.target.value }))}
              maxLength={30}
            />
            <label className={styles.label}>規格欄位(例如 中杯、大杯)</label>
            <div className={styles.sizes}>
              {draft.sizes.map((s, i) => (
                <div key={i} className={styles.sizeBox}>
                  <Input
                    value={s}
                    maxLength={20}
                    onChange={(e) => edit((d) => ({ ...d, sizes: d.sizes.map((x, k) => (k === i ? e.target.value : x)) }))}
                  />
                  {draft.sizes.length > 1 && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="刪除規格"
                      onClick={() =>
                        edit((d) => ({
                          ...d,
                          sizes: d.sizes.filter((_, k) => k !== i),
                          items: d.items.map((it) => ({ ...it, p: it.p.filter((_, k) => k !== i) })),
                        }))
                      }
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              ))}
              {draft.sizes.length < 8 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    edit((d) => ({
                      ...d,
                      sizes: [...d.sizes, `規格${d.sizes.length + 1}`],
                      items: d.items.map((it) => ({ ...it, p: [...it.p, null] })),
                    }))
                  }
                >
                  <Plus size={14} /> 新增規格
                </Button>
              )}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.itemsHead}>
              <h3 className={styles.h}>品項與價格({draft.items.length})</h3>
              <div className={styles.btns}>
                <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                  <Upload size={14} /> 匯入菜單
                </Button>
                <Button size="sm" variant="outline" onClick={() => edit((d) => ({ ...d, items: [{ n: "", p: d.sizes.map(() => null) }, ...d.items] }))}>
                  <Plus size={14} /> 新增品項
                </Button>
              </div>
            </div>
            {draft.items.length > 8 && <Input placeholder="搜尋品項" value={filter} onChange={(e) => setFilter(e.target.value)} />}
            {draft.items.length === 0 && <p className={styles.empty}>還沒有品項,按「匯入菜單」或「新增品項」。</p>}
            <ul className={styles.items}>
              {visible.map(({ it, idx }) => (
                <li key={idx} className={styles.item}>
                  <div className={styles.itemTop}>
                    <Input
                      placeholder="品名"
                      value={it.n}
                      onChange={(e) => edit((d) => ({ ...d, items: d.items.map((x, k) => (k === idx ? { ...x, n: e.target.value } : x)) }))}
                    />
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="刪除品項"
                      onClick={() => edit((d) => ({ ...d, items: d.items.filter((_, k) => k !== idx) }))}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div className={styles.prices}>
                    {draft.sizes.map((s, si) => (
                      <label key={si} className={styles.priceCell}>
                        <span>{s}</span>
                        <Input
                          inputMode="numeric"
                          placeholder="—"
                          value={it.p[si] ?? ""}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^\d]/g, "");
                            edit((d) => ({
                              ...d,
                              items: d.items.map((x, k) => {
                                if (k !== idx) return x;
                                const p = d.sizes.map((_, z) => x.p[z] ?? null);
                                p[si] = v === "" ? null : parseInt(v, 10);
                                return { ...x, p };
                              }),
                            }));
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.card}>
            <div className={styles.itemsHead}>
              <h3 className={styles.h}>加料({draft.toppings.length})</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => edit((d) => ({ ...d, toppings: [...d.toppings, { n: "", p: 0 }] }))}
              >
                <Plus size={14} /> 新增加料
              </Button>
            </div>
            <p className={styles.empty}>同事點餐時可多選;加價會自動算進杯價。沒有加價就填 0。</p>
            <ul className={styles.items}>
              {draft.toppings.map((t, i) => (
                <li key={i} className={styles.item}>
                  <div className={styles.itemTop}>
                    <Input
                      placeholder="加料名稱,例如:大珍珠"
                      value={t.n}
                      maxLength={40}
                      onChange={(e) => edit((d) => ({ ...d, toppings: d.toppings.map((x, k) => (k === i ? { ...x, n: e.target.value } : x)) }))}
                    />
                    <Input
                      className={styles.topPrice}
                      inputMode="numeric"
                      placeholder="加價"
                      value={t.p}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d]/g, "");
                        edit((d) => ({ ...d, toppings: d.toppings.map((x, k) => (k === i ? { ...x, p: v === "" ? 0 : Math.min(1000, parseInt(v, 10)) } : x)) }));
                      }}
                    />
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="刪除加料"
                      onClick={() => edit((d) => ({ ...d, toppings: d.toppings.filter((_, k) => k !== i) }))}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <label className={styles.label}>一次貼上多個加料(每行一個:名稱 加價)</label>
            <Textarea rows={3} placeholder={"大珍珠 10\n小珍珠 10\n椰果 10"} value={topPaste} onChange={(e) => setTopPaste(e.target.value)} />
            <div>
              <Button
                size="sm"
                variant="outline"
                disabled={!topPaste.trim()}
                onClick={() => {
                  edit((d) => ({ ...d, toppings: mergeToppings(d.toppings, parseToppingsText(topPaste), "append") }));
                  setTopPaste("");
                }}
              >
                加入這些加料
              </Button>
            </div>
          </section>

          <div className={styles.saveBar}>
            <ConfirmButton size="md" confirmLabel="再按一次刪除這家店" onConfirm={() => void removeShop()}>
              刪除這家店
            </ConfirmButton>
            <Button size="lg" onClick={() => void saveShop()} disabled={!dirty || save.isPending}>
              <Save size={16} /> {dirty ? "儲存菜單" : "已儲存"}
            </Button>
          </div>

          <ImportMenuDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            current={{ sizes: draft.sizes, items: draft.items, toppings: draft.toppings }}
            onApply={(m: ParsedMenu) =>
              edit((d) => ({ ...d, sizes: m.sizes, items: m.items, toppings: m.toppings ?? d.toppings }))
            }
          />
        </>
      )}
    </div>
  );
}