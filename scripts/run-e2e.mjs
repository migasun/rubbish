#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const cliPath = path.join(repoRoot, 'node_modules', '@playwright', 'test', 'cli.js');

if (!existsSync(cliPath)) {
  console.warn('\n[playwright] Skipping end-to-end suite because the Playwright CLI is unavailable.');
  console.warn('[playwright] Install dev dependency "@playwright/test" to enable browser automation.');
  process.exit(0);
}

const result = spawnSync(process.execPath, [cliPath, 'test'], {
  stdio: 'inherit',
  cwd: repoRoot,
  env: {
    ...process.env,
    PLAYWRIGHT_HEADLESS: process.env.PLAYWRIGHT_HEADLESS ?? '1'
  }
});

if (result.error) {
  console.error('\n[playwright] Failed to launch the CLI:', result.error.message);
  process.exit(result.status ?? 1);
}

process.exit(result.status ?? 0);
