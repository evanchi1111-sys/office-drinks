import { useMemo, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./Dialog";
import { Button } from "./Button";
import { Textarea } from "./Textarea";
import { Chips } from "./Chips";
import { parseRoster, readTextFile, type RosterUnit } from "../helpers/menuParse";
import styles from "./ImportDialog.module.css";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onApply: (units: RosterUnit[], mode: "merge" | "replace") => void;
}

export function ImportRosterDialog({ open, onOpenChange, onApply }: Props) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"合併到現有名單" | "取代整份名單">("合併到現有名單");
  const ref = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => (text.trim() ? parseRoster(text) : []), [text]);
  const people = parsed.reduce((s, u) => s + u.members.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.content}>
        <DialogHeader>
          <DialogTitle>匯入單位與姓名</DialogTitle>
          <DialogDescription>每行一個單位:「單位,姓名1,姓名2…」或「單位:姓名1、姓名2」。可從 Excel 直接貼上,或上傳 CSV(支援 Big5)。</DialogDescription>
        </DialogHeader>
        <div className={styles.body}>
          <div className={styles.row}>
            <Button variant="outline" size="sm" onClick={() => ref.current?.click()}>
              <FileUp size={14} /> 上傳 CSV / 文字檔
            </Button>
            <input
              ref={ref}
              type="file"
              accept=".csv,.txt,.tsv,text/csv,text/plain"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) setText(await readTextFile(f));
              }}
            />
          </div>
          <Textarea rows={9} placeholder={"公用組,王小明,李大華\n運轉組:陳一、林二、張三"} value={text} onChange={(e) => setText(e.target.value)} />
          {parsed.length > 0 && (
            <div className={styles.preview}>
              讀到 <b>{parsed.length}</b> 個單位、<b>{people}</b> 位人員
            </div>
          )}
          <Chips options={["合併到現有名單", "取代整份名單"]} value={mode} onChange={(v) => setMode(v as typeof mode)} />
        </div>
        <DialogFooter>
          <Button
            disabled={parsed.length === 0}
            onClick={() => {
              onApply(parsed, mode === "取代整份名單" ? "replace" : "merge");
              setText("");
              onOpenChange(false);
              toast.success("已套用到草稿,記得按「儲存名單」");
            }}
          >
            套用到草稿
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}