# 2024rubbish (20230118rubbish)

2023rubbish

[English](README.md)

## 安裝相依套件
本專案提供 `package-lock.json`，建議以 npm 為預設套件管理工具。
執行 `npm install` 安裝相依套件，或依需要改用 Yarn。

```bash
npm install
# 或是
yarn
```

### 在開發模式啟動應用程式（含熱重新載入與錯誤回報）
```bash
npx quasar dev
```

### 建構正式版
```bash
npx quasar build
```

### 部署到 GitHub Pages
建置輸出的檔案會出現在 `dist/spa`。將此目錄提交到 `gh-pages` 分支，或是設定 GitHub Pages 使用 `docs` 資料夾作為根目錄。 位於 `.github/workflows/deploy.yml` 的自動化流程會在推送到 `main` 分支時自動完成此部署。

部署完成後，可在倉庫的 **Settings → Pages** 頁面查看網址。通常會是
`https://<USERNAME>.github.io/<REPO>/`。

部署完成後，可在倉庫的 **Settings → Pages** 頁面查看網址。通常會是
`https://<USERNAME>.github.io/<REPO>/`。

部署完成後，可在倉庫的 **Settings → Pages** 頁面查看網址。通常會是
`https://<USERNAME>.github.io/<REPO>/`。

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
# `VITE_API_BASE_URL=http://localhost:8787 npx quasar dev`
# 部署至 Cloudflare
wrangler deploy
```

本專案預設會使用 Cloudflare 上的 worker
`https://steep-smoke-0e4c.vega-0b1.workers.dev`。若自行部署 worker，請複製
`.env.example` 為 `.env`，並將 `VITE_API_BASE_URL` 改為新的網址，讓前端能透過
新的 worker 取得垃圾車資料。

### 自訂設定
請參考 [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js)。

## 授權條款

此專案採用 [MIT 授權條款](LICENSE)。

