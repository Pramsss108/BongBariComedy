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

const RUST_PORT = parseInt(process.env.RUST_VERIFIER_PORT ?? '6000', 10);
const RUST_BASE = `http://127.0.0.1:${RUST_PORT}`;
const HETZNER_VPS = process.env.HETZNER_VERIFIER_URL || 'http://78.47.104.43:6000';
const IS_PROD   = process.env.NODE_ENV === 'production';
const BIN_NAME  = process.platform === 'win32' ? 'proxy-verifier.exe' : 'proxy-verifier';

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

  // Poll until the health endpoint responds (max 15s)
  waitForHealth(15_000).then((ok) => {
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
  if (!_available || proxyUrls.length === 0) return null;

  try {
    const res = await fetch(`${RUST_BASE}/verify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ proxies: proxyUrls, timeout_ms: timeoutMs }),
      // Give Rust enough wall-clock time: all proxies * timeout + 10s buffer
      signal:  AbortSignal.timeout(timeoutMs + 15_000),
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
    const hRes = await fetch(`${HETZNER_VPS}/health`, { signal: AbortSignal.timeout(5_000) });
    if (!hRes.ok) return null;

    const res = await fetch(`${HETZNER_VPS}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proxies: proxyUrls, timeout_ms: timeoutMs }),
      signal: AbortSignal.timeout(timeoutMs + 30_000),
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

async function waitForHealth(maxMs: number): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${RUST_BASE}/health`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (res.ok) return true;
    } catch { /* not ready yet */ }
    await sleep(300);
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
