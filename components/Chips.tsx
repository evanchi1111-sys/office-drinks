import styles from "./Chips.module.css";

interface ChipsProps {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  disabledOptions?: string[];
  className?: string;
}

export function Chips({ options, value, onChange, disabledOptions = [], className }: ChipsProps) {
  return (
    <div className={`${styles.row} ${className || ""}`} role="radiogroup">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          disabled={disabledOptions.includes(o)}
          className={`${styles.chip} ${value === o ? styles.on : ""}`}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

interface MultiChipsProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  className?: string;
}

/** 可多選的標籤按鈕(例如加料)。 */
export function MultiChips({ options, selected, onChange, className }: MultiChipsProps) {
  return (
    <div className={`${styles.row} ${className || ""}`} role="group">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            className={`${styles.chip} ${on ? styles.on : ""}`}
            onClick={() => onChange(on ? selected.filter((x) => x !== o.value) : [...selected, o.value])}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}