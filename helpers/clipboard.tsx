import { toast } from "sonner";

export async function copyText(text: string, okMsg = "已複製") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMsg);
    return;
  } catch {
    /* fall through to legacy copy */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const done = document.execCommand("copy");
    document.body.removeChild(ta);
    if (done) {
      toast.success(okMsg);
      return;
    }
  } catch {
    /* ignore */
  }
  toast.error("無法自動複製,請長按文字手動複製");
}