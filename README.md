
# 2025rubbish (rubbish)

 rubbish

## 功能特色

- 🚛 **實時垃圾車追蹤**：顯示垃圾車當前位置和預計到達時間
- 🗺️ **互動式地圖**：使用 OpenStreetMap 顯示完整路線和站點
- 📱 **響應式設計**：支援桌面和行動裝置
- 🔄 **自動更新**：每 30 秒自動刷新垃圾車位置
- 📍 **智慧監看點**：快速調整和切換監看站點
- 🎯 **無 API 金鑰**：使用免費的 OpenStreetMap 服務

## 設置開發環境
```
安裝專案相依套件
yarn
啟動API
cd cloudflare/steep-smoke-0e4c
wrangler dev --remote

啟動前端
npx quasar dev

build
npx quasar build

開啟測試 unit
npm run test:unit

開啟測試 e2e
npm run test:e2e
```


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
# 前端在執行 `quasar dev` 時會自動連線到此 URL
# 部署至 Cloudflare
wrangler deploy
```

本專案預設使用部署於 `https://steep-smoke-0e4c.vega-0b1.workers.dev` 的 worker。執行 `quasar dev` 時，前端會自動連線到 `http://localhost:8787`。
若自行部署 worker，請複製 `.env.example` 為 `.env`，並更新 `VITE_API_BASE_URL` 指向新的網址，讓前端能透過該 worker 取得垃圾車資料。

## 自訂設定
請參考 [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js)。

## 技術架構

### 前端技術棧
- **Vue 3** + **Composition API**：現代化的響應式框架
- **Quasar Framework**：Material Design UI 組件庫
- **OpenStreetMap + Leaflet**：免費開源地圖解決方案
- **Pinia**：狀態管理
- **Axios**：HTTP 請求處理

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
