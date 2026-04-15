#!/usr/bin/env node
/**
 * PROXY REAPER + SOURCE HUNTER — Hetzner Direct Pipeline
 * ============================================================
 * GitHub Actions job (runs every 4h):
 *
 *   Phase 0 — SOURCE HUNTER (self-healing source discovery)
 *     0a. Use hardcoded SOURCES + local JSON tracking
 *     0b. After scraping, track per-source health (2-strike death rule)
 *     0c. If total active < MIN_SOURCES, hunt new sources:
 *         - Parse meta-aggregators (monosans config.toml, etc.)
 *         - GitHub Search API (repos updated <30 days)
 *         - Validate candidates (25+ unique IPs)
 *
 *   Phase 1 — Scrape all merged sources concurrently
 *   Phase 2 — BGPView ASN filter: drop datacenter/cloud IPs
 *   Phase 3 — Send survivors to Hetzner VPS for platform verification
 *   Phase 4 — Save verified proxies to static JSON (committed to git)
 *
 * Architecture change (April 2025):
 *   OLD: Push to Upstash Redis → Oracle VM pulls → deep verify
 *   NEW: Send directly to Hetzner VPS → save verified to JSON
 *   Reason: Oracle VM deprecated, Upstash Redis secrets removed
 *
 * Zero npm dependencies — pure Node.js ESM + native fetch().
 * Requires Node 18+ (ubuntu-latest in GH Actions ships Node 20+).
 * ============================================================
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hetzner VPS for proxy verification (replaces Upstash Redis + Oracle VM)
const HETZNER_VPS = process.env.HETZNER_VERIFIER_URL || 'http://78.47.104.43:6000';
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN; // Injected by GH Actions automatically

// Output path for verified proxies (same pattern as reels-data.json)
const OUTPUT_DIR = path.join(__dirname, '..', 'client', 'public', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'verified-proxies.json');

// Source tracking file (replaces Redis sets for source health)
const SOURCE_TRACKING_FILE = path.join(__dirname, '..', 'client', 'public', 'data', 'proxy-sources.json');

// Source Hunter config
const MIN_SOURCES         = 48;  // Target: always maintain 48+ active sources
const DEATH_STRIKES       = 2;   // Source dies after 2 consecutive failures
const MIN_PROXIES_VALID   = 25;  // New source must yield 25+ unique IPs to be accepted

const MAX_SAMPLE     = 2000;  // IPs to feed into BGPView filter per run
const BGP_CONCURRENCY = 5;    // Parallel BGPView calls (polite, avoids 429)
const BGP_BATCH_DELAY = 250;  // ms between BGPView batches

// ── Meta-Aggregators: sources of sources (parse these to discover new proxy lists)
const META_AGGREGATORS = [
  // monosans proxy-scraper-checker config — contains upstream source URLs
  'https://raw.githubusercontent.com/monosans/proxy-scraper-checker/main/config.toml',
  // Skillter ProxyGather — plain URL list of upstream sources
  'https://raw.githubusercontent.com/Skillter/ProxyGather/main/sites-to-get-sources-from.txt',
  // proxifly sources list
  'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/.github/SOURCES.md',
];

// ── OSINT Source Matrix (hardcoded baseline — merged with Redis dynamic sources) ──
const HARDCODED_SOURCES = [
  // ── TIER A: SOCKS5 GitHub mega-lists ─────────────────────
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
  'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/socks5.txt',
  'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt',
  'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/socks5/socks5.txt',
  'https://raw.githubusercontent.com/roosterkid/openproxylist/main/SOCKS5_RAW.txt',
  'https://raw.githubusercontent.com/HyperBeats/proxy-list/main/socks5.txt',
  'https://raw.githubusercontent.com/zloi-user/hideip.me/main/socks5.txt',
  // ── TIER A: HTTP GitHub mega-lists ───────────────────────
  'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
  'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
  'https://raw.githubusercontent.com/officialputuid/KangProxy/KangProxy/http/http.txt',
  'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt',
  'https://raw.githubusercontent.com/ALIILAPRO/Proxy/main/http.txt',
  'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt',
  'https://raw.githubusercontent.com/zloi-user/hideip.me/main/http.txt',
  // ── TIER B: MEGA-DUMP aggregators (50k+ candidates/day) ──
  'https://raw.githubusercontent.com/MuRongPIG/Proxy-Master/main/http.txt',
  'https://raw.githubusercontent.com/MuRongPIG/Proxy-Master/main/socks5.txt',
  'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/master/http.txt',
  'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/master/socks5.txt',
  'https://raw.githubusercontent.com/vakhov/free-proxy-list/main/proxies/http.txt',
  'https://raw.githubusercontent.com/vakhov/free-proxy-list/main/proxies/socks5.txt',
  'https://raw.githubusercontent.com/caliphdev/Proxy-List/master/http.txt',
  'https://raw.githubusercontent.com/mmpx12/proxy-list/master/socks5.txt',
  'https://raw.githubusercontent.com/mmpx12/proxy-list/master/http.txt',
  'https://raw.githubusercontent.com/rdavydov/proxy-list/main/proxies/http.txt',
  'https://raw.githubusercontent.com/rdavydov/proxy-list/main/proxies/socks5.txt',
  'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
  'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/socks5.txt',
  // ── TIER C: Open web endpoints (no GH rate limits) ────────
  'https://multiproxy.org/txt_all/proxy.txt',
  'https://rootjazz.com/proxies/proxies.txt',
  'https://proxyspace.pro/http.txt',
  'https://proxyspace.pro/socks5.txt',
  // ── TIER D: Structured API endpoints ─────────────────────
  'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
  'https://api.proxyscrape.com/v2/?request=getproxies&protocol=socks5&timeout=10000&country=all',
  'https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&proxy_type=http&timeout=10000',
  'https://api.proxyscrape.com/v3/free-proxy-list/get?request=displayproxies&proxy_type=socks5&timeout=10000',
  'https://proxylist.geonode.com/api/proxy-list?limit=500&page=1&sort_by=lastChecked&sort_type=desc&protocols=http',
  'https://proxylist.geonode.com/api/proxy-list?limit=500&page=1&sort_by=lastChecked&sort_type=desc&protocols=socks5',
  'https://www.proxy-list.download/api/v1/get?type=http',
  'https://www.proxy-list.download/api/v1/get?type=socks5',
  // ── TIER E: Residential-adjacent high-churn aggregators ───
  'https://raw.githubusercontent.com/zevtyardt/proxy-list/main/all.txt',
  'https://raw.githubusercontent.com/zevtyardt/proxy-list/main/socks5.txt',
  'https://raw.githubusercontent.com/prxchk/proxy-list/main/all.txt',
  'https://raw.githubusercontent.com/prxchk/proxy-list/main/socks5.txt',
  'https://raw.githubusercontent.com/almroot/proxylist/master/list.txt',
  'https://raw.githubusercontent.com/fate0/proxylist/master/proxy.list',
  'https://raw.githubusercontent.com/ErcinDedeoglu/proxies/main/proxies/http.txt',
  'https://raw.githubusercontent.com/ErcinDedeoglu/proxies/main/proxies/socks5.txt',
  'https://raw.githubusercontent.com/Anonym0usWork1221/Free-Proxies/main/proxy_files/socks5_proxies.txt',
  'https://raw.githubusercontent.com/Anonym0usWork1221/Free-Proxies/main/proxy_files/http_proxies.txt',
  'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/all/data.txt',
  'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/socks5/data.txt',
  'https://openproxy.space/list/http',
  'https://openproxy.space/list/socks5',
  'https://spys.me/proxy.txt',
  'https://spys.me/socks.txt',
  'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-socks5.txt',
  'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-http.txt',
  'https://raw.githubusercontent.com/B4RC0DE-TM/proxy-list/main/HTTP.txt',
  'https://raw.githubusercontent.com/B4RC0DE-TM/proxy-list/main/SOCKS5.txt',
  'https://raw.githubusercontent.com/sunny9577/proxy-scraper/master/proxies.txt',
  'https://raw.githubusercontent.com/UptimerBot/proxy-list/main/proxies/http.txt',
  'https://raw.githubusercontent.com/UptimerBot/proxy-list/main/proxies/socks5.txt',
];

// ── Local JSON-based Source Tracking (replaces Upstash Redis) ────────────────
import fs from 'fs';

function loadSourceTracking() {
  try {
    if (fs.existsSync(SOURCE_TRACKING_FILE)) {
      return JSON.parse(fs.readFileSync(SOURCE_TRACKING_FILE, 'utf8'));
    }
  } catch {}
  return { active: [], dead: [], failures: {} };
}

function saveSourceTracking(data) {
  const dir = path.dirname(SOURCE_TRACKING_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SOURCE_TRACKING_FILE, JSON.stringify(data, null, 2));
}

// ── Phase 0a: Merge hardcoded + tracked dynamic sources ─────────────────────

async function getMergedSources() {
  const tracking = loadSourceTracking();
  const deadSet = new Set(tracking.dead || []);
  const merged = new Set(HARDCODED_SOURCES);

  // Add dynamic sources (not dead)
  for (const url of (tracking.active || [])) {
    if (!deadSet.has(url)) merged.add(url);
  }

  console.log(`[Hunter] Merged ${HARDCODED_SOURCES.length} hardcoded + ${(tracking.active || []).length} dynamic = ${merged.size} total sources`);
  return Array.from(merged);
}

// ── Phase 0b: Track source health (2-strike death rule) ─────────────────────

async function evaluateSourceHealth(sourceUrl, success) {
  const tracking = loadSourceTracking();

  if (success) {
    delete tracking.failures[sourceUrl];
    saveSourceTracking(tracking);
    return;
  }

  // Increment failure count
  tracking.failures[sourceUrl] = (tracking.failures[sourceUrl] || 0) + 1;
  if (tracking.failures[sourceUrl] >= DEATH_STRIKES) {
    console.log(`[Hunter] ☠️ SOURCE DEAD (${tracking.failures[sourceUrl]} strikes): ${sourceUrl}`);
    tracking.active = (tracking.active || []).filter(u => u !== sourceUrl);
    if (!tracking.dead.includes(sourceUrl)) tracking.dead.push(sourceUrl);
    delete tracking.failures[sourceUrl];
  }
  saveSourceTracking(tracking);
}

// ── Phase 0c: Source Hunter — discover new source URLs ──────────────────────

async function parseMetaAggregators() {
  const discovered = new Set();

  for (const meta of META_AGGREGATORS) {
    try {
      const text = await fetchWithTimeout(meta, 10000);
      // Extract URLs from any format (TOML, Markdown, plain text)
      const urls = text.match(/https?:\/\/[^\s"'<>\])\}]+/g) || [];
      for (const url of urls) {
        // Only keep URLs that look like they serve proxy lists (raw text endpoints)
        if (url.includes('raw.githubusercontent.com') ||
            url.includes('proxy') ||
            url.includes('socks') ||
            url.match(/\.(txt|csv|list)$/)) {
          discovered.add(url);
        }
      }
    } catch (e) {
      // Silent — meta-aggregators are best-effort
    }
  }

  console.log(`[Hunter] Meta-aggregators yielded ${discovered.size} candidate URLs`);
  return discovered;
}

async function searchGitHub() {
  const discovered = new Set();
  if (!GITHUB_TOKEN) {
    console.log('[Hunter] No GITHUB_TOKEN — skipping GitHub Search API');
    return discovered;
  }

  const date30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const query = encodeURIComponent(`proxy list OR "free proxy" OR socks5 in:name,description pushed:>${date30d}`);

  try {
    const res = await fetch(`https://api.github.com/search/repositories?q=${query}&sort=updated&order=desc&per_page=15`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'BongBari-SourceHunter/1.0',
      },
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();

    if (data.items) {
      for (const repo of data.items.slice(0, 10)) {
        const branch = repo.default_branch || 'main';
        const base = `https://raw.githubusercontent.com/${repo.full_name}/${branch}`;
        // Infer common proxy file paths
        const guesses = [
          'proxies.txt', 'proxy.txt', 'http.txt', 'socks5.txt',
          'proxy_list.txt', 'all.txt', 'proxies/http.txt', 'proxies/socks5.txt',
        ];
        for (const g of guesses) {
          discovered.add(`${base}/${g}`);
        }
      }
      console.log(`[Hunter] GitHub Search found ${data.items.length} repos → ${discovered.size} candidate URLs`);
    }
  } catch (err) {
    console.warn('[Hunter] GitHub Search API error:', err.message);
  }

  return discovered;
}

async function validateCandidateSource(url) {
  try {
    // Skip if already dead or active (using local JSON tracking)
    const tracking = loadSourceTracking();
    if (tracking.dead.includes(url)) return false;
    if (tracking.active.includes(url)) return false;

    // Also skip if it's a hardcoded source
    if (HARDCODED_SOURCES.includes(url)) return false;

    const text = await fetchWithTimeout(url, 10000);
    const matches = text.match(PROXY_REGEX) || [];
    const unique = new Set(matches);

    if (unique.size >= MIN_PROXIES_VALID) {
      console.log(`[Hunter] ✅ VALID: ${url} (${unique.size} unique IPs)`);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function huntNewSources(currentCount) {
  console.log(`[Hunter] ⚠️ ESCALATION: Active sources (${currentCount}) < ${MIN_SOURCES}. Hunting...`);

  // Step 1: Parse meta-aggregators
  const metaCandidates = await parseMetaAggregators();

  // Step 2: Search GitHub
  const ghCandidates = await searchGitHub();

  // Merge all candidates
  const allCandidates = new Set([...metaCandidates, ...ghCandidates]);
  console.log(`[Hunter] Total unique candidate URLs to validate: ${allCandidates.size}`);

  let added = 0;
  let validated = 0;

  for (const candidate of allCandidates) {
    if (currentCount + added >= MIN_SOURCES) {
      console.log(`[Hunter] Reached ${MIN_SOURCES} sources. Stopping hunt.`);
      break;
    }

    validated++;
    const isValid = await validateCandidateSource(candidate);
    if (isValid) {
      const tracking = loadSourceTracking();
      if (!tracking.active.includes(candidate)) {
        tracking.active.push(candidate);
        saveSourceTracking(tracking);
      }
      added++;
    }

    // Rate limit: don't hammer every URL concurrently
    if (validated % 5 === 0) await sleep(500);
  }

  console.log(`[Hunter] Hunt complete: validated ${validated}, added ${added} new sources`);
  if (currentCount + added < MIN_SOURCES) {
    console.error(`[Hunter] ⛔ CRITICAL: Pool stuck at ${currentCount + added}/${MIN_SOURCES} — ecosystem may be exhausted`);
  }
  return added;
}

// ── Phase 0d: Resurrect long-dead sources (7-day cooldown) ──────────────────

async function resurrectDeadSources() {
  // Every run, try to move ONE source from dead back to active for re-testing.
  // The 2-strike rule will quickly re-kill it if it's still dead.
  const tracking = loadSourceTracking();
  if (tracking.dead.length === 0) return;

  // Pick a random dead source
  const idx = Math.floor(Math.random() * tracking.dead.length);
  const dead = tracking.dead[idx];
  console.log(`[Hunter] 🔄 Resurrecting for re-test: ${dead}`);
  
  tracking.dead.splice(idx, 1);
  if (!tracking.active.includes(dead)) {
    tracking.active.push(dead);
  }
  // Reset failure count
  delete tracking.failures[dead];
  saveSourceTracking(tracking);
}

// ── ASN keyword blocklist (datacenter/cloud/CDN providers) ──────────────────
const DATACENTER_KEYWORDS = [
  'amazon', 'aws', 'google', 'microsoft', 'azure', 'hetzner',
  'digitalocean', 'linode', 'ovh', 'vultr', 'cloudflare', 'fastly',
  'oracle', 'rackspace', 'leaseweb', 'choopa', 'contabo',
  'serverius', 'nobis', 'cogent', 'telia', 'zayo',
  'limelight', 'centurylink', 'level 3', 'level3',
  'incapsula', 'akamai', 'stackpath', 'cdn77',
  'quadranet', 'datacamp', 'serverel', 'sharktech',
  'nexeon', 'hostinger', 'hostwinds', 'reliablesite',
  'psychz', 'tzulo', 'colocation america',
];

const PROXY_REGEX = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{1,5}\b/g;

// ── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProxyReaper/1.0; +https://github.com)' },
    });
    const text = await res.text();
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// ── Phase 1: Scrape all sources concurrently (with health tracking) ──────────

async function scrapeAllSources(sources) {
  console.log(`[Reaper] Fetching ${sources.length} sources concurrently (15s timeout each)...`);
  const results = await Promise.allSettled(
    sources.map(url => fetchWithTimeout(url, 15000))
  );

  const allProxies = new Set();
  let successCount = 0;

  // Track per-source health for Source Hunter death detection
  const healthPromises = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const sourceUrl = sources[i];

    if (result.status === 'fulfilled' && result.value) {
      const matches = result.value.match(PROXY_REGEX);
      if (matches && matches.length >= 5) {
        matches.forEach(p => allProxies.add(p));
        successCount++;
        healthPromises.push(evaluateSourceHealth(sourceUrl, true));
      } else {
        // Source responded but had <5 IPs — count as failure
        healthPromises.push(evaluateSourceHealth(sourceUrl, false));
      }
    } else {
      // Source timed out or errored — count as failure
      healthPromises.push(evaluateSourceHealth(sourceUrl, false));
    }
  }

  // Fire health updates in parallel (non-blocking, best-effort)
  await Promise.allSettled(healthPromises);

  console.log(`[Reaper] Sources responded: ${successCount}/${sources.length}, raw IPs deduped: ${allProxies.size}`);
  return allProxies;
}

// ── Phase 2: BGPView ASN filter ──────────────────────────────────────────────

async function getAsnOrg(ip) {
  try {
    const text = await fetchWithTimeout(`https://api.bgpview.io/ip/${ip}`, 8000);
    const data = JSON.parse(text);
    if (data?.status !== 'ok') return '';
    const prefixes = data?.data?.prefixes || [];
    if (prefixes.length === 0) return '';
    // Combine name + description for matching
    const p = prefixes[0];
    const parts = [
      p?.name || '',
      p?.description || '',
      p?.asn?.name || '',
      p?.asn?.description || '',
    ];
    return parts.join(' ').toLowerCase();
  } catch {
    return '';
  }
}

function isDatacenter(orgText) {
  return DATACENTER_KEYWORDS.some(kw => orgText.includes(kw));
}

async function asnFilter(proxySet) {
  const allProxies = Array.from(proxySet);

  // Fisher-Yates shuffle for random sampling
  for (let i = allProxies.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allProxies[i], allProxies[j]] = [allProxies[j], allProxies[i]];
  }

  const sample = allProxies.slice(0, MAX_SAMPLE);
  console.log(`[Reaper] ASN filtering ${sample.length} IPs (concurrency=${BGP_CONCURRENCY}, batch_delay=${BGP_BATCH_DELAY}ms)...`);

  const survivors = [];
  let checked = 0;

  for (let i = 0; i < sample.length; i += BGP_CONCURRENCY) {
    const batch = sample.slice(i, i + BGP_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (proxy) => {
        const ip = proxy.split(':')[0];
        const org = await getAsnOrg(ip);
        checked++;
        return { proxy, isDatacenter: isDatacenter(org), org };
      })
    );

    for (const r of batchResults) {
      if (!r.isDatacenter) {
        survivors.push(r.proxy);
      }
    }

    // Progress log every 100 IPs
    if (checked % 100 === 0 || i + BGP_CONCURRENCY >= sample.length) {
      const pct = Math.round(checked / sample.length * 100);
      console.log(`[Reaper] ASN progress: ${checked}/${sample.length} (${pct}%), survivors: ${survivors.length}`);
    }

    // Polite delay between batches to avoid hitting BGPView rate limits
    if (i + BGP_CONCURRENCY < sample.length) {
      await sleep(BGP_BATCH_DELAY);
    }
  }

  const passRate = sample.length > 0 ? Math.round(survivors.length / sample.length * 100) : 0;
  console.log(`[Reaper] ASN filter done — ${survivors.length}/${sample.length} passed (${passRate}% residential/ISP)`);
  return survivors;
}

// ── Phase 3: Verify via Hetzner VPS + save to JSON ───────────────────────────

/**
 * Sends proxies to Hetzner VPS for platform verification (IG, YT, FB).
 * Uses http module because port 6000 is restricted in fetch/undici.
 * Returns array of verified proxy objects.
 */
