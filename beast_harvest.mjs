#!/usr/bin/env node
/**
 * ============================================================
 * 🦁 BEAST HARVEST — Local Machine Proxy Hunting CLI
 * ============================================================
 * Runs on YOUR PC (residential IP), not on Render/VPS.
 * Verifies via local Rust binary at port 9876 (500+ concurrent).
 *
 * Modes:
 *   --mode=H  → Hunt: scrape 26 OSINT sources from your IP, push raw to cloud queue
 *   --mode=A  → Attack: pull raw queue from cloud, verify locally, push verified back
 *   --mode=B  → Revalidate: pull live pool, re-test all, update cloud
 *   --mode=C  → Combined: B → H → A loop for --duration
 *
 * Usage:
 *   node beast_harvest.mjs --mode=A
 *   node beast_harvest.mjs --mode=C --duration=2h
 *   node beast_harvest.mjs --mode=H --api=http://localhost:5000
 *
 * Requirements:
 *   - Rust verifier compiled: cd server/rust-verifier && cargo build --release
 *   - Then run it: ./server/rust-verifier/target/release/proxy-verifier  (port 9876)
 *   - Or beast auto-spawns it if binary exists
 * ============================================================
 */

import { spawn, execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────
const API_BASE          = getArg('api') || process.env.BEAST_API_BASE || 'https://bongbaricomedy.onrender.com';
const BEAST_SECRET      = process.env.BEAST_MODE_SECRET || 'beastmode'; // must match server default
const RUST_PORT         = parseInt(getArg('rust-port') || '9876', 10);
const RUST_URL          = `http://127.0.0.1:${RUST_PORT}`;
const LOCAL_SERVER_PORT = parseInt(getArg('server-port') || '9877', 10);
const VERIFY_TIMEOUT    = 10_000;
const BATCH_UPLOAD_SIZE = 500;  // Upload to cloud every N verified proxies
const LOCAL_BACKUP      = join(__dirname, 'data', 'proxies_local.json');
const LOCAL_BIN_FILE    = join(__dirname, 'data', 'proxies_bin.json');   // fallback when Redis bin upload fails

// ── OSINT Source Matrix (same 26 + 4 Telegram as server) ──────
const PROXY_REGEX = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{1,5}\b/g;

const MASTER_SOURCES = [
  { url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/socks5/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS5_RAW.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/http/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/ALIILAPRO/Proxy/main/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/MuRongPIG/Proxy-Master/main/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/MuRongPIG/Proxy-Master/main/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/master/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/master/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/vakhov/free-proxy-list/main/proxies/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/vakhov/free-proxy-list/main/proxies/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/caliphdev/Proxy-List/master/http.txt', proto: 'http' },
  { url: 'https://raw.githubusercontent.com/mmpx12/proxy-list/master/socks5.txt', proto: 'socks5' },
  { url: 'https://raw.githubusercontent.com/mmpx12/proxy-list/master/http.txt', proto: 'http' },
  { url: 'https://multiproxy.org/txt_all/proxy.txt', proto: 'http' },
  { url: 'https://rootjazz.com/proxies/proxies.txt', proto: 'http' },
  { url: 'https://proxyspace.pro/http.txt', proto: 'http' },
  { url: 'https://proxyspace.pro/socks5.txt', proto: 'socks5' },
  { url: 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all', proto: 'http' },
  { url: 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=socks5&timeout=10000&country=all', proto: 'socks5' },
];

const TELEGRAM_SOURCES = [
  'https://t.me/s/proxylist_free',
  'https://t.me/s/Proxy_List_Premium',
  'https://t.me/s/socks5_bot',
  'https://t.me/s/freeproxylist_daily',
];

// ── CLI Argument Parser ───────────────────────────────────────
function getArg(name) {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : null;
}

function parseDuration(str) {
  if (!str) return 2 * 60 * 60 * 1000; // default 2h
  const m = str.match(/^(\d+)(h|m|s)?$/);
  if (!m) return 2 * 60 * 60 * 1000;
  const val = parseInt(m[1], 10);
  const unit = m[2] || 'h';
  if (unit === 'h') return val * 60 * 60 * 1000;
  if (unit === 'm') return val * 60 * 1000;
  return val * 1000;
}

// ── Pretty Logging ────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
};

function log(icon, msg) {
  const t = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.log(`${C.dim}[${t}]${C.reset} ${icon} ${msg}`);
}

function banner(text) {
  const line = '═'.repeat(text.length + 4);
  console.log(`\n${C.cyan}╔${line}╗`);
  console.log(`║  ${C.bold}${text}${C.cyan}  ║`);
  console.log(`╚${line}╝${C.reset}\n`);
}

// ── Rust Verifier Management ──────────────────────────────────
let rustProc = null;

async function ensureRustVerifier() {
  // Check if already running
  try {
    const res = await fetch(`${RUST_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      log('🦀', `Rust verifier already running at port ${RUST_PORT}`);
      return true;
    }
  } catch { /* not running */ }

  // Try to auto-spawn
  const isWin = process.platform === 'win32';
  const profile = 'release';
  const binName = isWin ? 'proxy-verifier.exe' : 'proxy-verifier';
  const binPath = join(__dirname, 'server', 'rust-verifier', 'target', profile, binName);

  if (!existsSync(binPath)) {
    // Try debug build
    const debugPath = join(__dirname, 'server', 'rust-verifier', 'target', 'debug', binName);
    if (existsSync(debugPath)) {
      return spawnRust(debugPath);
    }
    log('❌', `Rust binary not found at ${binPath}`);
    log('💡', `Run: cd server/rust-verifier && cargo build --release`);
    return false;
  }

  return spawnRust(binPath);
}

async function spawnRust(binPath) {
  log('🦀', `Spawning Rust verifier: ${binPath} (port ${RUST_PORT})`);
  rustProc = spawn(binPath, [], {
    env: { ...process.env, RUST_VERIFIER_PORT: String(RUST_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  rustProc.stdout.on('data', d => process.stdout.write(`${C.dim}[RUST] ${d}${C.reset}`));
  rustProc.stderr.on('data', d => process.stderr.write(`${C.red}[RUST] ${d}${C.reset}`));
  rustProc.on('exit', code => {
    if (code !== 0 && code !== null) log('❌', `Rust exited with code ${code}`);
    rustProc = null;
  });

  // Wait for health
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const res = await fetch(`${RUST_URL}/health`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        log('✅', 'Rust verifier ready');
        return true;
      }
    } catch { /* keep waiting */ }
  }
  log('❌', 'Rust verifier failed to start within 15s');
  return false;
}

function cleanupRust() {
  if (rustProc) {
    rustProc.kill('SIGTERM');
    rustProc = null;
  }
}

// ── API Helpers ───────────────────────────────────────────────
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'User-Agent': 'BeastHarvest/1.0' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`API GET ${path} → ${res.status}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'BeastHarvest/1.0' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`API POST ${path} → ${res.status}`);
  return res.json();
}

// ── Rust Batch Verify ─────────────────────────────────────────
async function rustVerify(proxyUrls) {
  if (!proxyUrls.length) return [];

  // Health-check before every batch — if Rust crashed, auto-restart and wait
  let healthy = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const h = await fetch(`${RUST_URL}/health`, { signal: AbortSignal.timeout(2000) });
      if (h.ok) { healthy = true; break; }
    } catch { /* not responding */ }
    log('⚠️', `Rust verifier unreachable (attempt ${attempt}/3) — attempting restart...`);
    await ensureRustVerifier();
    await new Promise(r => setTimeout(r, 2000));
  }
  if (!healthy) {
    log('❌', `Rust verifier still down after 3 restart attempts — skipping batch (${proxyUrls.length} proxies marked null)`);
    return proxyUrls.map(() => null);
  }

  try {
    const res = await fetch(`${RUST_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proxies: proxyUrls, timeout_ms: VERIFY_TIMEOUT }),
      signal: AbortSignal.timeout(VERIFY_TIMEOUT + 30_000),
    });
    if (!res.ok) throw new Error(`Rust HTTP ${res.status}`);
    const data = await res.json();
    return data.results; // Array of {url, yt, fb, ig, latency_ms} | null
  } catch (err) {
    log('❌', `Rust verify failed: ${err.message}`);
    return proxyUrls.map(() => null);
  }
}

// ── Cloud Batch Upload ────────────────────────────────────────
async function uploadVerified(entries) {
  if (!entries.length) return;
  try {
    const result = await apiPost('/api/admin/proxy-bulk-import', {
      entries,
      secret: BEAST_SECRET,
    });
    log('☁️', `Cloud sync: +${result.added} new, ${result.skipped} dupes (batch: ${entries.length})`);
  } catch (err) {
    log('❌', `Cloud upload failed: ${err.message}`);
  }
}

// ── Local Backup ──────────────────────────────────────────────
function saveLocalBackup(proxies) {
  try {
    const dir = dirname(LOCAL_BACKUP);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(LOCAL_BACKUP, JSON.stringify(proxies, null, 2));
    log('💾', `Local backup: ${proxies.length} proxies → ${LOCAL_BACKUP}`);
  } catch (err) {
    log('⚠️', `Local backup failed: ${err.message}`);
  }
}

function loadLocalBackup() {
  try {
    if (existsSync(LOCAL_BACKUP)) {
      return JSON.parse(readFileSync(LOCAL_BACKUP, 'utf-8'));
    }
  } catch { /* corrupt */ }
  return [];
}

// ── Local Bin Backup (fallback when Redis bin upload fails) ───
function appendLocalBin(proxyUrls) {
  try {
    const dir = dirname(LOCAL_BIN_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    let existing = [];
    try { if (existsSync(LOCAL_BIN_FILE)) existing = JSON.parse(readFileSync(LOCAL_BIN_FILE, 'utf-8')); } catch { /* corrupt */ }
    const merged = [...new Set([...existing, ...proxyUrls])];
    writeFileSync(LOCAL_BIN_FILE, JSON.stringify(merged));
    return merged.length;
  } catch (err) {
    log('⚠️', `Local bin backup write failed: ${err.message}`);
    return 0;
  }
}

function loadLocalBin() {
  try { if (existsSync(LOCAL_BIN_FILE)) return JSON.parse(readFileSync(LOCAL_BIN_FILE, 'utf-8')); } catch { /* corrupt */ }
  return [];
}

function clearLocalBin() {
  try { if (existsSync(LOCAL_BIN_FILE)) writeFileSync(LOCAL_BIN_FILE, '[]'); } catch { /* */ }
}

// ── Utility ───────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatNum(n) { return n.toLocaleString(); }

function elapsed(startMs) {
  const s = Math.floor((Date.now() - startMs) / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// ══════════════════════════════════════════════════════════════
// MODE H — LOCAL HUNT (Scrape from residential IP)
// ══════════════════════════════════════════════════════════════
async function modeH() {
  banner('MODE H — LOCAL HUNT (Residential IP Scrape)');
  const startTime = Date.now();

  // Step 1: Scrape all 26 OSINT sources + Telegram
  log('🔍', `Scraping ${MASTER_SOURCES.length} OSINT + ${TELEGRAM_SOURCES.length} Telegram sources...`);

  const allProxies = new Set();

  // Fetch OSINT sources (parallel batches of 10)
  for (let i = 0; i < MASTER_SOURCES.length; i += 10) {
    const batch = MASTER_SOURCES.slice(i, i + 10);
    const results = await Promise.allSettled(
      batch.map(async (src) => {
        try {
          const res = await fetch(src.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(12_000),
          });
          if (!res.ok) return [];
          const text = await res.text();
          const matches = text.match(PROXY_REGEX) || [];
          return matches.map(m => `${src.proto}://${m}`);
        } catch { return []; }
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') r.value.forEach(p => allProxies.add(p));
    }
  }

  // Fetch Telegram (parallel)
  const teleResults = await Promise.allSettled(
    TELEGRAM_SOURCES.map(async (url) => {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) return [];
        const html = await res.text();
        const matches = html.match(PROXY_REGEX) || [];
        const proxies = [];
        for (const m of matches) {
          proxies.push(`http://${m}`, `socks5://${m}`);
        }
        return proxies;
      } catch { return []; }
    })
  );
  for (const r of teleResults) {
    if (r.status === 'fulfilled') r.value.forEach(p => allProxies.add(p));
  }

  log('✅', `Mined ${C.bold}${formatNum(allProxies.size)}${C.reset} unique raw candidates in ${elapsed(startTime)}`);

  // Step 2: Dedup against existing cloud pool
  let existingUrls = new Set();
  try {
    const liveData = await apiGet(`/api/admin/proxy-download-live?secret=${encodeURIComponent(BEAST_SECRET)}`);
    const liveProxies = Array.isArray(liveData) ? liveData : [];
    existingUrls = new Set(liveProxies.map(p => p.url));
    log('📊', `Cloud pool: ${formatNum(existingUrls.size)} existing proxies`);
  } catch (err) {
    log('⚠️', `Could not fetch cloud pool for dedup: ${err.message}`);
  }

  const newOnly = Array.from(allProxies).filter(p => !existingUrls.has(p));
  log('🆕', `After dedup: ${formatNum(newOnly.length)} NEW candidates (${formatNum(allProxies.size - newOnly.length)} already known)`);

  // Step 3: Push to cloud raw queue
  if (newOnly.length > 0) {
    // Push in batches of 10K to avoid payload limits
    let totalPushed = 0;
    for (let i = 0; i < newOnly.length; i += 10_000) {
      const batch = newOnly.slice(i, i + 10_000);
      let pushed = false;
      for (let retry = 0; retry < 4; retry++) {
        try {
          await apiPost('/api/admin/proxy-bulk-raw-queue', { proxies: batch, secret: BEAST_SECRET });
          totalPushed += batch.length;
          pushed = true;
          break;
        } catch (err) {
          if (retry < 3) {
            log('⚠️', `Raw queue push attempt ${retry + 1}/4 failed: ${err.message} — retrying in ${(retry + 1) * 3}s`);
            await sleep((retry + 1) * 3_000);
          } else {
            log('❌', `Raw queue push failed after 4 attempts — saving ${batch.length} to local raw file for recovery`);
            appendLocalBin(batch); // reuse bin file — RESCUE will push these back to raw queue
          }
        }
      }
      if (!pushed) log('💾', `${batch.length} Hunt candidates saved locally — click RESCUE to push to cloud next session`);
    }
    log('☁️', `Pushed ${formatNum(totalPushed)} raw candidates to cloud queue`);
  }

  log('🏁', `Mode H complete. ${formatNum(newOnly.length)} new candidates queued. (${elapsed(startTime)})`);
  return { mined: allProxies.size, newPushed: newOnly.length };
}

