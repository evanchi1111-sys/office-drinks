import { useMemo, useRef, useState } from "react";
import { FileUp, ImageUp, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./Dialog";
import { Button } from "./Button";
import { Textarea } from "./Textarea";
import { Chips } from "./Chips";
import { Spinner } from "./Spinner";
import {
  parseMenu,
  parseToppingsText,
  applyMenu,
  readTextFile,
  fileToDataUrls,
  type ParsedMenu,
} from "../helpers/menuParse";
import { postMenuRecognize } from "../endpoints/menu/recognize_POST.schema";
import { getAdminPassword, handleAdminError } from "../helpers/adminStore";
import styles from "./ImportDialog.module.css";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  current: ParsedMenu;
  onApply: (menu: ParsedMenu) => void;
}

const q = (s: string) => (/[",\n\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

function toCsv(m: ParsedMenu): string {
  const head = ["品名", ...m.sizes].map(q).join(",");
  const rows = m.items.map((it) => [it.n, ...it.p.map((p) => (p == null ? "" : String(p)))].map(q).join(","));
  return [head, ...rows].join("\n");
}

export function ImportMenuDialog({ open, onOpenChange, current, onApply }: Props) {
  const [text, setText] = useState("");
  const [topText, setTopText] = useState("");
  const [mode, setMode] = useState<"加入到現有菜單" | "取代整份菜單">("加入到現有菜單");
  const csvRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const parsed = useMemo<ParsedMenu | null>(() => {
    const m = text.trim() ? parseMenu(text) : { sizes: ["中杯"], items: [] };
    const toppings = topText.trim() ? parseToppingsText(topText) : [];
    if (m.items.length === 0 && toppings.length === 0) return null;
    return { ...m, toppings };
  }, [text, topText]);

  const onCsv = async (f: File | undefined) => {
    if (!f) return;
    try {
      setText(await readTextFile(f));
    } catch {
      toast.error("讀取檔案失敗");
    }
  };

  /** 一次辨識多張照片/PDF,結果合併後放進下方文字框讓你檢查。 */
  const onImages = async (files: File[]) => {
    if (files.length === 0) return;
    const pw = getAdminPassword();
    if (!pw) return toast.error("請先以管理者身分登入");
    let acc: ParsedMenu = { sizes: [], items: [], toppings: [] };
    let ok = 0;
    let failed = 0;
    try {
      const jobs: string[] = [];
      for (const f of files) jobs.push(...(await fileToDataUrls(f)));
      for (let i = 0; i < jobs.length; i++) {
        setProgress(`AI 正在讀第 ${i + 1} / ${jobs.length} 張,每張約 10~40 秒…`);
        try {
          const r = await postMenuRecognize({ password: pw, dataUrl: jobs[i] });
          acc = applyMenu(acc, { sizes: r.sizes, items: r.items, toppings: r.toppings }, "append");
          ok++;
        } catch (e) {
          failed++;
          handleAdminError(e);
          if (e instanceof Error) toast.error(`第 ${i + 1} 張:${e.message}`);
        }
      }
      if (ok > 0) {
        setText(toCsv(acc));
        setTopText((acc.toppings ?? []).map((t) => `${t.n} ${t.p}`).join("\n"));
        toast.success(`讀到 ${acc.items.length} 個品項、${acc.toppings?.length ?? 0} 種加料${failed ? `(${failed} 張失敗)` : ""},請檢查再套用`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "辨識失敗");
    } finally {
      setProgress(null);
    }
  };

  const apply = () => {
    if (!parsed) return toast.error("沒有讀到任何品項");
    onApply(applyMenu(current, parsed, mode === "取代整份菜單" ? "replace" : "append"));
    setText("");
    setTopText("");
    onOpenChange(false);
    toast.success("已套用到草稿,記得按「儲存菜單」");
  };

  const busy = progress !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.content}>
        <DialogHeader>
          <DialogTitle>匯入菜單</DialogTitle>
          <DialogDescription>
            貼上文字或 Excel 儲存格(每行:品名、各規格價格),或上傳 CSV、菜單照片/PDF 讓 AI 辨識。第一行若是「品名、中杯、大杯」會當作規格名稱。
          </DialogDescription>
        </DialogHeader>
        <div className={styles.body}>
          <div className={styles.row}>
            <Button variant="outline" size="sm" onClick={() => csvRef.current?.click()} disabled={busy}>
              <FileUp size={14} /> 上傳 CSV / 文字檔
            </Button>
            <Button variant="outline" size="sm" onClick={() => imgRef.current?.click()} disabled={busy}>
              {busy ? <Spinner size="sm" /> : <ImageUp size={14} />} 菜單照片 / PDF(可多選)
            </Button>
            <input ref={csvRef} type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" hidden onChange={(e) => { void onCsv(e.target.files?.[0]); e.target.value = ""; }} />
            <input
              ref={imgRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              hidden
              onChange={(e) => {
                const fs = Array.from(e.target.files ?? []);
                e.target.value = "";
                void onImages(fs);
              }}
            />
          </div>
          <p className={styles.tip}>辨識小技巧:菜單拍正面、光線充足、字要清楚;很長的菜單請分段截圖,一次選多張,系統會自動合併。</p>
          {busy && (
            <p className={styles.hint}>
              <Sparkles size={14} /> {progress}
            </p>
          )}
          <label className={styles.label}>飲料與價格</label>
          <Textarea
            rows={8}
            placeholder={"品名,中杯,大杯\n珍珠奶茶,50,60\n四季春茶,30,35"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <label className={styles.label}>加料(每行一個:名稱 加價,沒寫價格視為免費)</label>
          <Textarea rows={4} placeholder={"大珍珠 10\n小珍珠 10\n椰果 10"} value={topText} onChange={(e) => setTopText(e.target.value)} />
          {parsed && (
            <div className={styles.preview}>
              讀到 <b>{parsed.items.length}</b> 個品項、<b>{parsed.toppings?.length ?? 0}</b> 種加料;規格:{parsed.sizes.join("、")}
              {parsed.items.slice(0, 3).map((i) => (
                <div key={i.n} className={styles.pv}>
                  {i.n} — {i.p.map((p) => (p == null ? "—" : `$${p}`)).join(" / ")}
                </div>
              ))}
            </div>
          )}
          <Chips options={["加入到現有菜單", "取代整份菜單"]} value={mode} onChange={(v) => setMode(v as typeof mode)} />
        </div>
        <DialogFooter>
          <Button onClick={apply} disabled={!parsed || busy}>
            套用到草稿
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}