async function verifyViaHetzner(proxies) {
  // Health check first
  console.log(`[Reaper] Checking Hetzner VPS health at ${HETZNER_VPS}...`);
  
  const healthOk = await httpGet(`${HETZNER_VPS}/health`, 5000).catch(() => null);
  if (!healthOk) {
    console.error('[Reaper] ❌ Hetzner VPS is unreachable. Cannot verify proxies.');
    console.error(`[Reaper] URL: ${HETZNER_VPS}/health`);
    return [];
  }
  console.log('[Reaper] ✅ Hetzner VPS is healthy');

  // Format proxies as socks5:// or http:// URLs
  const proxyUrls = proxies.map(p => {
    // Raw ip:port — default to http://
    if (!p.includes('://')) return `http://${p}`;
    return p;
  });

  // Send in batches of 500 to avoid timeout
  const BATCH_SIZE = 500;
  const allResults = [];

  for (let i = 0; i < proxyUrls.length; i += BATCH_SIZE) {
    const batch = proxyUrls.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(proxyUrls.length / BATCH_SIZE);
    console.log(`[Reaper] Verifying batch ${batchNum}/${totalBatches} (${batch.length} proxies)...`);

    try {
      const body = JSON.stringify({
        proxies: batch,
        timeout_ms: 15000,
        user_agents: [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36',
          'Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B)',
        ],
        delay_ms: 100,
      });

      const timeoutMs = Math.max(120_000, batch.length * 30 + 30_000);
      const result = await httpPost(`${HETZNER_VPS}/verify`, body, timeoutMs);

      if (result && result.results) {
        const verified = result.results.filter(r => r !== null);
        console.log(`[Reaper] Batch ${batchNum}: ${verified.length}/${batch.length} verified`);
        allResults.push(...verified);
      }
    } catch (err) {
      console.error(`[Reaper] Batch ${batchNum} error: ${err.message}`);
    }
  }

  return allResults;
}

