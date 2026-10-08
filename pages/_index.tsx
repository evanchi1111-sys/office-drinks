import { useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";
import { CupSoda, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { useAppState } from "../helpers/useDrinkData";
import { useAdminPassword, setAdminPassword } from "../helpers/adminStore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/Tabs";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { SessionBar } from "../components/SessionBar";
import { OrderTab } from "../components/OrderTab";
import { SummaryTab } from "../components/SummaryTab";
import { MenuAdmin } from "../components/MenuAdmin";
import { RosterAdmin } from "../components/RosterAdmin";
import { AdminGate } from "../components/AdminGate";
import styles from "./_index.module.css";

export default function IndexPage() {
  const { data, isLoading, error } = useAppState();
  const pw = useAdminPassword();
  const [params, setParams] = useSearchParams();
  const [gate, setGate] = useState(false);
  const [tab, setTab] = useState("order");

  const sessions = data?.sessions ?? [];
  const wanted = params.get("g");
  const current = useMemo(() => {
    if (!sessions.length) return undefined;
    return sessions.find((s) => s.id === wanted) ?? sessions.find((s) => s.status === "open") ?? sessions[0];
  }, [sessions, wanted]);

  useEffect(() => {
    if (current && wanted !== current.id && sessions.length) {
      setParams({ g: current.id }, { replace: true });
    }
  }, [current, wanted, sessions.length, setParams]);

  const shop = data?.shops.find((s) => s.id === current?.shopId);
  const locked = (
    <div className={styles.lock}>
      <Lock size={28} />
      <p>這個頁面需要管理者密碼。</p>
      <Button onClick={() => setGate(true)}>管理者登入</Button>
    </div>
  );

  return (
    <div className={styles.page}>
      <Helmet>
        <title>辦公室飲料訂購</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Helmet>
      <header className={styles.header}>
        <div className={styles.brand}>
          <CupSoda size={26} />
          <h1>辦公室飲料訂購</h1>
        </div>
        {pw ? (
          <Button size="sm" variant="ghost" onClick={() => setAdminPassword(null)}>
            <Unlock size={15} /> 管理者(登出)
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setGate(true)}>
            <Lock size={15} /> 管理者
          </Button>
        )}
      </header>

      {isLoading && <Skeleton style={{ height: "10rem" }} />}
      {error && <p className={styles.err}>讀取失敗:{(error as Error).message}</p>}

      {data && (
        <>
          <SessionBar
            sessions={sessions}
            shops={data.shops}
            units={data.units}
            current={current}
            onSelect={(id) => (id ? setParams({ g: id }) : setParams({}))}
          />
          <Tabs value={tab} onValueChange={setTab} className={styles.tabs}>
            <TabsList>
              <TabsTrigger value="order">訂購</TabsTrigger>
              <TabsTrigger value="summary">彙總</TabsTrigger>
              <TabsTrigger value="menu">菜單</TabsTrigger>
              <TabsTrigger value="roster">名單</TabsTrigger>
            </TabsList>
            <TabsContent value="order" className={styles.pane}>
              {current ? (
                <OrderTab session={current} shop={shop} units={data.units} allOrders={data.orders} />
              ) : (
                <p className={styles.empty}>還沒有任何團。按上方「開新團」開始吧!</p>
              )}
            </TabsContent>
            <TabsContent value="summary" className={styles.pane}>
              {current ? (
                <SummaryTab session={current} shop={shop} units={data.units} allOrders={data.orders} />
              ) : (
                <p className={styles.empty}>還沒有任何團。</p>
              )}
            </TabsContent>
            <TabsContent value="menu" className={styles.pane}>
              {pw ? <MenuAdmin shops={data.shops} /> : locked}
            </TabsContent>
            <TabsContent value="roster" className={styles.pane}>
              {pw ? <RosterAdmin units={data.units} /> : locked}
            </TabsContent>
          </Tabs>
        </>
      )}
      <AdminGate open={gate} onOpenChange={setGate} />
    </div>
  );
}