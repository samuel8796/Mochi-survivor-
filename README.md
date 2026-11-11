# 吉伊卡哇・糯糯大冒險 | MOCHI SURVIVOR

手機／電腦皆可玩的像素生存遊戲。遊戲源自可愛角色愛好者的**非官方、非商業粉絲創作**，並非原作者授權作品；即使不收費，公開使用角色仍可能涉及著作權及商標權，正式公開傳播前請評估授權。

## 目前功能

- 選擇 **吉伊卡哇、小八貓、兔兔**（不同血量、速度、攻擊、防禦）
- 角色**待機、走路、手持武器、攻擊、拾取、升級、受傷、死亡**像素動作／表情
- 虛擬搖桿＋衝刺（電腦 WASD／方向鍵／空白鍵）
- 10 種武器、5 種可永久累積的技能、10 種敵人、5 種魔王
- 每 30 秒一波、每 5 波魔王；選擇升級及過關獎勵
- 死亡後關卡紀錄，等級及武器重置，永久技能／金幣保留
- Firebase Google 登入、跨裝置存檔、全球前 100 名排行榜（**Firebase 設定後啟用**）
- 排名每名帳號保留最佳成績；先比波次，再比擊倒數；預設隱私暱稱，不公開 Google 真實姓名或信箱

## 不用 Firebase 也能先試玩

GitHub Pages → Settings → Pages → Build and deployment → **Deploy from a branch**，選 `main` / `/(root)` → Save。

待 GitHub Pages 啟用後，預期站址為：

`https://samuel8796.github.io/Mochi-survivor-/`

> 這只是預期網址；必須先在 Settings 啟用 GitHub Pages，才能確定網站可開啟。

你也能在電腦執行本地 HTTP server（建議不要直接使用 file:// 開啟，避免 JS module 跨來源限制）。

## 連接 Firebase：一次性設定

**目前尚未建立任何 Firebase 雲端專案或部署資料庫規則。** 在 Firebase 控制台完成以下設定：

1. 進入 [Firebase Console](https://console.firebase.google.com/)，建立新專案（或連接專屬的既有專案）。
2. 專案總覽 → **新增應用程式** → **Web** → 取得 `firebaseConfig`。將 `apiKey`、`authDomain`、`projectId`、`appId` 填入 GitHub 的 [firebase-config.js](firebase-config.js)。若 SDK config 提供其他公開欄位，如 `messagingSenderId`，也可以保留。
3. **Authentication → Sign-in method → Google → Enable**。在 **Authentication → Settings → Authorized domains** 加入 `samuel8796.github.io`（以及自己測試網站的網域）。
4. **Firestore Database → Create database**。選擇想要的區域，建議使用 Production mode，不要長期使用 Test mode。
5. **Firestore Database → Rules**：以本專案的 [firestore.rules](firestore.rules) **完整取代原規則並 Publish**。此步驟必須確實完成，否則 Google 登入後仍可能出現 `permission-denied`。
6. 網頁重整、Google 登入、修改公開暱稱、試玩並死亡結算，即會嘗試將最佳成績送入 `leaderboard/{uid}`；永久存檔寫入 `userProgress/{uid}`。按 **世界排行** 顯示前 100 名。

**不要將** Firebase Service Account JSON、私鑰、管理員權杖、OAuth Client Secret 上傳到公開 GitHub Repo。網頁端的 `firebaseConfig` 是公開專案識別設定，而非伺服器私鑰。

## Firestore 資料設計

| Collection / Document | 可見範圍 | 內容 |
| --- | --- | --- |
| `userProgress/{uid}` | 只有本人 | 永久技能、金幣、最高波次、角色、遊玩次數 |
| `leaderboard/{uid}` | 全球公開讀取；本人 Google 登入後寫入 | 公開暱稱、角色、最佳波次、擊倒數、玩家等級、存活秒數、排行分數 |

本機死亡紀錄仍保留在瀏覽器的 `localStorage`，換裝置只同步永久技能、金幣和最佳進度；不會公開其他個人資訊。

## 排行榜完整性限制（重要）

目前的 Firestore Security Rules **可檢查身分／文件所有權／欄位範圍／分數單調增加**，但無法判定瀏覽器是否真的打贏一局。玩家仍可透過自行修改前端程式或呼叫 Firestore API 偽造高分。這一版屬於**休閒排行榜／原型驗證**，不能稱作防作弊排行榜。

若排行榜未來包含競賽或獎品，應改成後端驗證 gameplay 或伺服器權威模擬（例如使用 Cloud Functions / Cloud Run），並搭配 App Check 和流量控管。

## 主要專案檔案

- `index.html` — 完整遊戲、角色動畫、介面和遊戲邏輯
- `cloud.js` — Google Authentication、雲端存檔、全球排行榜
- `firebase-config.js` — Firebase Web 設定（目前空白，等待綁定）
- `firestore.rules` — 資料庫安全規則

## 操作與儲存

手機：左下虛擬搖桿、右下衝刺，角色自動攻擊。電腦：WASD／方向鍵移動，空白鍵衝刺，P 暫停。

原有單機存檔使用 `mochi_survivor_v1` 這個 `localStorage` key，不會因為新版本而自行刪除。清除瀏覽器資料可能清掉尚未同步的單機存檔。
