import type { Participant, Unit } from "../helpers/drinkTypes";
import { Button } from "./Button";
import styles from "./ParticipantPicker.module.css";

interface Props {
  units: Unit[];
  value: Participant[];
  onChange: (v: Participant[]) => void;
}

const key = (unit: string, name: string) => `${unit}\u0000${name}`;

/** 依單位勾選這次要參加訂購的人。 */
export function ParticipantPicker({ units, value, onChange }: Props) {
  const on = new Set(value.map((p) => key(p.unit, p.name)));
  const all: Participant[] = units.flatMap((u) => u.members.map((name) => ({ unit: u.name, name })));

  const toggle = (unit: string, name: string) => {
    const k = key(unit, name);
    onChange(on.has(k) ? value.filter((p) => key(p.unit, p.name) !== k) : [...value, { unit, name }]);
  };
  const setUnit = (u: Unit, select: boolean) => {
    const rest = value.filter((p) => p.unit !== u.name);
    onChange(select ? [...rest, ...u.members.map((name) => ({ unit: u.name, name }))] : rest);
  };

  if (all.length === 0) {
    return <p className={styles.hint}>名單裡還沒有人員,請管理者先到「名單」分頁新增。</p>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.top}>
        <span className={styles.count}>已選 {value.length} / {all.length} 人</span>
        <Button size="sm" variant="outline" onClick={() => onChange(all)}>
          全選
        </Button>
        <Button size="sm" variant="outline" onClick={() => onChange([])}>
          全不選
        </Button>
      </div>
      <div className={styles.scroll}>
        {units
          .filter((u) => u.members.length > 0)
          .map((u) => {
            const n = u.members.filter((m) => on.has(key(u.name, m))).length;
            return (
              <div key={u.id} className={styles.unit}>
                <div className={styles.unitHead}>
                  <b>{u.name}</b>
                  <span className={styles.sub}>
                    {n}/{u.members.length}
                  </span>
                  <button type="button" className={styles.link} onClick={() => setUnit(u, n < u.members.length)}>
                    {n < u.members.length ? "全選" : "全不選"}
                  </button>
                </div>
                <div className={styles.names}>
                  {u.members.map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={on.has(key(u.name, m))}
                      className={`${styles.chip} ${on.has(key(u.name, m)) ? styles.chipOn : ""}`}
                      onClick={() => toggle(u.name, m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}