#!/usr/bin/env node
// Cross-platform runner for integration tests.
// Ensures backend is running on :5000, spawns a temporary server if needed,
// waits for readiness, executes vitest, then cleans up.

import { spawn } from 'child_process';
import path from 'path';
import fetch from 'node-fetch';

const API_BASE = process.env.VITE_API_BASE || 'http://localhost:5000';

async function waitForReady(url, tries = 40, delayMs = 1500) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { timeout: 2000 });
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, delayMs));
  }
  return false;
}

async function isUp() {
  try {
    const r = await fetch(`${API_BASE}/api/version`, { timeout: 2000 });
    return r.ok;
  } catch {
    return false;
  }
}

function spawnServer() {
  // Use tsx directly (non-watch) to avoid file change restarts during tests
  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const server = spawn(cmd, ['tsx', 'server/index.ts'], {
    stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, NODE_ENV: 'development', PORT: '5000' },
  });
  server.on('exit', code => {
    console.log(`[test-runner] server process exited with code ${code}`);
  });
  return server;
}

function spawnVitest() {
  // Use shell invocation to avoid Windows spawn EINVAL issues
  const cmd = `npx vitest run tests/api.test.ts`;
  return spawn(cmd, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_API_BASE: API_BASE },
  });
}

(async () => {
  let startedServer = null;
  let alreadyUp = await isUp();
  if (!alreadyUp) {
    console.log('[test-runner] Backend not detected, starting temporary server…');
    startedServer = spawnServer();
    const ready = await waitForReady(`${API_BASE}/api/version`, 40, 1500);
    if (!ready) {
      console.error('[test-runner] Backend failed to become ready. Exiting.');
      try { startedServer && startedServer.kill(); } catch {}
      process.exit(1);
    }
    console.log('[test-runner] Backend ready. Running tests…');
  } else {
    console.log('[test-runner] Backend already running. Running tests…');
  }

  const vitest = spawnVitest();
  vitest.on('exit', (code) => {
    if (startedServer) {
      try { startedServer.kill(); } catch {}
    }
    process.exit(code ?? 1);
  });
})();