// ══════════════════════════════════════════════════════════════
// MODE A — ATTACK (Validate Raw Queue)
// ══════════════════════════════════════════════════════════════
async function modeA(uiLog = null) {
  const ui = (type, msg) => { if (uiLog) uiLog(type, msg).catch(()=>{}); };
  banner('MODE A — ATTACK (Validate Raw Queue via Local Rust)');
  const startTime = Date.now();

  // ── ALWAYS ensure Rust verifier is running before starting ──
  log('🦀', 'Checking Rust verifier...');
  const rustOk = await ensureRustVerifier();
  if (!rustOk) {
    const errMsg = 'ATTACK ABORTED — Rust verifier failed to start. Run: cd server/rust-verifier && cargo build --release';
    log('❌', errMsg);
    ui('error', '❌ ' + errMsg);
    return { tested: 0, verified: 0 };
  }
  ui('init', '🦀 Rust verifier online — pulling raw queue...');

  // Step 1: Pull raw candidates from cloud (smart endpoint: memory + redis)
  log('📥', 'Pulling raw candidate queue from cloud...');
  let rawQueue = [];
  let totalPulled = 0;

  // Pull in batches of 10K until nothing left
  try {
    while (true) {
      let pulled = [];
      // Try new smart endpoint first (drains memory buffer + redis)
      try {
        const pullData = await apiPost('/api/admin/proxy-pull-raw', { count: 10_000, secret: BEAST_SECRET });
        pulled = pullData.proxies || [];
        if (pulled.length > 0) {
          rawQueue.push(...pulled);
          totalPulled += pulled.length;
          log('📦', `Pulled ${formatNum(pulled.length)} candidates (${formatNum(pullData.rawRemaining || 0)} remaining)`);
        }
        if (pulled.length === 0) break;
      } catch {
        // Fallback to legacy pop endpoint
        try {
          const popData = await apiPost('/api/admin/proxy-pop-queue', { count: 10_000, secret: BEAST_SECRET });
          pulled = popData.proxies || [];
          if (pulled.length > 0) {
            rawQueue.push(...pulled);
            totalPulled += pulled.length;
            log('📦', `Pulled ${formatNum(pulled.length)} (legacy pop)`);
          }
          if (pulled.length === 0) break;
        } catch {
          break;
        }
      }
    }
    if (totalPulled > 0) {
      log('✅', `Total pulled: ${formatNum(totalPulled)} raw candidates from cloud`);
    } else {
      log('⚠️', 'Cloud queue empty — performing fresh local scrape first');
      await modeH();
      // Try pulling again after local hunt pushed to queue
      try {
        const pullData = await apiPost('/api/admin/proxy-pull-raw', { count: 50_000, secret: BEAST_SECRET });
        rawQueue = pullData.proxies || [];
      } catch { /* proceed with what we have */ }
    }
  } catch (err) {
    log('⚠️', `Queue pull failed: ${err.message} — performing fresh local scrape`);
    await modeH();
  }

  if (rawQueue.length === 0) {
    log('🔍', 'No raw queue data. Scraping fresh from local IP...');
    // Do a local scrape and verify immediately instead of queuing
    const allProxies = new Set();
    const results = await Promise.allSettled(
      MASTER_SOURCES.map(async (src) => {
        try {
          const res = await fetch(src.url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(12_000),
          });
          if (!res.ok) return [];
          const text = await res.text();
          return (text.match(PROXY_REGEX) || []).map(m => `${src.proto}://${m}`);
        } catch { return []; }
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') r.value.forEach(p => allProxies.add(p));
    }
    rawQueue = Array.from(allProxies);
    log('🔍', `Scraped ${formatNum(rawQueue.length)} candidates locally`);
  }

  log('📊', `Total candidates to verify: ${C.bold}${formatNum(rawQueue.length)}${C.reset}`);

  // Step 2: Verify via local Rust in batches
  let verified = 0;
  let binnedBatch = 0;
  let uploadBuffer = [];
  let binBuffer = [];
  const allVerified = [];
  const RUST_BATCH = 500; // 500 proxies per Rust call — with 150 concurrent = ~35s per batch, UI updates every ~35s

  log('🚀', `VERIFICATION STARTING — ${formatNum(rawQueue.length)} candidates | batch size 500 | ~${Math.ceil(rawQueue.length/500)} batches | ETA ~${Math.ceil(rawQueue.length/150/60)}min`);
  ui('init', `🚀 VERIFICATION STARTED — ${formatNum(rawQueue.length)} candidates queued`);

  for (let i = 0; i < rawQueue.length; i += RUST_BATCH) {
    const batch = rawQueue.slice(i, i + RUST_BATCH);
    const batchNum = Math.floor(i / RUST_BATCH) + 1;
    const totalBatches = Math.ceil(rawQueue.length / RUST_BATCH);

    log('🦀', `Verifying batch ${batchNum}/${totalBatches} (${batch.length} proxies)...`);
    const results = await rustVerify(batch);

    let binnedThisBatch = 0;
    for (let j = 0; j < batch.length; j++) {
      const r = results[j];
      if (r && (r.yt || r.fb || r.ig)) {
        verified++;
        const entry = {
          url: r.url || batch[j],
          platforms: { yt: r.yt, fb: r.fb, ig: r.ig, latencyMs: r.latency_ms, failCount: 0 },
        };
        allVerified.push(entry);
        uploadBuffer.push(entry);

        // Batch upload every BATCH_UPLOAD_SIZE
        if (uploadBuffer.length >= BATCH_UPLOAD_SIZE) {
          await uploadVerified(uploadBuffer);
          uploadBuffer = [];
        }
      } else {
        // Failed → purge to bin (24h auto-delete)
        binBuffer.push(batch[j]);
        binnedThisBatch++;
        if (binBuffer.length >= 1000) {
          await sendToBin(binBuffer);
          binBuffer = [];
        }
      }
    }

    const pct = Math.round(((i + batch.length) / rawQueue.length) * 100);
    log('📊', `Progress: ${pct}% | ✅ ${C.green}${verified}${C.reset} verified | 🗑️ ${binnedBatch += binnedThisBatch} binned / ${formatNum(i + batch.length)} total`);
    if (batchNum % 20 === 0 || pct % 10 === 0) {
      ui('init', `🦀 VERIFY ${pct}% — ✅ ${verified} verified | 🗑️ ${binnedBatch} binned | ${formatNum(i + batch.length)}/${formatNum(rawQueue.length)}`);
    }
  }

  // Flush remaining buffers
  if (uploadBuffer.length > 0) await uploadVerified(uploadBuffer);
  if (binBuffer.length > 0) await sendToBin(binBuffer);

  // Save local backup
  saveLocalBackup(allVerified);

  log('🏁', `Mode A complete. ${C.bold}${C.green}+${verified}${C.reset} verified, ${C.red}${binnedBatch}${C.reset} binned (24h purge), from ${formatNum(rawQueue.length)} candidates. (${elapsed(startTime)})`);
  return { tested: rawQueue.length, verified, binned: binnedBatch };
}

// ══════════════════════════════════════════════════════════════
// MODE BOOST — CLOUD VERIFICATION BOOST
// Pull ALL cloud raw queue → verify locally via Rust → verified → pool, bad → bin (24h auto-delete)
// Network-resilient: retries uploads on drop, never loses already-pulled data
// ══════════════════════════════════════════════════════════════

// Retry wrapper for upload calls — survives DNS restart / short network drops
async function apiPostWithRetry(path, body, maxRetries = 5, label = '') {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiPost(path, body);
    } catch (err) {
      lastErr = err;
      const wait = attempt * 3_000; // 3s, 6s, 9s, 12s, 15s
      log('🔁', `${label} Upload attempt ${attempt}/${maxRetries} failed: ${err.message} — retrying in ${wait/1000}s...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  log('❌', `${label} All ${maxRetries} upload attempts failed: ${lastErr.message}`);
  throw lastErr;
}

async function modeBoost(uiLog = null) {
  const ui = (type, msg) => { log(type === 'success' ? '✅' : type === 'error' ? '❌' : '📊', msg); if (uiLog) uiLog(type, msg).catch(()=>{}); };
  banner('CLOUD VERIFICATION BOOST — Drain ALL cloud raw via local Rust');
  const startTime = Date.now();

  // ── ALWAYS ensure Rust verifier is running before starting ──
  log('🦀', 'Checking Rust verifier...');
  const rustOk = await ensureRustVerifier();
  if (!rustOk) {
    log('❌', 'BOOST ABORTED — Rust verifier failed to start (compile: cd server/rust-verifier && cargo build --release)');
    return { tested: 0, verified: 0, binned: 0 };
  }
  log('✅', 'Rust verifier confirmed online — starting boost');

  // ── Step 1: Pull ALL raw from cloud (exhaustive drain — keep pulling until empty)
  // NOTE: pulled data lives in rawQueue in local RAM — safe even if cloud goes dark afterward
  log('🚀', 'BOOST: Pulling ALL cloud raw queue to local memory...');
  const rawQueue = [];
  let totalPulled = 0;

  let emptyStreak = 0;
  while (emptyStreak < 2) { // 2 consecutive empty pulls = truly empty
    let pulled = [];
    try {
      const pullData = await apiPost('/api/admin/proxy-pull-raw', { count: 10_000, secret: BEAST_SECRET });
      pulled = pullData.proxies || [];
      if (pulled.length > 0) {
        rawQueue.push(...pulled);
        totalPulled += pulled.length;
        emptyStreak = 0;
        log('📦', `Pulled ${formatNum(pulled.length)} | Local queue: ${formatNum(rawQueue.length)} | Cloud remaining: ${formatNum(pullData.rawRemaining || 0)}`);
      } else {
        emptyStreak++;
        if (emptyStreak < 2) { await new Promise(r => setTimeout(r, 1000)); } // wait 1s before confirming empty
      }
    } catch (err) {
      // Network hiccup during pull — retry up to 3 times then continue with what we have
      log('⚠️', `Pull attempt failed: ${err.message} — retrying once...`);
      await new Promise(r => setTimeout(r, 3000));
      try {
        const popData = await apiPost('/api/admin/proxy-pop-queue', { count: 10_000, secret: BEAST_SECRET });
        pulled = popData.proxies || [];
        if (pulled.length > 0) { rawQueue.push(...pulled); totalPulled += pulled.length; emptyStreak = 0; }
        else { emptyStreak++; }
      } catch {
        log('⚠️', 'Both pull endpoints unreachable — proceeding with what was already pulled');
        break;
      }
    }
  }

  if (rawQueue.length === 0) {
    log('✅', 'Cloud raw queue is already empty — nothing to boost!');
    return { tested: 0, verified: 0, binned: 0 };
  }

  log('📊', `BOOST: Pulled ${C.bold}${C.green}${formatNum(rawQueue.length)}${C.reset} total raw candidates to local memory — cloud can go offline now, data is safe`);

  // ── Step 2: Verify via local Rust in batches (no network needed during this step)
  // All verification is local. Network only needed when uploading results.
  let verified = 0;
  let binned = 0;
  let uploadBuffer = [];
  let binBuffer = [];
  let localBinFallback = [];  // accumulate here when cloud bin upload fails
  const allVerified = [];
  const RUST_BATCH = 500;
  const BIN_FLUSH_SIZE = 1000;

  log('🚀', `BOOST VERIFICATION STARTING — ${formatNum(rawQueue.length)} candidates | batch size 500 | ~${Math.ceil(rawQueue.length/500)} batches | ETA ~${Math.ceil(rawQueue.length/150/60)}min`);
  ui('init', `🚀 BOOST STARTED — ${formatNum(rawQueue.length)} candidates | ETA ~${Math.ceil(rawQueue.length/150/60)}min`);

  for (let i = 0; i < rawQueue.length; i += RUST_BATCH) {
    const batch = rawQueue.slice(i, i + RUST_BATCH);
    const batchNum = Math.floor(i / RUST_BATCH) + 1;
    const totalBatches = Math.ceil(rawQueue.length / RUST_BATCH);

    log('🦀', `BOOST: Rust batch ${batchNum}/${totalBatches} — ${batch.length} proxies (150 concurrent)...`);
    const results = await rustVerify(batch);

    for (let j = 0; j < batch.length; j++) {
      const r = results[j];
      if (r && (r.yt || r.fb || r.ig)) {
        verified++;
        const entry = {
          url: r.url || batch[j],
          platforms: { yt: r.yt, fb: r.fb, ig: r.ig, latencyMs: r.latency_ms, failCount: 0 },
        };
        allVerified.push(entry);
        uploadBuffer.push(entry);

        // Upload verified batch — with retry on network drop  
        if (uploadBuffer.length >= BATCH_UPLOAD_SIZE) {
          try {
            await apiPostWithRetry('/api/admin/proxy-bulk-import', { entries: uploadBuffer, secret: BEAST_SECRET }, 5, '[BOOST verified]');
            log('☁️', `Cloud pool +${uploadBuffer.length} verified (total verified: ${verified})`);
          } catch { log('⚠️', `Verified upload dropped after all retries — keeping in final flush`); }
          uploadBuffer = [];
        }
      } else {
        // Failed verification → bin (24h auto-delete)
        binned++;
        binBuffer.push(batch[j]);
        if (binBuffer.length >= BIN_FLUSH_SIZE) {
          try {
            await apiPostWithRetry('/api/admin/proxy-bulk-bin', { proxies: binBuffer, secret: BEAST_SECRET }, 3, '[BOOST bin]');
          } catch (e) {
            log('⚠️', `BIN cloud upload failed: ${e.message} — saving ${binBuffer.length} to local bin file`);
            localBinFallback.push(...binBuffer);
          }
          binBuffer = [];
        }
      }
    }

    const pct = Math.round(((i + batch.length) / rawQueue.length) * 100);
    log('📊', `BOOST: ${pct}% done | ✅ ${C.green}${verified}${C.reset} to pool | 🗑️ ${binned} to bin | ${formatNum(i + batch.length)} total processed`);
    // UI progress update every 10% or every 20 batches
    if (batchNum % 20 === 0 || pct % 10 === 0) {
      if (uiLog) uiLog('init', `🦀 VERIFYING ${pct}% — ✅ ${verified} verified | 🗑️ ${binned} binned | ${formatNum(i + batch.length)}/${formatNum(rawQueue.length)} checked`).catch(()=>{});
    }
  }

  // ── Step 3: Final flush — retry aggressively (most important data)
  log('☁️', `BOOST: Final flush — ${uploadBuffer.length} verified left to upload, ${binBuffer.length} to bin...`);
  if (uploadBuffer.length > 0) {
    try {
      await apiPostWithRetry('/api/admin/proxy-bulk-import', { entries: uploadBuffer, secret: BEAST_SECRET }, 8, '[BOOST final-verified]');
      log('✅', `Final flush: +${uploadBuffer.length} verified uploaded to cloud pool`);
    } catch (err) {
      log('❌', `Final verified upload failed permanently: ${err.message} — saving to local backup`);
    }
  }
  if (binBuffer.length > 0) {
    try {
      await apiPostWithRetry('/api/admin/proxy-bulk-bin', { proxies: binBuffer, secret: BEAST_SECRET }, 4, '[BOOST final-bin]');
    } catch (e) {
      log('⚠️', `Final BIN cloud upload failed: ${e.message} — saving ${binBuffer.length} to local bin file`);
      localBinFallback.push(...binBuffer);
    }
  }

  // If any bin uploads failed → save to local bin file so RESCUE can recover them
  if (localBinFallback.length > 0) {
    const saved = appendLocalBin(localBinFallback);
    log('💾', `LOCAL BIN BACKUP: ${saved.toLocaleString()} proxies saved to ${LOCAL_BIN_FILE} — click RESCUE to retry`);
  }

  saveLocalBackup(allVerified);

  const elapsed_s = Math.round((Date.now() - startTime) / 1000);
  const passRate = rawQueue.length > 0 ? ((verified / rawQueue.length) * 100).toFixed(3) : '0';
  log('🏁', `BOOST COMPLETE in ${elapsed_s}s: ${C.bold}${C.green}+${verified}${C.reset} to cloud pool (${passRate}% pass rate), ${binned} to bin, from ${formatNum(rawQueue.length)} raw.`);
  if (verified === 0) log('ℹ️', `Pass rate 0% is normal for public OSINT scrapes — most proxies from GitHub/Telegram lists are dead. Click RESCUE if bin backup exists, or run HUNT again.`);
  return { tested: rawQueue.length, verified, binned };
}

// Send failed proxies to BIN in bulk (24h auto-delete via cloud cron)
async function sendToBin(proxyUrls) {
  if (!proxyUrls.length) return;
  try {
    await apiPost('/api/admin/proxy-bulk-bin', { proxies: proxyUrls, secret: BEAST_SECRET });
    log('🗑️', `Sent ${proxyUrls.length} failed proxies to BIN (auto-purge in 24h)`);
  } catch (err) {
    log('⚠️', `BIN upload failed: ${err.message} — saving ${proxyUrls.length} to local bin file (RESCUE recoverable)`);
    appendLocalBin(proxyUrls);
  }
}

// ══════════════════════════════════════════════════════════════
// MODE B — REVALIDATE (Re-test Live Pool)
// ══════════════════════════════════════════════════════════════
async function modeB() {
  banner('MODE B — REVALIDATE (Re-test Entire Live Pool)');
  const startTime = Date.now();

  // Step 1: Pull full live pool from cloud
  log('📥', 'Pulling live pool from cloud...');
  let livePool = [];
  try {
    const data = await apiGet(`/api/admin/proxy-download-live?secret=${encodeURIComponent(BEAST_SECRET)}`);
    livePool = Array.isArray(data) ? data : [];
  } catch (err) {
    log('❌', `Failed to pull live pool: ${err.message}`);
    return { tested: 0, kept: 0, purged: 0 };
  }

  if (livePool.length === 0) {
    log('⚠️', 'Live pool is empty — nothing to revalidate');
    return { tested: 0, kept: 0, purged: 0 };
  }

  log('📊', `Revalidating ${C.bold}${formatNum(livePool.length)}${C.reset} live proxies...`);

  // Step 2: Verify all via local Rust
  const proxyUrls = livePool.map(p => p.url);
  const RUST_BATCH = 500;
  let kept = 0, purged = 0;
  let uploadBuffer = [];
  const allKept = [];

  log('🚀', `REVALIDATION STARTING — ${formatNum(proxyUrls.length)} live proxies | batch size 500 | ETA ~${Math.ceil(proxyUrls.length/150/60)}min`);

  for (let i = 0; i < proxyUrls.length; i += RUST_BATCH) {
    const batch = proxyUrls.slice(i, i + RUST_BATCH);
    const batchNum = Math.floor(i / RUST_BATCH) + 1;
    const totalBatches = Math.ceil(proxyUrls.length / RUST_BATCH);

    log('🦀', `Re-testing batch ${batchNum}/${totalBatches} (${batch.length} proxies)...`);
    const results = await rustVerify(batch);

    for (let j = 0; j < batch.length; j++) {
      const r = results[j];
      const original = livePool[i + j];

      if (r && (r.yt || r.fb || r.ig)) {
        // Alive — update with fresh data, reset failCount
        kept++;
        const entry = {
          url: r.url || batch[j],
          platforms: {
            yt: r.yt, fb: r.fb, ig: r.ig,
            latencyMs: r.latency_ms,
            failCount: 0,
            country: original?.platforms?.country || 'XX',
          },
        };
        allKept.push(entry);
        uploadBuffer.push(entry);
      } else {
        // Dead — will increment failCount on cloud (banProxy handles it)
        purged++;
      }

      if (uploadBuffer.length >= BATCH_UPLOAD_SIZE) {
        await uploadVerified(uploadBuffer);
        uploadBuffer = [];
      }
    }

    const pct = Math.round(((i + batch.length) / proxyUrls.length) * 100);
    log('📊', `Progress: ${pct}% | ${C.green}Kept: ${kept}${C.reset} | ${C.red}Dead: ${purged}${C.reset}`);
  }

  // Flush remaining
  if (uploadBuffer.length > 0) await uploadVerified(uploadBuffer);

  // Save local backup
  saveLocalBackup(allKept);

  log('🏁', `Mode B complete. ${C.green}Kept: ${kept}${C.reset} | ${C.red}Dead: ${purged}${C.reset} / ${formatNum(livePool.length)}. (${elapsed(startTime)})`);
  return { tested: livePool.length, kept, purged };
}

// ══════════════════════════════════════════════════════════════
// MODE C — COMBINED (Full Blast Loop)
// ══════════════════════════════════════════════════════════════
async function modeC(durationMs) {
  banner(`MODE C — FULL BLAST (Loop for ${Math.round(durationMs / 60_000)}min)`);
  const deadline = Date.now() + durationMs;
  let cycle = 0;
  const totals = { revalidated: 0, hunted: 0, verified: 0 };

  while (Date.now() < deadline) {
    cycle++;
    log('🔄', `${C.bold}Cycle ${cycle}${C.reset} — ${Math.round((deadline - Date.now()) / 60_000)}min remaining`);

    // Step 1: Revalidate existing pool (B)
    log('🔄', 'Step 1/3: Revalidate...');
    const bResult = await modeB();
    totals.revalidated += bResult.tested;

    if (Date.now() >= deadline) break;

    // Step 2: Fresh hunt from residential IP (H)
    log('🔍', 'Step 2/3: Hunt...');
    const hResult = await modeH();
    totals.hunted += hResult.mined;

    if (Date.now() >= deadline) break;

    // Step 3: Verify the fresh queue (A)
    log('⚔️', 'Step 3/3: Attack...');
    const aResult = await modeA();
    totals.verified += aResult.verified;

    log('📊', `Cycle ${cycle} done. Revalidated: ${bResult.kept}, Hunted: ${hResult.mined}, Verified: ${aResult.verified}`);
  }

  log('🏁', `${C.bold}Mode C complete${C.reset}. ${cycle} cycles. Revalidated: ${totals.revalidated}, Hunted: ${totals.hunted}, New verified: ${totals.verified}`);
}

// ══════════════════════════════════════════════════════════════
// MODE SERVER — Local Beast HTTP Bridge
// Starts a small HTTP server so the Mission Control UI can
// trigger local hunts/verification on this residential-IP machine.
//
// Usage: node beast_harvest.mjs --mode=server [--server-port=9877]
//   1. Registers this machine's LAN IP with the cloud API.
//   2. Cloud LAUNCH HUNT button routes to this machine instead of Render.
//   3. All verified proxies still sync to the same cloud Redis DB.
//   4. Ctrl+C deregisters the machine from cloud.
// ══════════════════════════════════════════════════════════════
async function modeServer() {
  banner(`MODE SERVER — Local Beast HTTP Bridge (Port ${LOCAL_SERVER_PORT})`);
  const { createServer } = await import('node:http');
  const { networkInterfaces } = await import('node:os');

  function getLocalIp() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
    return '127.0.0.1';
  }

  const localIp = getLocalIp();
  const serverUrl = `http://${localIp}:${LOCAL_SERVER_PORT}`;

  let currentMode = null;
  let currentProgress = {};

  async function pushSyncLog(type, msg) {
    try { await apiPost('/api/admin/proxy-local-sync-log', { msg, type }); }
    catch { /* cloud offline */ }
  }

  async function register() {
    try {
      await apiPost('/api/admin/proxy-local-pc', { url: serverUrl });
      log('🏠', `✅ Registered with cloud: ${serverUrl}`);
    } catch (e) {
      log('⚠️', `Cloud registration failed: ${e.message} — will retry every 25s`);
    }
  }

  await register();

  const server = createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    if (req.method === 'GET' && req.url === '/status') {
      res.end(JSON.stringify({ online: true, currentMode, progress: currentProgress }));

    } else if (req.method === 'POST' && req.url === '/hunt') {
      if (currentMode) {
        res.end(JSON.stringify({ ok: false, msg: `Already running mode ${currentMode}` }));
        return;
      }
      res.end(JSON.stringify({ ok: true, msg: 'Hunt started on local machine (residential IP)' }));
      currentMode = 'H';
      pushSyncLog('init', '🔥 LOCAL HUNT STARTED — Scraping 30 OSINT sources from residential IP');
      modeH().then(r => {
        currentMode = null; currentProgress = r;
        pushSyncLog('success', `✅ LOCAL HUNT DONE — Mined: ${(r.mined || 0).toLocaleString()}, New pushed to queue: ${(r.newPushed || 0).toLocaleString()}`);
      }).catch(e => {
        currentMode = null;
        pushSyncLog('error', `❌ Local hunt error: ${e.message}`);
      });

    } else if (req.method === 'POST' && req.url === '/attack') {
      if (currentMode) {
        res.end(JSON.stringify({ ok: false, msg: `Already running mode ${currentMode}` }));
        return;
      }
      res.end(JSON.stringify({ ok: true, msg: 'Attack started — verifying queue via local Rust' }));
      currentMode = 'A';
      pushSyncLog('init', '⚔️ LOCAL ATTACK STARTED — Verifying raw queue via local Rust (500 concurrent)');
      modeA(pushSyncLog).then(r => {
        currentMode = null; currentProgress = r;
        pushSyncLog('success', `✅ LOCAL ATTACK DONE — Tested: ${(r.tested || 0).toLocaleString()}, Verified: +${r.verified || 0}, Binned: ${r.binned || 0}`);
      }).catch(e => {
        currentMode = null;
        pushSyncLog('error', `❌ Local attack error: ${e.message}`);
      });

    } else if (req.method === 'POST' && req.url === '/revalidate') {
      if (currentMode) {
        res.end(JSON.stringify({ ok: false, msg: `Already running mode ${currentMode}` }));
        return;
      }
      res.end(JSON.stringify({ ok: true, msg: 'Revalidation started — re-testing entire live pool' }));
      currentMode = 'B';
      pushSyncLog('init', '🔄 LOCAL REVALIDATE STARTED — Re-testing entire live pool locally');
      modeB().then(r => {
        currentMode = null; currentProgress = r;
        pushSyncLog('success', `✅ LOCAL REVAL DONE — Kept: ${r.kept || 0}, Purged: ${r.purged || 0}`);
      }).catch(e => {
        currentMode = null;
        pushSyncLog('error', `❌ Local reval error: ${e.message}`);
      });

    } else if (req.method === 'POST' && req.url === '/boost') {
      if (currentMode) {
        res.end(JSON.stringify({ ok: false, msg: `Already running mode ${currentMode}` }));
        return;
      }
      res.end(JSON.stringify({ ok: true, msg: 'CLOUD BOOST started — draining ALL cloud raw queue via local Rust' }));
      currentMode = 'BOOST';
      pushSyncLog('init', '🚀 CLOUD VERIFICATION BOOST — Pulling ALL cloud raw → local verify → pool/bin');
      modeBoost(pushSyncLog).then(r => {
        currentMode = null; currentProgress = r;
        pushSyncLog('success', `🚀 BOOST DONE — Tested: ${(r.tested || 0).toLocaleString()}, Verified: +${r.verified || 0}, Binned: ${r.binned || 0}`);
      }).catch(e => {
        currentMode = null;
        pushSyncLog('error', `❌ Boost error: ${e.message}`);
      });

    } else if (req.method === 'POST' && req.url === '/rescue') {
      // Rescue proxies accidentally binned when Rust was offline → move bin → raw queue
      res.end(JSON.stringify({ ok: true, msg: 'Rescuing bin → raw queue...' }));
      pushSyncLog('init', '🚑 RESCUE STARTED — Checking cloud Redis bin + local bin file backup...');
      let cloudRescued = 0, localRescued = 0;
      // Step 1: Try cloud Redis bin
      try {
        const r = await apiPost('/api/admin/proxy-rescue-bin', { secret: BEAST_SECRET });
        cloudRescued = r.rescued || 0;
        if (cloudRescued > 0) pushSyncLog('success', `🚑 Cloud BIN: ${cloudRescued.toLocaleString()} proxies moved → raw queue`);
      } catch (e) {
        pushSyncLog('error', `❌ Cloud rescue failed: ${e.message}`);
      }
      // Step 2: Check local bin backup file
      const localBin = loadLocalBin();
      if (localBin.length > 0) {
        pushSyncLog('init', `🚑 LOCAL BIN: Found ${localBin.length.toLocaleString()} proxies in local backup — pushing to cloud raw queue...`);
        // Push in chunks of 5000 to avoid request size limits
        const CHUNK = 5000;
        for (let i = 0; i < localBin.length; i += CHUNK) {
          const chunk = localBin.slice(i, i + CHUNK);
          try {
            await apiPost('/api/admin/proxy-bulk-raw-queue', { proxies: chunk, secret: BEAST_SECRET });
            localRescued += chunk.length;
          } catch (e) {
            pushSyncLog('error', `❌ Local bin push chunk failed: ${e.message}`);
          }
        }
        if (localRescued > 0) {
          clearLocalBin();
          pushSyncLog('success', `🚑 LOCAL BIN: Pushed ${localRescued.toLocaleString()} proxies to cloud raw queue`);
        }
      }
      const total = cloudRescued + localRescued;
      pushSyncLog('success', `🚑 RESCUE DONE — ${total.toLocaleString()} total proxies moved → raw queue. ${total > 0 ? 'Click BOOST to re-verify!' : 'No bin data found — run HUNT first then BOOST.'}`);

    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ ok: false, msg: 'Unknown endpoint' }));
    }
  });

  server.listen(LOCAL_SERVER_PORT, '0.0.0.0', () => {
    log('✅', `Local Beast server LIVE on ${serverUrl}`);
    log('💡', 'Cloud LAUNCH HUNT button now routes to THIS machine (residential IP)');
    log('💡', 'Dedup: local hunts auto-skip proxies already in cloud pool');
    log('💡', 'All verified proxies sync to cloud Redis DB');
    log('💡', 'Press Ctrl+C to stop and deregister from cloud');
  });
  await pushSyncLog('init', `🏠 LOCAL BEAST SERVER ONLINE — ${serverUrl} — Ready for cloud commands`);

  // Heartbeat: re-register every 25s so cloud always knows we're alive
  const heartbeat = setInterval(async () => {
    try { await apiPost('/api/admin/proxy-local-pc', { url: serverUrl }); }
    catch { /* cloud offline */ }
  }, 25_000);

  // On shutdown: deregister from cloud so LAUNCH HUNT falls back to cloud mode
  process.removeAllListeners('SIGINT');
  process.on('SIGINT', async () => {
    clearInterval(heartbeat);
    log('🛑', 'Shutting down — deregistering from cloud...');
    await pushSyncLog('error', '🛑 LOCAL BEAST SERVER OFFLINE — Cloud reverting to standard mode');
    try { await apiPost('/api/admin/proxy-local-pc', { url: '' }); } catch { /* */ }
    cleanupRust();
    server.close(() => {
      log('✅', 'Local Beast server stopped.');
      process.exit(0);
    });
  });

  // Keep process alive
  await new Promise(() => {});
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
async function main() {
  const mode = (getArg('mode') || 'A').toUpperCase();
  const duration = parseDuration(getArg('duration'));

  console.log(`
${C.magenta}${C.bold}  ╔══════════════════════════════════════════╗
  ║   🦁  B E A S T   H A R V E S T  🦁    ║
  ║   Local Machine Proxy Hunting CLI        ║
  ╚══════════════════════════════════════════╝${C.reset}
  ${C.dim}API:  ${API_BASE}
  Rust: ${RUST_URL}
  Mode: ${mode}${mode === 'C' ? ` (${Math.round(duration / 60_000)}min)` : ''}${mode === 'SERVER' ? ` (port ${LOCAL_SERVER_PORT})` : ''}${C.reset}
`);

  // Ensure Rust verifier is running (for modes A, B, C — NOT H or SERVER)
  if (mode !== 'H' && mode !== 'SERVER') {
    const rustOk = await ensureRustVerifier();
    if (!rustOk) {
      log('❌', 'Rust verifier required for this mode. Compile: cd server/rust-verifier && cargo build --release');
      log('💡', 'Then run on port 9876: RUST_VERIFIER_PORT=9876 ./target/release/proxy-verifier');
      process.exit(1);
    }
  }

  // Verify API connectivity
  try {
    const ver = await apiGet('/api/version');
    log('🌐', `Connected to API: v${ver.version} (${ver.env})`);
  } catch (err) {
    log('⚠️', `API unreachable: ${err.message} — some features may fail`);
  }

  try {
    switch (mode) {
      case 'H':      await modeH(); break;
      case 'A':      await modeA(); break;
      case 'B':      await modeB(); break;
      case 'C':      await modeC(duration); break;
      case 'SERVER': await modeServer(); break;
      default:
        log('❌', `Unknown mode: ${mode}. Use --mode=H|A|B|C|SERVER`);
        process.exit(1);
    }
  } catch (err) {
    log('💥', `Fatal error: ${err.message}`);
    console.error(err);
  } finally {
    cleanupRust();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('🛑', 'Interrupted. Cleaning up...');
  cleanupRust();
  process.exit(0);
});

main();
