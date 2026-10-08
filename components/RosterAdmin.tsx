import { useEffect, useRef, useState } from "react";
import { Plus, Upload, Save, X } from "lucide-react";
import { toast } from "sonner";
import type { Unit } from "../helpers/drinkTypes";
import { useSaveRoster } from "../helpers/useDrinkData";
import { getAdminPassword } from "../helpers/adminStore";
import { mergeRoster, type RosterUnit } from "../helpers/menuParse";
import { Button } from "./Button";
import { Input } from "./Input";
import { ConfirmButton } from "./ConfirmButton";
import { ImportRosterDialog } from "./ImportRosterDialog";
import styles from "./RosterAdmin.module.css";

type DUnit = { key: string; id?: string; name: string; members: string[] };

let seq = 0;
const nk = () => `n${++seq}`;
const fromUnits = (u: Unit[]): DUnit[] => u.map((x) => ({ key: x.id, id: x.id, name: x.name, members: [...x.members] }));

export function RosterAdmin({ units }: { units: Unit[] }) {
  const save = useSaveRoster();
  const [draft, setDraft] = useState<DUnit[]>(() => fromUnits(units));
  const [dirty, setDirty] = useState(false);
  const [newUnit, setNewUnit] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!dirtyRef.current) setDraft(fromUnits(units));
  }, [units]);

  const edit = (fn: (d: DUnit[]) => DUnit[]) => {
    setDraft(fn);
    setDirty(true);
  };

  const addUnit = () => {
    const n = newUnit.trim();
    if (!n) return;
    if (draft.some((u) => u.name === n)) return toast.error("已經有同名的單位");
    edit((d) => [...d, { key: nk(), name: n, members: [] }]);
    setNewUnit("");
  };

  const addMembers = (key: string, raw: string) => {
    const names = raw.split(/[,，、\s]+/).map((x) => x.trim()).filter(Boolean);
    if (names.length === 0) return;
    edit((d) => d.map((u) => (u.key === key ? { ...u, members: Array.from(new Set([...u.members, ...names])) } : u)));
  };

  const onImport = (incoming: RosterUnit[], mode: "merge" | "replace") => {
    const current: RosterUnit[] = draft.map((u) => ({ name: u.name, members: u.members }));
    const merged = mergeRoster(current, incoming, mode);
    edit(() =>
      merged.map((m) => {
        const old = draft.find((u) => u.name === m.name);
        return { key: old?.key ?? nk(), id: old?.id, name: m.name, members: m.members };
      }),
    );
  };

  const doSave = async () => {
    const pw = getAdminPassword();
    if (!pw) return toast.error("管理者登入已失效,請重新登入");
    if (draft.some((u) => !u.name.trim())) return toast.error("單位名稱不能空白");
    const names = draft.map((u) => u.name.trim());
    if (new Set(names).size !== names.length) return toast.error("單位名稱不能重複");
    await save.mutateAsync({
      password: pw,
      units: draft.map((u) => ({ id: u.id, name: u.name.trim(), members: u.members })),
    });
    setDirty(false);
    toast.success("名單已儲存");
  };

  const people = draft.reduce((s, u) => s + u.members.length, 0);

  return (
    <div className={styles.wrap}>
      <section className={styles.card}>
        <div className={styles.head}>
          <h3 className={styles.h}>
            單位與姓名({draft.length} 單位・{people} 人)
          </h3>
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload size={14} /> 批次匯入
          </Button>
        </div>
        <div className={styles.addRow}>
          <Input
            placeholder="新增單位名稱"
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) addUnit();
            }}
          />
          <Button onClick={addUnit} disabled={!newUnit.trim()}>
            <Plus size={16} /> 新增
          </Button>
        </div>
      </section>

      {draft.map((u) => (
        <UnitCard
          key={u.key}
          unit={u}
          onRename={(name) => edit((d) => d.map((x) => (x.key === u.key ? { ...x, name } : x)))}
          onAdd={(raw) => addMembers(u.key, raw)}
          onRemoveMember={(m) =>
            edit((d) => d.map((x) => (x.key === u.key ? { ...x, members: x.members.filter((y) => y !== m) } : x)))
          }
          onDelete={() => edit((d) => d.filter((x) => x.key !== u.key))}
        />
      ))}

      <div className={styles.saveBar}>
        <span className={styles.note}>{dirty ? "有尚未儲存的修改" : "名單已是最新"}</span>
        <Button size="lg" onClick={() => void doSave()} disabled={!dirty || save.isPending}>
          <Save size={16} /> 儲存名單
        </Button>
      </div>

      <ImportRosterDialog open={importOpen} onOpenChange={setImportOpen} onApply={onImport} />
    </div>
  );
}

function UnitCard({
  unit,
  onRename,
  onAdd,
  onRemoveMember,
  onDelete,
}: {
  unit: DUnit;
  onRename: (n: string) => void;
  onAdd: (raw: string) => void;
  onRemoveMember: (m: string) => void;
  onDelete: () => void;
}) {
  const [val, setVal] = useState("");
  const commit = () => {
    onAdd(val);
    setVal("");
  };
  return (
    <section className={styles.card}>
      <div className={styles.unitHead}>
        <Input value={unit.name} onChange={(e) => onRename(e.target.value)} maxLength={60} className={styles.unitName} />
        <ConfirmButton confirmLabel="確認刪除單位" onConfirm={onDelete}>
          刪除單位
        </ConfirmButton>
      </div>
      <div className={styles.members}>
        {unit.members.map((m) => (
          <span key={m} className={styles.member}>
            {m}
            <button type="button" aria-label={`移除 ${m}`} className={styles.x} onClick={() => onRemoveMember(m)}>
              <X size={13} />
            </button>
          </span>
        ))}
        {unit.members.length === 0 && <span className={styles.none}>還沒有人員</span>}
      </div>
      <div className={styles.addRow}>
        <Input
          placeholder="新增姓名(可一次輸入多位,用逗號或空白分隔)"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) commit();
          }}
        />
        <Button variant="outline" onClick={commit} disabled={!val.trim()}>
          加入
        </Button>
      </div>
    </section>
  );
}