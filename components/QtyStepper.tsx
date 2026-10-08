import { Minus, Plus } from "lucide-react";
import styles from "./QtyStepper.module.css";

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export function QtyStepper({ value, onChange, min = 1, max = 10, label = "杯數" }: Props) {
  return (
    <div className={styles.wrap} role="group" aria-label={label}>
      <button type="button" className={styles.btn} aria-label="減少" disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Minus size={16} />
      </button>
      <span className={styles.num}>
        {value}
        <small> 杯</small>
      </span>
      <button type="button" className={styles.btn} aria-label="增加" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus size={16} />
      </button>
    </div>
  );
}