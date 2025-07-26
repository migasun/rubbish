# 2024rubbish (20230118rubbish)

2023rubbish

[繁體中文](README.zh-TW.md)

## 功能特色

- 🚛 **實時垃圾車追蹤**：顯示垃圾車當前位置和預計到達時間
- 🗺️ **互動式地圖**：使用 OpenStreetMap 顯示完整路線和站點
- 📱 **響應式設計**：支援桌面和行動裝置
- 🔄 **自動更新**：每 30 秒自動刷新垃圾車位置
- 📍 **智慧監看點**：快速調整和切換監看站點
- 🎯 **無 API 金鑰**：使用免費的 OpenStreetMap 服務

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

**1. 地圖尺寸問題解決**
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

**2. 資源載入優化**
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

**3. 響應式標記系統**
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

**4. 效能優化策略**
- **防抖更新**：150ms 防抖避免頻繁重繪
- **批量標記管理**：使用 LayerGroup 批量操作
- **圖標快取**：避免重複創建相同圖標
- **硬體加速**：CSS `transform: translateZ(0)` 啟用 GPU 加速

### 常見問題與解決方案

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
2. 使用 `requestIdleCallback` 在瀏覽器空閒時初始化
3. 批量標記操作減少 DOM 操作次數

#### 監看點選項不更新
**問題**：垃圾車位置更新後，下拉選單選項沒有同步更新

**解決方案**：
1. 使用響應式計算屬性 `computed()`
2. 在數據更新後觸發 `auto-reload` 事件
3. 深度監聽 store 狀態變化

## Install the dependencies
Run `npm install` to install the project's dependencies. This repository ships
with a `package-lock.json`, so npm is the default package manager. You may use
Yarn if you prefer.

```bash
npm install
# or
yarn
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
npx quasar dev
```


### Build the app for production
```bash
npx quasar build
```

### Deploying to GitHub Pages
The build output will be created in `dist/spa`. Commit this directory to the `gh-pages` branch or configure GitHub Pages to serve it from the `docs` folder.
An automated workflow in `.github/workflows/deploy.yml` does this
automatically for pushes to `main`.

After the workflow completes, visit your repository's **Settings → Pages**
section to confirm the deployment URL. GitHub will typically serve the site at
`https://<USERNAME>.github.io/<REPO>/`.

### Cloudflare Worker Proxy
The worker source lives in `cloudflare/steep-smoke-0e4c`. Change into this directory before running any Wrangler commands.

```bash
cd cloudflare/steep-smoke-0e4c
# Start a local dev server
# wrangler provides a local dev server. Use the --remote flag so the
# worker runs in an environment that includes the Web APIs (DOMParser etc.)
wrangler dev --remote
# The dev server runs on http://localhost:8787
# The front-end automatically connects to this URL when running `quasar dev`
# Deploy to Cloudflare
wrangler deploy
```

This project is preconfigured to use the hosted worker at
`https://steep-smoke-0e4c.vega-0b1.workers.dev`. When running `quasar dev`
the front-end automatically connects to `http://localhost:8787`. If you
deploy your own worker, copy `.env.example` to `.env` and update
`VITE_API_BASE_URL` to point to the new URL so the front-end can retrieve
garbage truck data through it.


### Customize the configuration
See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).

## License

This project is licensed under the [MIT License](LICENSE).

## 開發經驗總結

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
