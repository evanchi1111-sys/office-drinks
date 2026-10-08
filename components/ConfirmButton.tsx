import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";

interface Props {
  children: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
  disabled?: boolean;
  className?: string;
}

/** Two-step destructive button: first tap arms it, second tap confirms. */
export function ConfirmButton({
  children,
  confirmLabel = "再按一次確認刪除",
  onConfirm,
  size = "sm",
  variant = "outline",
  disabled,
  className,
}: Props) {
  const [armed, setArmed] = useState(false);
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  return (
    <Button
      size={size}
      variant={armed ? "destructive" : variant}
      disabled={disabled}
      className={className}
      onClick={() => {
        if (armed) {
          window.clearTimeout(t.current);
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
          t.current = window.setTimeout(() => setArmed(false), 3500);
        }
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}