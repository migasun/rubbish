# 2024rubbish (20230118rubbish)

2023rubbish

[English](README.md)

## 安裝相依套件
```bash
yarn
# 或者
npm install
```

### 在開發模式啟動應用程式（含熱重新載入與錯誤回報）
```bash
quasar dev
```

### 建構正式版
```bash
quasar build
```

### 部署到 GitHub Pages
建置輸出的檔案會出現在 `dist/spa`。將此目錄提交到 `gh-pages` 分支，或是設定 GitHub Pages 使用 `docs` 資料夾作為根目錄。
位於 `.github/workflows/deploy.yml` 的自動化流程會在推送到 `main` 分支時自動完成此部署。

### Cloudflare Worker Proxy
Worker 原始碼位於 `cloudflare/steep-smoke-0e4c`。切換到該目錄後執行下列指令。
更多資訊請見 [Cloudflare 部署說明](cloudflare/readme.zh-TW.md)。
```bash
cd cloudflare/steep-smoke-0e4c
# 啟動本機開發伺服器
# wrangler 提供本機開發伺服器，使用 --remote 讓 worker
# 在支援 Web API（如 DOMParser）的環境中執行
wrangler dev --remote
# 開發伺服器預設埠為 http://localhost:8787
# 在前端執行 Quasar 時使用下列指令連向它
# `VITE_API_BASE_URL=http://localhost:8787 quasar dev`
# 部署至 Cloudflare
wrangler deploy
```

部署完成後，請記下 Wrangler 輸出的網址。將 `.env.example` 複製為 `.env`，並將 `VITE_API_BASE_URL` 設定為該網址，讓前端能透過 worker 取得垃圾車資料。

### 自訂設定
請參考 [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js)。
