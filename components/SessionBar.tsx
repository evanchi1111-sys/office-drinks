import { useState } from "react";
import { Plus, Link2, Users } from "lucide-react";
import { toast } from "sonner";
import type { Participant, SessionRow, Shop, Unit } from "../helpers/drinkTypes";
import { useSessionAction } from "../helpers/useDrinkData";
import { copyText } from "../helpers/clipboard";
import { Button } from "./Button";
import { Input } from "./Input";
import { Badge } from "./Badge";
import { Chips } from "./Chips";
import { ConfirmButton } from "./ConfirmButton";
import { ParticipantPicker } from "./ParticipantPicker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./Select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./Dialog";
import styles from "./SessionBar.module.css";

interface Props {
  sessions: SessionRow[];
  shops: Shop[];
  units: Unit[];
  current: SessionRow | undefined;
  onSelect: (id: string | undefined) => void;
}

const ALL = "名單上所有人";
const PICK = "指定這次的成員";

function defaultTitle() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()} 飲料團`;
}

const allPeople = (units: Unit[]): Participant[] =>
  units.flatMap((u) => u.members.map((name) => ({ unit: u.name, name })));

export function SessionBar({ sessions, shops, units, current, onSelect }: Props) {
  const act = useSessionAction();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle());
  const [shopId, setShopId] = useState<string | undefined>(undefined);
  const [who, setWho] = useState<string>(ALL);
  const [picked, setPicked] = useState<Participant[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editPicked, setEditPicked] = useState<Participant[]>([]);

  const create = async () => {
    if (!shopId) return toast.error("請先選一家飲料店");
    if (!title.trim()) return toast.error("請輸入團名");
    if (who === PICK && picked.length === 0) return toast.error("請至少勾選一位成員,或改選「名單上所有人」");
    const r = await act.mutateAsync({
      action: "create",
      title: title.trim(),
      shopId,
      participants: who === PICK ? picked : null,
    });
    onSelect(r.id);
    setOpen(false);
    toast.success("已開團,可以分享連結給同事了");
  };

  const saveParticipants = async (value: Participant[] | null) => {
    if (!current) return;
    await act.mutateAsync({ action: "setParticipants", id: current.id, participants: value });
    setEditOpen(false);
    toast.success("成員已更新");
  };

  const share = () => {
    if (!current) return;
    const url = `${window.location.origin}/?g=${current.id}`;
    void copyText(url, "連結已複製,貼到 LINE 就可以了");
  };

  return (
    <div className={styles.bar}>
      <div className={styles.pick}>
        <Select value={current?.id} onValueChange={(v) => onSelect(v)}>
          <SelectTrigger>
            <SelectValue placeholder={sessions.length ? "選擇要參加的團" : "還沒有任何團"} />
          </SelectTrigger>
          <SelectContent>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.title}・{s.shopName}
                {s.status === "closed" ? "(已結束)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="md"
          onClick={() => {
            setTitle(defaultTitle());
            setShopId(shops[0]?.id);
            setWho(ALL);
            setPicked(allPeople(units));
            setOpen(true);
          }}
        >
          <Plus size={16} /> 開新團
        </Button>
      </div>
      {current && (
        <div className={styles.actions}>
          <Badge variant={current.status === "open" ? "success" : "secondary"}>
            {current.status === "open" ? "訂購中" : "已結束"}
          </Badge>
          <Button size="sm" variant="outline" onClick={share}>
            <Link2 size={14} /> 複製分享連結
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditPicked(current.participants ?? allPeople(units));
              setEditOpen(true);
            }}
          >
            <Users size={14} /> 參加成員{current.participants ? `(${current.participants.length} 人)` : "(全部)"}
          </Button>
          {current.status === "open" ? (
            <Button size="sm" variant="outline" onClick={() => act.mutate({ action: "close", id: current.id })}>
              結束訂購
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => act.mutate({ action: "reopen", id: current.id })}>
              重新開放
            </Button>
          )}
          <ConfirmButton
            confirmLabel="再按一次刪除整團"
            onConfirm={() => {
              act.mutate({ action: "delete", id: current.id });
              onSelect(undefined);
            }}
          >
            刪除整團
          </ConfirmButton>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>開新團</DialogTitle>
            <DialogDescription>選一家飲料店和這次參加的人,同事就能用連結點餐。</DialogDescription>
          </DialogHeader>
          <div className={styles.form}>
            <label className={styles.label}>團名</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
            <label className={styles.label}>飲料店</label>
            {shops.length === 0 ? (
              <p className={styles.hint}>還沒有飲料店,請管理者先到「菜單」分頁新增店家。</p>
            ) : (
              <Select value={shopId} onValueChange={setShopId}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇飲料店" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <label className={styles.label}>這次要訂的人</label>
            <Chips options={[ALL, PICK]} value={who} onChange={setWho} />
            {who === PICK && <ParticipantPicker units={units} value={picked} onChange={setPicked} />}
            <p className={styles.hint}>
              開團後,「訂購」和「彙總」會顯示這些人誰還沒選購飲料。
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => void create()} disabled={act.isPending || shops.length === 0}>
              開團
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>調整參加成員</DialogTitle>
            <DialogDescription>勾選這個團要訂的人。已經訂的人不會因為取消勾選而被刪除訂單。</DialogDescription>
          </DialogHeader>
          <ParticipantPicker units={units} value={editPicked} onChange={setEditPicked} />
          <DialogFooter>
            <Button variant="outline" onClick={() => void saveParticipants(null)} disabled={act.isPending}>
              改回「名單上所有人」
            </Button>
            <Button
              onClick={() => {
                if (editPicked.length === 0) return toast.error("請至少勾選一位成員");
                void saveParticipants(editPicked);
              }}
              disabled={act.isPending}
            >
              儲存成員
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}