/**
 * Save verified proxies to static JSON file (committed to git by GH Actions).
 */
function saveVerifiedProxies(results) {
  const proxies = results.map(r => ({
    url: r.url,
    ig: !!r.ig,
    yt: !!r.yt,
    fb: !!r.fb,
    latencyMs: r.latency_ms || 0,
    verifiedAt: new Date().toISOString(),
  }));

  // Separate by platform
  const igProxies = proxies.filter(p => p.ig).sort((a, b) => a.latencyMs - b.latencyMs);
  const ytProxies = proxies.filter(p => p.yt).sort((a, b) => a.latencyMs - b.latencyMs);

  const output = {
    _meta: {
      scrapedAt: new Date().toISOString(),
      total: results.length,
      igVerified: igProxies.length,
      ytVerified: ytProxies.length,
      version: 1,
    },
    ig: igProxies.slice(0, 100), // Keep top 100 by latency
    yt: ytProxies.slice(0, 100),
    all: proxies.slice(0, 200),
  };

  // Merge with existing (keep old proxies that are still valid)
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
      const existingUrls = new Set(proxies.map(p => p.url));
      
      // Keep old proxies not in new batch (max 24h old)
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const oldValid = (existing.all || []).filter(p => 
        !existingUrls.has(p.url) && new Date(p.verifiedAt).getTime() > cutoff
      );
      
      if (oldValid.length > 0) {
        output.all = [...proxies, ...oldValid].slice(0, 300);
        output.ig = [...igProxies, ...oldValid.filter(p => p.ig)].slice(0, 150);
        output.yt = [...ytProxies, ...oldValid.filter(p => p.yt)].slice(0, 150);
        output._meta.mergedOld = oldValid.length;
      }
    }
  } catch {}

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`[Reaper] 💾 Saved ${output._meta.total} proxies (${output._meta.igVerified} IG, ${output._meta.ytVerified} YT) to ${OUTPUT_FILE}`);
  return output._meta;
}

