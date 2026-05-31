
# 2025rubbish (rubbish)

rubbish

## 功能特色

- 🚛 **實時垃圾車追蹤**：顯示垃圾車當前位置和預計到達時間
- 🗺️ **互動式地圖**：使用 OpenStreetMap 顯示完整路線和站點
- 📱 **響應式設計**：支援桌面和行動裝置
- 🔄 **自動更新**：每 30 秒自動刷新垃圾車位置
- 📍 **智慧監看點**：快速調整和切換監看站點
- 🎯 **無 API 金鑰**：使用免費的 OpenStreetMap 服務
- [網頁顯示地圖.黑暗執行緒](https://blog.darkthread.net/blog/leaflet-w-openstreetmap-example/?fbclid=IwY2xjawQ3-3lleHRuA2FlbQIxMQBicmlkETE3WHQ5TnJtSHltNEQ2Tk1Zc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHih1D3npKeI564DIDDM-ScInxanektd5Wn2DBi2v6MDR3GNKVradl4W6bWGR_aem_zKiUK487YBZs-o3agr9UXg)
- [阿油leaflet教學](https://dowyuu.github.io/program/2021/03/22/Leaflet-note/)


## 設置開發環境

### 必要步驟
```bash
# 1. 安裝專案相依套件
yarn

# 2. 啟動後端 API（在新終端機）
cd cloudflare/steep-smoke-0e4c
npx wrangler dev --remote
# 開發伺服器將在 http://localhost:8787 啟動

# 3. 啟動前端（在另一個新終端機）
# ⚠️ 重要：必須設置 VITE_API_BASE_URL 環境變數指向本地開發伺服器
VITE_API_BASE_URL=http://localhost:8787 npm run dev

# 4. 執行測試
npm run test:unit     # 單元測試
npm run test:e2e      # E2E 測試

# 5. 構建生產版本
npm run build
```

### ⚠️ 開發時的重要注意事項

**在開發環境（`npm run dev`）中，必須手動設置 `VITE_API_BASE_URL` 環境變數：**

- **Windows (PowerShell)**：
  ```powershell
  $env:VITE_API_BASE_URL = 'http://localhost:8787'
  npm run dev
  ```

- **Windows (Command Prompt)**：
  ```cmd
  set VITE_API_BASE_URL=http://localhost:8787
  npm run dev
  ```

- **macOS / Linux**：
  ```bash
  VITE_API_BASE_URL=http://localhost:8787 npm run dev
  ```

若未設置此環境變數，前端將使用預設的 Cloudflare Worker URL（`https://steep-smoke-0e4c.vega-0b1.workers.dev`），這可能導致 CORS 或連線問題。


## 部署到雲端

### 部署到 GitHub Pages
建置輸出會產生於 `dist/spa`。可將此目錄提交至 `gh-pages` 分支，或設定 GitHub Pages 以 `docs` 資料夾為來源。
位於 `.github/workflows/deploy.yml` 的自動化流程會在推送至 `main` 分支時自動部署。

部署完成後，可於倉庫的 **Settings → Pages** 頁面確認網址，通常會是 `https://<USERNAME>.github.io/<REPO>/`。

### Cloudflare Worker Proxy
Worker 原始碼位於 `cloudflare/steep-smoke-0e4c`，執行任何 Wrangler 指令前請先切換到該目錄。

```bash
cd cloudflare/steep-smoke-0e4c

# 啟動本機開發伺服器
# wrangler 提供本機開發伺服器，使用 --remote 可在支援 Web API（如 DOMParser）的環境中執行
wrangler dev --remote
# 開發伺服器預設為 http://localhost:8787

# 部署至 Cloudflare
wrangler deploy
```

### API 端點配置

**開發環境**：
- 本地開發伺服器：`http://localhost:8787`
- 設置方法：執行 `VITE_API_BASE_URL=http://localhost:8787 npm run dev`

**生產環境**（GitHub Pages）：
- Cloudflare Worker：`https://steep-smoke-0e4c.vega-0b1.workers.dev`
- 自動使用此 URL（無須額外配置）

**自訂 Worker 部署**：
若自行部署 worker 到不同的 URL，在開發環境中執行：
```bash
VITE_API_BASE_URL=<YOUR_WORKER_URL> npm run dev
```
或在生產構建時：
```bash
VITE_API_BASE_URL=<YOUR_WORKER_URL> npm run build
```

## 自訂設定
請參考 [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js)。

## 技術架構

### 前端技術棧
- **Vue 3** + **Composition API**：現代化的響應式框架
- **Quasar Framework**：Material Design UI 組件庫
- **OpenStreetMap + Leaflet 2.0**：免費開源地圖解決方案
- **Pinia**：狀態管理
- **Axios**：HTTP 請求處理
- **ESLint + Prettier**：代碼風格統一
- **lodash-es**：性能優化工具函數

### 專案結構

```
src/
├── boot/
│   ├── axios.js           # HTTP 請求配置
│   └── errorHandler.js    # 全局錯誤處理
├── components/
│   ├── ServiceStatus.vue      # 頂部服務狀態卡片
│   ├── RouteTabs.vue          # 路線選項卡
│   ├── RefreshProgress.vue    # 自動重新載入進度條
│   ├── RoutePanel.vue         # 路線面板
│   ├── OpenStreetMapView.vue  # OpenStreetMap 地圖組件
│   ├── StationStatus.vue      # 站點狀態
│   └── StationsList.vue       # 站點列表
├── composables/
│   └── useRouteData.js    # 路線數據加載邏輯 (可重用)
├── pages/
│   └── IndexPage.vue      # 主頁面
├── stores/
│   └── watchers.js        # 監看點狀態管理
└── ...
```

### 地圖組件技術亮點

#### OpenStreetMap 整合
我們選擇 OpenStreetMap 替代 Google Maps，原因包括：
- ✅ **完全免費**：無需 API 金鑰，無使用量限制
- ✅ **部署安全**：可安全部署到 GitHub Pages
- ✅ **功能完整**：支援標記、彈出視窗、互動操作
- ✅ **效能優化**：輕量級且載入快速

#### 關鍵技術解決方案

#### Leaflet 2.0.0-alpha 升級

我們成功從 CDN 版本 leaflet@1.9.4 升級到本地安裝的 leaflet@2.0.0-alpha，獲得以下改進：

✅ **性能提升**：本地資源載入比 CDN 更快更可靠
✅ **版本控制**：精確控制依賴版本，避免第三方服務變更
✅ **離線支持**：減少對外部 CDN 的依賴
✅ **現代化 API**：使用最新的 Leaflet 2.0 架構

**API 變更範例**：
```javascript
// 舊版 leaflet@1.9.4 (CDN)
const map = L.map(container, options)
const tileLayer = L.tileLayer(url, options)
const marker = L.circleMarker(latlng, options)

// 新版 leaflet@2.0.0-alpha (本地)
const map = new L.Map(container, options)
const tileLayer = new L.TileLayer(url, options)
const marker = new L.CircleMarker(latlng, options)
```

**升級重點**：
- 🔄 **API 統一化**：所有類別都使用 `new` 關鍵字實例化
- 📦 **模組化導入**：從 CDN 切換到 ES6 import/export
- 🎯 **類型安全**：更嚴格的物件導向設計
- ⚡ **效能最佳化**：移除舊版相容性代碼

**1. 圖標資源處理**
```javascript
// ES6 模組導入方式
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// 修復預設圖標
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})
```

**2. 地圖尺寸問題解決**
```javascript
// 多重尺寸刷新機制確保地圖正確顯示
const forceResize = () => {
  if (map.value) {
    map.value.invalidateSize()
  }
}

// 在多個時間點執行，確保穩定性
forceResize()
setTimeout(forceResize, 50)
setTimeout(forceResize, 150)
setTimeout(forceResize, 300)
setTimeout(forceResize, 500)
```

**3. 資源載入優化**
```javascript
// 單例模式避免重複載入 Leaflet 資源
class LeafletLoader {
  static instance = null
  static loadPromise = null
  static isLoaded = false

  async load() {
    if (LeafletLoader.isLoaded && window.L) {
      return Promise.resolve()
    }
    // ...載入邏輯
  }
}
```

**4. 響應式標記系統**
```javascript
// 使用計算屬性確保標記即時更新
const line24Options = computed(() => {
  const points = watchersStore.availablePoints['line24'] || []
  return points.map(point => {
    let label = `${point.homeName} - ${point.schedule}`
    if (point.isCurrentLocation) {
      label = `🚛 ${label} (垃圾車目前位置)`
    }
    return { value: point.homeId, label }
  })
})
```

**5. 效能優化策略**
- **防抖更新**：150ms 防抖避免頻繁重繪
- **批量標記管理**：使用 LayerGroup 批量操作
- **圖標快取**：避免重複創建相同圖標
- **硬體加速**：CSS `transform: translateZ(0)` 啟用 GPU 加速

### 常見問題與解決方案

以下解法均基於 Leaflet 2.0.0-alpha 的實作環境。

#### 地圖只顯示左上角
**問題**：地圖容器尺寸計算錯誤導致只顯示部分地圖

**解決方案**：
1. 使用 `invalidateSize()` 強制重新計算尺寸
2. 在多個時機點執行尺寸刷新
3. 監聽視窗 resize 事件自動調整

#### 載入效能問題
**問題**：重複載入資源導致載入緩慢

**解決方案**：
1. 實作單例 LeafletLoader 避免重複載入
2. 批量標記操作減少 DOM 操作次數

#### 監看點選項不更新
**問題**：垃圾車位置更新後，下拉選單選項沒有同步更新

**解決方案**：
1. 使用響應式計算屬性 `computed()`
2. 在數據更新後觸發 `auto-reload` 事件
3. 深度監聽 store 狀態變化

## 設置開發環境
執行 `npm install` 安裝專案相依套件。本專案提供 `package-lock.json`，建議使用 npm；若有需要也可改用 Yarn。

```bash
npm install
# 或
yarn
```

### 啟動開發模式（含熱重新載入與錯誤回報）
```bash
npx quasar dev
```

### 建構正式版
```bash
npx quasar build
```

### 代碼品質檢查
```bash
# 執行 ESLint 檢查
npm run lint

# 自動修復 ESLint 問題
npm run lint:fix

# 格式化代碼
npm run format
```

### 環境變量配置

專案使用 `.env` 文件管理環境變量：

| 文件 | 用途 | 說明 |
|------|------|------|
| `.env.local` | 開發環境 | API 指向本地 `http://localhost:8787` |
| `.env.production` | 生產環境 | API 指向 Cloudflare Worker |

**可用變量**：
- `VITE_API_BASE_URL`：後端 API 地址
- `VITE_AUTO_RELOAD_INTERVAL`：自動刷新間隔（秒）

## 部署到雲端

### 部署到 GitHub Pages

建置輸出會產生於 `dist/spa`。可將此目錄提交至 `gh-pages` 分支，或設定 GitHub Pages 以 `docs` 資料夾為來源。

#### 自動部署（GitHub Actions）

位於 `.github/workflows/deploy.yml` 的自動化流程會在以下情況自動部署：
- 推送至 `main` 分支時
- 手動觸發 workflow（workflow_dispatch）

**GitHub Actions 工作流程**：
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npx quasar build
      - name: Copy simplified-map.html
        run: cp simplified-map.html dist/spa/
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist/spa
```

**首次設定 GitHub Pages**：
1. 進入倉庫的 **Settings → Pages**
2. Source 選擇 `gh-pages` 分支
3. 等待 Actions 完成部署
4. 網址通常為 `https://<USERNAME>.github.io/<REPO>/`

#### 手動部署

如需手動部署，執行以下步驟：

```bash
# 1. 建構專案
npx quasar build

# 2. 複製額外靜態檔案
cp simplified-map.html dist/spa/

# 3. 部署到 gh-pages 分支（使用 gh-pages 工具）
npx gh-pages -d dist/spa
```

### 開發工作流程

#### 完整開發流程

```bash
# 1. 克隆專案
git clone https://github.com/<USERNAME>/<REPO>.git
cd <REPO>

# 2. 安裝依賴
npm install

# 3. 啟動 Cloudflare Worker 本地開發伺服器（開新終端）
cd cloudflare/steep-smoke-0e4c
wrangler dev --remote
# Worker 會在 http://localhost:8787 運行

# 4. 回到專案根目錄，啟動前端開發伺服器
cd ../..
npx quasar dev
# 前端會在 http://localhost:9000 運行

# 5. 開發完成後，執行代碼品質檢查
npm run lint
npm run format

# 6. 提交並推送到 main 分支，自動觸發部署
git add .
git commit -m "feat: 新功能描述"
git push origin main
```

#### 測試流程

```bash
# 執行單元測試
npm run test:unit

# 執行 E2E 測試
npm run test:e2e

# 執行所有測試
npm run test
```

### Cloudflare Worker Proxy
Worker 原始碼位於 `cloudflare/steep-smoke-0e4c`，執行任何 Wrangler 指令前請先切換到該目錄。

```bash
cd cloudflare/steep-smoke-0e4c
# 啟動本機開發伺服器
# wrangler 提供本機開發伺服器，使用 --remote 可在支援 Web API（如 DOMParser）的環境中執行
wrangler dev --remote
# 開發伺服器預設為 http://localhost:8787
# 前端在執行 `quasar dev` 時會自動連線到此 URL
# 部署至 Cloudflare
wrangler deploy
```

本專案預設使用部署於 `https://steep-smoke-0e4c.vega-0b1.workers.dev` 的 worker。執行 `quasar dev` 時，前端會自動連線到 `http://localhost:8787`。
若自行部署 worker，請複製 `.env.example` 為 `.env`，並更新 `VITE_API_BASE_URL` 指向新的網址，讓前端能透過該 worker 取得垃圾車資料。

## 自訂設定
請參考 [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js)。

## 授權條款

此專案採用 [MIT 授權條款](LICENSE)。

## 特別修改與開發經驗
本專案進行了多項特別修改與效能優化，例如升級 Leaflet 2.0-alpha、解決地圖尺寸問題與資源載入最佳化，以下為開發時的重點經驗。

### 地圖組件開發要點
1. **容器尺寸管理**：地圖組件對容器尺寸敏感，需多次確保尺寸正確
2. **資源載入順序**：CSS 和 JS 資源載入順序影響渲染效果
3. **事件清理**：組件卸載時務必清理事件監聽器避免記憶體洩漏
4. **響應式設計**：使用 Vue 3 響應式系統確保數據同步

### 除錯技巧
- 使用詳細的 `console.log` 追蹤載入過程
- 在不同時機點執行關鍵操作確保穩定性
- 監聽多種事件（resize、load）提升相容性

### 部署注意事項
- OpenStreetMap 無需 API 金鑰，適合靜態部署
- GitHub Pages 部署時注意路徑配置
- 建議啟用 HTTPS 確保地圖資源正常載入
