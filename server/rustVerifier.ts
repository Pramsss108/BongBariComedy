/**
 * ============================================================
 * RUST VERIFIER BRIDGE — Node.js ↔ Rust Sidecar
 * ============================================================
 * Spawns the compiled Rust binary as a child process and
 * exposes verifyBatch() which replaces the old 20-at-a-time
 * Node.js chunk loop.
 *
 * Performance gain:
 *   Before (Node):  5000 proxies × 10s ÷ 20 concurrent = ~42 min
 *   After  (Rust):  5000 proxies all concurrent         = ~90 sec
 *
 * Fallback: if the Rust binary isn't found/compiled, silently
 * returns null so proxyScraperService falls back to Node.js.
 * ============================================================
 */

import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import http from 'http';
import { getAllUserAgents, STEALTH_CONFIG } from './stealthEngine';

const RUST_PORT = parseInt(process.env.RUST_VERIFIER_PORT ?? '6100', 10);
const RUST_BASE = `http://127.0.0.1:${RUST_PORT}`;
const HETZNER_VPS = process.env.HETZNER_VERIFIER_URL || 'http://78.47.104.43:6000';
const IS_PROD   = process.env.NODE_ENV === 'production';
const BIN_NAME  = process.platform === 'win32' ? 'proxy-verifier.exe' : 'proxy-verifier';

/**
 * Safe HTTP helper using node:http (bypasses undici port restrictions).
 * Port 6000 is in Node.js/Chromium's restricted port list (X11),
 * so global fetch() fails with "bad port". This helper avoids that.
 */
function httpRequest(
  url: string,
  opts: { method?: string; body?: string; timeoutMs?: number } = {}
): Promise<{ ok: boolean; status: number; json: () => Promise<any>; text: () => Promise<string> }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.pathname + parsed.search,
        method: opts.method || 'GET',
        headers: opts.body
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(opts.body) }
          : undefined,
        timeout: opts.timeoutMs || 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString();
          resolve({
            ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
            status: res.statusCode ?? 0,
            json: () => Promise.resolve(JSON.parse(raw)),
            text: () => Promise.resolve(raw),
          });
        });
      }
    );
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ── P27: Local PC Verifier URL (runtime-configurable) ────────
let _localPcUrl = process.env.LOCAL_PC_VERIFIER_URL || '';

export function getLocalPcUrl(): string { return _localPcUrl; }
export function setLocalPcUrl(url: string): void { _localPcUrl = url; }

// Binary lives under server/rust-verifier/target/{debug|release}/
function getBinPath(): string {
  const root = process.cwd();
  const profile = IS_PROD ? 'release' : 'debug';
  return path.join(root, 'server', 'rust-verifier', 'target', profile, BIN_NAME);
}

let proc: ChildProcess | null = null;
let _available = false;

export function isRustVerifierAvailable(): boolean {
  return _available;
}

/**
 * Spawns the Rust binary. Non-blocking — call once at server startup.
 * If the binary doesn't exist (not compiled yet), this is a no-op.
 */
