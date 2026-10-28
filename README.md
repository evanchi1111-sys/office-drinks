# 🧋🍗 辦公室飲料餐點訂購

辦公室團購飲料與餐點（炸物、烤肉、蛋糕點心…）：開團 → 分享連結到 LINE → 同事各自點餐 → 彙總給店家 → 列印分發單。同事不用登入、不用註冊帳號。

網站：https://evanchi1111-sys.github.io/office-drinks/

- **開團**：選店家（飲料店、餐點店可**複選**，同一個團就能同時點飲料和餐點）與這次參加的人（名單上所有人，或勾選指定成員），可分享 `?g=團編號` 連結；開團後可按「🏪 店家」增減店家（已經有人訂的店不能移除）
- **餐點**：店家分「飲料店」「餐點店」。餐點店沒有甜度冰量，改用份量（小份／大份…）、加購（加辣、加蛋…）、備註；品項可分類（炸物、烤肉、蛋糕點心…），點餐時可依分類篩選。訂購頁上方的店家按鈕可切換要點哪一家
- **訂購**：選單位與姓名（會記住）、搜尋品項、規格／甜度／冰量／加料／備註、一次多杯；「常點的」一鍵再訂；可修改、刪除自己的訂單；菜單上沒有的品項（季節限定等）可自己輸入品名與價格，會標示「自填」
- **還沒選購**：依單位列出還沒點的人，點名字可直接幫他點
- **彙總**：品項數量與金額（多家店時每家一段，飲料算杯、餐點算份）、複製彙總（給店家，每家店一段）、複製明細（貼 Excel）、列印／下載 A4 分發單（第一頁彙總，之後每個單位一頁含簽收欄）
- **菜單**（需管理密碼）：店家與種類、電話、規格、品項價格與分類、加料／加購；可貼上 Excel 或上傳 CSV（支援 Big5）匯入（單獨一格的列，例如「炸物」，會當成分類標題）；可匯出成 CSV（Excel 開啟、改完再匯入）
- **名單**（需管理密碼）：單位與姓名，可批次匯入；可匯出成 CSV（一人一列，Excel 開啟、改完再匯入）
- 多人同時使用時即時同步

純 HTML / JavaScript，放在 GitHub Pages；資料庫與即時同步使用 [Supabase](https://supabase.com)。

> 想先看看？網址後面加上 `?demo` 就是示範模式（資料只存在瀏覽器分頁裡，管理密碼 `demo1234`）。

## 安全規則
- 所有寫入都經過資料庫函式檢查，網頁無法直接改資料表。
- 單價由資料庫依菜單計算（含加料／加購），不採用瀏覽器送來的價格；只有「自己輸入」的品項採用訂購人填的單杯價格（1～2000 元），並標示「自填」。
- 團結束訂購後，訂單不能再新增、修改或刪除（需先「重新開放」）。
- 菜單與名單需要管理密碼；密碼加密儲存，錯 5 次鎖 5 分鐘。
- 開團、結束訂購不需要密碼；已結束的團可由管理者刪除（需管理密碼，訂單一併刪除）。
- 訂購送出前會跳出確認視窗（訂購人、店家、品項、數量、金額）；訂單只能點團裡有的店家。

## 設定
可與桌球系統共用同一個 Supabase 專案（本系統資料表以 `od_` 開頭）。
1. **SQL Editor** → **New query** → 貼上 [`supabase/setup.sql`](supabase/setup.sql) → **Run**。（2026-10-15 以前建立的，另外依序執行 `supabase/upgrade-*.sql`；已經在用的，要用餐點功能請執行 `supabase/upgrade-04-meals.sql`）
2. 設定管理密碼：把 `setup.sql` 最後一行（第 6 段）去掉開頭的 `--`、換成你的密碼，單獨執行一次。之後要換密碼也一樣。範例（把 `新密碼` 換成你的密碼）：
   ```sql
   update public.od_admin set pw_hash = extensions.crypt('新密碼', extensions.gen_salt('bf')), failed = 0, locked_until = null where id = 1;
   ```
3. [`js/config.js`](js/config.js) 填入 Project URL 與 publishable（anon）key。
4. 倉庫 **Settings** → **Pages** → Branch `main`、`/ (root)`。

## 檔案
| 檔案 | 用途 |
|---|---|
| `index.html` | 網頁入口 |
| `css/style.css` | 版面樣式 |
| `js/config.js` | Supabase 連線設定（Project URL、publishable key） |
| `js/app.js` | 畫面與操作 |
| `js/logic.js` | 彙總、未選購名單、常點的、分發單、菜單／名單解析 |
| `js/backend.js` | 資料存取（Supabase／示範模式） |
| `supabase/setup.sql` | 資料表、安全規則、資料庫函式、即時同步 |
| `supabase/upgrade-*.sql` | 舊版升級用，依編號順序執行 |

## 相關專案
不想設管理密碼、每個空間一個專屬連結的版本：[office-drinks-lite](https://github.com/evanchi1111-sys/office-drinks-lite)（<https://evanchi1111-sys.github.io/office-drinks-lite/>）。

## 授權

以 [MIT 授權](LICENSE) 釋出，Copyright (c) 2026 evanchi1111-sys。
