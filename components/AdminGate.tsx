import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./Dialog";
import { Input } from "./Input";
import { Button } from "./Button";
import { tryUnlock } from "../helpers/useDrinkData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function AdminGate({ open, onOpenChange }: Props) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!pw || busy) return;
    setBusy(true);
    const ok = await tryUnlock(pw);
    setBusy(false);
    if (ok) {
      setPw("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>管理者登入</DialogTitle>
          <DialogDescription>輸入管理密碼後,才能修改飲料店菜單與單位姓名名單。</DialogDescription>
        </DialogHeader>
        <Input
          type="password"
          autoFocus
          placeholder="管理密碼"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) void submit();
          }}
        />
        <DialogFooter>
          <Button onClick={() => void submit()} disabled={!pw || busy}>
            {busy ? "確認中…" : "解鎖"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}