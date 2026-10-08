import { Clock } from "lucide-react";
import styles from "./PendingCard.module.css";

interface Props {
  groups: { unit: string; names: string[] }[];
  onPick?: (unit: string, name: string) => void;
}

/** 這個團「還沒選購飲料」的人,依單位列出;點名字可直接切換成那個人。 */
export function PendingCard({ groups, onPick }: Props) {
  const total = groups.reduce((s, g) => s + g.names.length, 0);
  if (total === 0) {
    return (
      <section className={`${styles.card} ${styles.done}`}>
        <b>全員都訂好了</b>
      </section>
    );
  }
  return (
    <section className={styles.card}>
      <h3 className={styles.h}>
        <Clock size={16} /> 還沒選購({total} 人)
      </h3>
      {groups.map((g) => (
        <div key={g.unit} className={styles.row}>
          <span className={styles.unit}>{g.unit}</span>
          <span className={styles.names}>
            {g.names.map((n) =>
              onPick ? (
                <button key={n} type="button" className={styles.name} onClick={() => onPick(g.unit, n)}>
                  {n}
                </button>
              ) : (
                <span key={n} className={styles.nameStatic}>
                  {n}
                </span>
              ),
            )}
          </span>
        </div>
      ))}
    </section>
  );
}