// ── HTTP helpers (port 6000 is restricted in fetch/undici) ───────────────────

import http from 'http';

function httpGet(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.get({
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.pathname + parsed.search,
      timeout: timeoutMs,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function httpPost(url, body, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: timeoutMs,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Invalid JSON from Hetzner: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[Reaper] ============================================================');
  console.log('[Reaper] PROXY REAPER + SOURCE HUNTER — Self-Healing Pipeline');
  console.log(`[Reaper] Node ${process.version}  |  Started at ${new Date().toISOString()}`);
  console.log('[Reaper] ============================================================');

  const t0 = Date.now();

  // ── Phase 0: Source Hunter (self-healing source management) ──
  const mergedSources = await getMergedSources();
  const totalActive = mergedSources.length;

  // If below minimum, hunt for new sources first
  if (totalActive < MIN_SOURCES) {
    await huntNewSources(totalActive);
  }

  // Resurrect one dead source per run for re-testing
  await resurrectDeadSources();

  // Re-merge after potential additions
  const finalSources = await getMergedSources();

  // ── Phase 1: Scrape all merged sources ──
  const rawProxies = await scrapeAllSources(finalSources);
  if (rawProxies.size === 0) {
    console.warn('[Reaper] No proxies scraped. All sources may be down. Exiting.');
    return;
  }

  // ── Phase 2: ASN filter ──
  const survivors = await asnFilter(rawProxies);
  if (survivors.length === 0) {
    console.warn('[Reaper] Zero survivors after ASN filter. Nothing to push.');
    return;
  }

  // ── Phase 3: Verify via Hetzner + save JSON ──
  const verifiedResults = await verifyViaHetzner(survivors);
  let meta = { total: 0, igVerified: 0, ytVerified: 0 };
  if (verifiedResults.length > 0) {
    meta = saveVerifiedProxies(verifiedResults);
  }

  const elapsed = Math.round((Date.now() - t0) / 1000);
  console.log('');
  console.log('[Reaper] ============================================================');
  console.log(`[Reaper] DONE in ${elapsed}s`);
  console.log(`[Reaper]   Sources used:  ${finalSources.length} (${HARDCODED_SOURCES.length} hardcoded + dynamic)`);
  console.log(`[Reaper]   Raw scraped:   ${rawProxies.size}`);
  console.log(`[Reaper]   Sampled:       ${Math.min(rawProxies.size, MAX_SAMPLE)}`);
  console.log(`[Reaper]   Survived ASN:  ${survivors.length}`);
  console.log(`[Reaper]   Hetzner verified: ${verifiedResults.length} (IG: ${meta.igVerified}, YT: ${meta.ytVerified})`);
  console.log(`[Reaper]   Saved to:      ${OUTPUT_FILE}`);
  console.log('[Reaper] ============================================================');
}

main().catch(err => {
  console.error('[Reaper] Fatal error:', err);
  process.exit(1);
});
