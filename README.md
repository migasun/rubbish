# 2024rubbish (20230118rubbish)

2023rubbish

[繁體中文](README.zh-TW.md)

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

