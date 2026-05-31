# 🚛 垃圾車即時追蹤系統 (Rubbish Tracker)

基於 **Vue 3**、**Quasar Framework** 與 **OpenStreetMap (Leaflet)** 的垃圾車即時動態追蹤系統。免用付費 Google Maps API 即可快速部署。

---

## 🌟 重點功能特色

- 📍 **整合式互動地圖**：整合 Leaflet，支援顯示整條路線、清運站點、清運進度及已清運路段。
- 🚛 **客製化卡車 SVG**：地圖上以綠色資收車 SVG 標記即時位置，並帶有閃爍警示燈動畫。
- 🎯 **懸浮定位控制面板**：地圖右上角磨砂玻璃面板，一鍵快速定位「完整路線」、「監看點」或「卡車位置」。
- 🔄 **雙重重整機制**：地圖內一鍵即時更新按鈕 + 主頁面自動/手動重新整理，同步重置倒數計時。
- 📱 **響應式卡片排版**：極致優化的雙按鈕設計，完美適配行動裝置與桌面瀏覽器。
- 🌐 **SEO 與 Chrome 優化**：設定正確語系標籤防止瀏覽器彈出多餘翻譯提示。

---

## 🛠️ 快速開發步驟

### 1. 安裝套件
```bash
npm install
```

### 2. 啟動 Cloudflare Worker 本地代理 (開發防 CORS 用)
```bash
cd cloudflare/steep-smoke-0e4c
npm install
npm run dev
# 代理伺服器將於 http://127.0.0.1:8787 啟動
```

### 3. 啟動前端開發伺服器
於專案根目錄執行：
```bash
npx quasar dev
# 前端伺服器預設於 http://localhost:9000 啟動
```

### 4. 測試與建置
```bash
npm run test     # 執行 Unit & E2E (Playwright) 測試
npm run build    # 建置生產環境 SPA 靜態檔案 (輸出於 dist/spa)
```

---

## ⚙️ 環境變數與部署

- **API 配置**：
  - 開發環境 (`.env.local`)：`VITE_API_BASE_URL=http://localhost:8787` (指向本地 Worker)
  - 生產環境 (`.env.production`)：`VITE_API_BASE_URL=https://steep-smoke-0e4c.vega-0b1.workers.dev` (指向雲端 Worker)

- **部署指令**：
  - **前端 (GitHub Pages)**: 當推送至 `main` 分支時，會透過 GitHub Actions 自動編譯並部署。
  - **代理 (Cloudflare Worker)**: 切換至 `cloudflare/steep-smoke-0e4c` 後執行 `npx wrangler deploy`。

---

## 📂 技術棧
- **前端**：Vue 3 (Composition API) + Quasar v2 + Pinia + Axios
- **地圖**：Leaflet 2.0.0-alpha
- **代碼規範**：ESLint + Prettier (Standard JS，無分號樣式)

---

## 📄 授權條款

此專案採用 [MIT 授權條款](LICENSE)。