export function startRustVerifier(): void {
  const binPath = getBinPath();

  if (!existsSync(binPath)) {
    console.log(`[RustVerifier] Binary not found at ${binPath} — running in Node.js-only mode`);
    console.log('[RustVerifier] Run: cd server/rust-verifier && cargo build --release');
    return;
  }

  console.log(`[RustVerifier] 🦀 Spawning Rust verifier: ${binPath}`);
  proc = spawn(binPath, [], {
    env: { ...process.env, RUST_VERIFIER_PORT: String(RUST_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stdout?.on('data', (d: Buffer) => console.log('[RustVerifier]', d.toString().trim()));
  proc.stderr?.on('data', (d: Buffer) => console.error('[RustVerifier]', d.toString().trim()));

  proc.on('exit', (code: number | null) => {
    _available = false;
    if (code !== 0 && code !== null) {
      console.error(`[RustVerifier] ❌ Exited with code ${code}`);
    }
    proc = null;
  });

  // Poll until the health endpoint responds (max 30s for debug binaries)
  waitForHealth(30_000).then((ok) => {
    _available = ok;
    if (ok) {
      console.log(`[RustVerifier] ✅ Ready — unlimited concurrent proxy verification active`);
    } else {
      console.warn('[RustVerifier] ⚠️  Health check timed out — falling back to Node.js verification');
    }
  });
}

/** Shuts down the Rust process gracefully on server exit */
export function stopRustVerifier(): void {
  if (proc) {
    proc.kill('SIGTERM');
    proc = null;
    _available = false;
  }
}

// ── Core: Batch verify via Rust ───────────────────────────────

export interface RustProxyResult {
  url:        string;
  yt:         boolean;
  fb:         boolean;
  ig:         boolean;
  latency_ms: number;
}

export interface RustVerifyResponse {
  results:  Array<RustProxyResult | null>;
  verified: number;
  total:    number;
}

/**
 * Sends the entire proxy list to Rust for concurrent verification.
 * Returns null if Rust is unavailable (caller falls back to Node.js).
 */
export async function callRustVerify(
  proxyUrls: string[],
  timeoutMs: number,
): Promise<RustVerifyResponse | null> {
  if (proxyUrls.length === 0) return null;

  // Re-check health if marked unavailable (may have recovered after timeout)
  if (!_available) {
    const recovered = await waitForHealth(3_000);
    if (!recovered) return null;
    _available = true;
    console.log('[RustVerifier] ✅ Recovered — re-enabled for batch verification');
  }

  try {
    const res = await httpRequest(`${RUST_BASE}/verify`, {
      method:  'POST',
      body:    JSON.stringify({
        proxies: proxyUrls,
        timeout_ms: timeoutMs,
        user_agents: getAllUserAgents(),
        delay_ms: STEALTH_CONFIG.DELAY.baseMs,
      }),
      timeoutMs: Math.max(30_000, Math.ceil(proxyUrls.length / 500) * timeoutMs + 30_000),
    });

    if (!res.ok) {
      console.warn(`[RustVerifier] HTTP ${res.status} from /verify`);
      return null;
    }

    return await res.json() as RustVerifyResponse;
  } catch (err: any) {
    // Rust process may have restarted or is temporarily unavailable
    _available = false;
    console.warn(`[RustVerifier] Batch call failed: ${err.message} — switching to Node.js fallback`);
    return null;
  }
}

// ── Health check ──────────────────────────────────────────────

/**
 * Power Mode: sends batch to Hetzner VPS for remote concurrent verification.
 * The VPS runs the same Rust verifier but from a different network/IP.
 */
export async function callHetznerVerify(
  proxyUrls: string[],
  timeoutMs: number,
): Promise<RustVerifyResponse | null> {
  if (proxyUrls.length === 0) return null;

  try {
    // Health check first
    const hRes = await httpRequest(`${HETZNER_VPS}/health`, { timeoutMs: 5_000 });
    if (!hRes.ok) return null;

    const res = await httpRequest(`${HETZNER_VPS}/verify`, {
      method: 'POST',
      body: JSON.stringify({
        proxies: proxyUrls,
        timeout_ms: timeoutMs,
        user_agents: getAllUserAgents(),
        delay_ms: STEALTH_CONFIG.DELAY.baseMs,
      }),
      timeoutMs: Math.max(60_000, Math.ceil(proxyUrls.length / 500) * timeoutMs + 30_000),
    });

    if (!res.ok) {
      console.warn(`[HetznerVerifier] HTTP ${res.status}`);
      return null;
    }

    const data = await res.json() as RustVerifyResponse;
    console.log(`[HetznerVerifier] ⚡ VPS verified ${data.total} — found ${data.verified}`);
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[HetznerVerifier] VPS unreachable: ${msg} — falling back to local`);
    return null;
  }
}

/**
 * P27: Local PC Verifier — sends batch to the user's local machine running Rust verifier.
 * Configured at runtime via setLocalPcUrl() or env LOCAL_PC_VERIFIER_URL.
 * Enables Power Mode from cloud server → user's home PC (residential IP verification).
 */
export async function callLocalPcVerify(
  proxyUrls: string[],
  timeoutMs: number,
): Promise<RustVerifyResponse | null> {
  if (!_localPcUrl || proxyUrls.length === 0) return null;

  try {
    const hRes = await httpRequest(`${_localPcUrl}/health`, { timeoutMs: 5_000 });
    if (!hRes.ok) return null;

    const res = await httpRequest(`${_localPcUrl}/verify`, {
      method: 'POST',
      body: JSON.stringify({
        proxies: proxyUrls,
        timeout_ms: timeoutMs,
        user_agents: getAllUserAgents(),
        delay_ms: STEALTH_CONFIG.DELAY.baseMs,
      }),
      timeoutMs: Math.max(60_000, Math.ceil(proxyUrls.length / 500) * timeoutMs + 30_000),
    });

    if (!res.ok) {
      console.warn(`[LocalPcVerifier] HTTP ${res.status}`);
      return null;
    }

    const data = await res.json() as RustVerifyResponse;
    console.log(`[LocalPcVerifier] 🏠 Local PC verified ${data.total} — found ${data.verified}`);
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[LocalPcVerifier] Local PC unreachable: ${msg} — falling back`);
    return null;
  }
}

async function waitForHealth(maxMs: number): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const res = await httpRequest(`${RUST_BASE}/health`, { timeoutMs: 2_000 });
      if (res.ok) return true;
    } catch { /* not ready yet */ }
    await sleep(300);
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
