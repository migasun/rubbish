# 2024rubbish (20230118rubbish)

2023rubbish

## Install the dependencies
```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
```bash
quasar dev
```


### Build the app for production
```bash
quasar build
```

### Deploying to GitHub Pages
The build output will be created in `dist/spa`. Commit this directory to the
`gh-pages` branch or configure GitHub Pages to serve it from the `docs` folder.

### Cloudflare Worker Proxy
The worker source lives in `cloudflare/steep-smoke-0e4c`. Change into this
directory before running any Wrangler commands.

```bash
cd cloudflare/steep-smoke-0e4c
# Start a local dev server
wrangler dev
# Deploy to Cloudflare
wrangler deploy
```

After deploying, note the URL Wrangler prints. Copy `.env.example` to `.env` and
set `VITE_API_BASE_URL` to that URL so the front-end can retrieve garbage truck
data through the worker.


### Customize the configuration
See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).
