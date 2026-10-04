# MN13 內容後台

前台與後台共用 MN13 Supabase 專案 `fjmivcpvqdblqdmstygq`，組織 `ejkcnbsbrteudkhjsxny`。不使用 MR 或詠順資料庫。

- 後台：`https://m13nbeauty.github.io/MN13/MN13/admin.html`
- 只允許已驗證的 `m13nbeauty@gmail.com` 帳號管理。
- 首次設定：在 MN13 Supabase Authentication → Users → Add user → Create new user 建立上述帳號，自行設定後台密碼並勾選 Auto Confirm User。不要把密碼交給他人或放在 GitHub。
- 登入後新增或編輯課程、肌膚日誌，按「儲存變更」直接更新資料庫；官網重新整理後讀最新內容。
- 右上角開關控制顯示／隱藏。隱藏不刪資料，重新開啟可恢復顯示。
- 「暫存草稿」只存這台瀏覽器；草稿版本落後時不自動覆蓋資料庫。
- 圖片上傳到 MN13 專用 `mn13-media` 公開素材桶，保留原始檔案。僅上傳已同意公開的照片。
- 肌膚日誌必須確認當事人同意，才能顯示。不要填入聯絡資訊或私密紀錄。

## 架構與權限

`backend-config.js` 只有公開 API key；沒有 service role 或資料庫密碼。Supabase JS 固定為 2.117.2 並保存在 `vendor/`。

`mn13_content` 保存管理內容、草稿狀態及內部備註，只有 MN13 管理員可讀及更新。`mn13_public_content` 只放已顯示且有公開同意的日誌與顯示中的課程，排除內部備註及來源比對欄位。原始 JSON 為遷移快照，不再作為網站內容來源；更動資料時使用後台。

`mn13_save_content` RPC 在同一交易更新管理版與公開版，以 revision 防止多人編輯互相覆蓋。RLS 與管理員判斷不採用可由使用者改寫的 user_metadata。網路失敗時前台顯示重試提示，不退回可能過期的課程與日誌內容。

資料庫初始化 SQL：`backend/schema.sql`。已於 MN13 專案套用，勿重複執行。
