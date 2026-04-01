#!/usr/bin/env node
/**
 * PROXY REAPER — Phase A
 * ============================================================
 * GitHub Actions job (runs every 4h):
 *   1. Scrape 50+ OSINT sources concurrently (zero npm deps)
 *   2. Deduplicate IPs using a Set
 *   3. Shuffle → take up to MAX_SAMPLE IPs
 *   4. BGPView ASN filter: drop datacenter/cloud IPs
 *   5. Push ISP/residential survivors to Upstash key
 *      `proxies:candidates:ig` (SET, 8h TTL)
 *
 * Oracle VM deep verifier then pulls from `proxies:candidates:ig`
 * every 30 min and runs real Instagram/platform verification.
 *
 * Zero npm dependencies — pure Node.js ESM + native fetch().
 * Requires Node 18+ (ubuntu-latest in GH Actions ships Node 20+).
 * ============================================================
 */

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const CANDIDATES_KEY = 'proxies:candidates:ig';
const CANDIDATES_TTL = 8 * 60 * 60; // 8 hours in seconds

const MAX_SAMPLE     = 2000;  // IPs to feed into BGPView filter per run
const BGP_CONCURRENCY = 5;    // Parallel BGPView calls (polite, avoids 429)
const BGP_BATCH_DELAY = 250;  // ms between BGPView batches

// ── OSINT Source Matrix (mirrors server/proxyScraperService.ts) ─────────────
const SOURCES = [
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

// ── Phase 1: Scrape all sources concurrently ─────────────────────────────────

async function scrapeAllSources() {
  console.log(`[Reaper] Fetching ${SOURCES.length} sources concurrently (15s timeout each)...`);
  const results = await Promise.allSettled(
    SOURCES.map(url => fetchWithTimeout(url, 15000))
  );

  const allProxies = new Set();
  let successCount = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value) {
      const matches = result.value.match(PROXY_REGEX);
      if (matches && matches.length >= 5) {
        matches.forEach(p => allProxies.add(p));
        successCount++;
      }
    }
  }

  console.log(`[Reaper] Sources responded: ${successCount}/${SOURCES.length}, raw IPs deduped: ${allProxies.size}`);
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

// ── Phase 3: Push to Upstash via REST pipeline ───────────────────────────────

async function pushToUpstash(proxies) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.error('[Reaper] FATAL: Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN env vars');
    process.exit(1);
  }

  // Push in chunks to stay within Upstash pipeline limits
  const CHUNK_SIZE = 500;
  let totalPushed = 0;

  for (let i = 0; i < proxies.length; i += CHUNK_SIZE) {
    const chunk = proxies.slice(i, i + CHUNK_SIZE);

    const pipeline = [
      { command: ['SADD', CANDIDATES_KEY, ...chunk] },
      // Refresh TTL to 8h on every write
      { command: ['EXPIRE', CANDIDATES_KEY, String(CANDIDATES_TTL)] },
    ];

    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipeline),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[Reaper] Upstash error (chunk ${Math.floor(i / CHUNK_SIZE) + 1}): HTTP ${res.status} — ${errBody}`);
    } else {
      totalPushed += chunk.length;
    }
  }

  console.log(`[Reaper] Pushed ${totalPushed}/${proxies.length} candidates to "${CANDIDATES_KEY}" (TTL 8h)`);
  return totalPushed;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[Reaper] ============================================================');
  console.log('[Reaper] PROXY REAPER — Phase A  (Discover + ASN Filter)');
  console.log(`[Reaper] Node ${process.version}  |  Started at ${new Date().toISOString()}`);
  console.log('[Reaper] ============================================================');

  const t0 = Date.now();

  // Step 1 — Scrape
  const rawProxies = await scrapeAllSources();
  if (rawProxies.size === 0) {
    console.warn('[Reaper] No proxies scraped. All sources may be down. Exiting.');
    return;
  }

  // Step 2 — ASN filter
  const survivors = await asnFilter(rawProxies);
  if (survivors.length === 0) {
    console.warn('[Reaper] Zero survivors after ASN filter. Nothing to push.');
    return;
  }

  // Step 3 — Push to Upstash
  const pushed = await pushToUpstash(survivors);

  const elapsed = Math.round((Date.now() - t0) / 1000);
  console.log('');
  console.log('[Reaper] ============================================================');
  console.log(`[Reaper] DONE in ${elapsed}s`);
  console.log(`[Reaper]   Raw scraped:   ${rawProxies.size}`);
  console.log(`[Reaper]   Sampled:       ${Math.min(rawProxies.size, MAX_SAMPLE)}`);
  console.log(`[Reaper]   Survived ASN:  ${survivors.length}`);
  console.log(`[Reaper]   Pushed Redis:  ${pushed}`);
  console.log('[Reaper] Oracle VM verifier will deep-check these in the next 30-min window.');
  console.log('[Reaper] ============================================================');
}

main().catch(err => {
  console.error('[Reaper] Fatal error:', err);
  process.exit(1);
});
