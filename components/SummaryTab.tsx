import { useMemo } from "react";
import { Copy, Printer, FileDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { OrderRow, SessionRow, Shop, Unit } from "../helpers/drinkTypes";
import { aggregate, aggKey, groupByUnit, pendingPeople, totalOf, drinkLabel, summaryText, detailText, sheetHTML } from "../helpers/orderLogic";
import { copyText } from "../helpers/clipboard";
import { useOrderAction } from "../helpers/useDrinkData";
import { Button } from "./Button";
import { PendingCard } from "./PendingCard";
import styles from "./SummaryTab.module.css";

interface Props {
  session: SessionRow;
  shop?: Shop;
  units: Unit[];
  allOrders: OrderRow[];
}

export function SummaryTab({ session, shop, units, allOrders }: Props) {
  const act = useOrderAction();
  const orders = useMemo(() => allOrders.filter((o) => o.sessionId === session.id), [allOrders, session.id]);
  const agg = useMemo(() => aggregate(orders), [orders]);
  const groups = useMemo(() => groupByUnit(orders, units, session), [orders, units, session]);
  const pending = useMemo(() => pendingPeople(orders, units, session), [orders, units, session]);
  const open = session.status === "open";

  const makeBlobUrl = () => URL.createObjectURL(new Blob([sheetHTML(session, orders, units, shop?.phone)], { type: "text/html;charset=utf-8" }));

  const openSheet = () => {
    if (orders.length === 0) return toast.error("還沒有訂單");
    const url = makeBlobUrl();
    const w = window.open(url, "_blank");
    if (!w) toast.error("瀏覽器擋住了新視窗,請改按「下載分發單」");
  };
  const downloadSheet = () => {
    if (orders.length === 0) return toast.error("還沒有訂單");
    const a = document.createElement("a");
    a.href = makeBlobUrl();
    a.download = `${session.title}-分發單.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (orders.length === 0) {
    return (
      <div className={styles.wrap}>
        <p className={styles.empty}>這團還沒有人訂飲料。</p>
        {pending.length > 0 && <PendingCard groups={pending} />}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <div className={styles.head}>
          <h3 className={styles.h}>品項彙總</h3>
          <div className={styles.total}>
            {orders.length} 杯・${totalOf(orders)}
          </div>
        </div>
        <ul className={styles.agg}>
          {agg.map((r) => (
            <li key={aggKey(r)} className={styles.aggRow}>
              <span className={styles.aggName}>{drinkLabel(r)}</span>
              <span className={styles.aggCount}>× {r.count}</span>
              <span className={styles.aggTotal}>${r.total}</span>
            </li>
          ))}
        </ul>
        <div className={styles.btns}>
          <Button variant="outline" size="sm" onClick={() => void copyText(summaryText(session, orders, shop?.phone), "彙總已複製,可貼給店家")}>
            <Copy size={14} /> 複製彙總(給店家)
          </Button>
          <Button variant="outline" size="sm" onClick={() => void copyText(detailText(orders, units), "明細已複製,可貼到 Excel")}>
            <Copy size={14} /> 複製明細(Excel)
          </Button>
          <Button size="sm" onClick={openSheet}>
            <Printer size={14} /> 列印分發單
          </Button>
          <Button variant="outline" size="sm" onClick={downloadSheet}>
            <FileDown size={14} /> 下載分發單
          </Button>
        </div>
      </section>

      {pending.length > 0 && <PendingCard groups={pending} />}

      {groups.filter((g) => g.orders.length > 0).map((g) => (
        <section key={g.unit} className={styles.card}>
          <div className={styles.head}>
            <h3 className={styles.h}>{g.unit}</h3>
            <div className={styles.sub}>
              {g.orders.length} 杯・${totalOf(g.orders)}
            </div>
          </div>
          <ul className={styles.agg}>
            {g.orders.map((o) => (
              <li key={o.id} className={styles.aggRow}>
                <span className={styles.who}>{o.name}</span>
                <span className={styles.aggName}>{drinkLabel(o)}</span>
                <span className={styles.aggTotal}>{o.price != null ? `$${o.price}` : ""}</span>
                {open && (
                  <Button size="icon-sm" variant="ghost" aria-label="刪除" onClick={() => act.mutate({ action: "delete", id: o.id })}>
                    <Trash2 size={15} />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}