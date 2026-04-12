#!/usr/bin/env node
/**
 * PROXY REAPER + SOURCE HUNTER — Self-Healing Pipeline
 * ============================================================
 * GitHub Actions job (runs every 4h):
 *
 *   Phase 0 — SOURCE HUNTER (self-healing source discovery)
 *     0a. Merge hardcoded SOURCES + dynamic Redis `proxy_sources:active`
 *     0b. After scraping, track per-source health (2-strike death rule)
 *     0c. If total active < MIN_SOURCES, hunt new sources:
 *         - Parse meta-aggregators (monosans config.toml, etc.)
 *         - GitHub Search API (repos updated <30 days)
 *         - Validate candidates (25+ unique IPs)
 *         - SADD to `proxy_sources:active`
 *
 *   Phase 1 — Scrape all merged sources concurrently
 *   Phase 2 — BGPView ASN filter: drop datacenter/cloud IPs
 *   Phase 3 — Push ISP/residential survivors to Upstash
 *
 * Oracle VM deep verifier pulls from `proxies:candidates:ig`
 * every 30 min and runs real Instagram/platform verification.
 *
 * Zero npm dependencies — pure Node.js ESM + native fetch().
 * Requires Node 18+ (ubuntu-latest in GH Actions ships Node 20+).
 * ============================================================
 */

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const GITHUB_TOKEN  = process.env.GITHUB_TOKEN; // Injected by GH Actions automatically

const CANDIDATES_KEY = 'proxies:candidates:ig';
const CANDIDATES_TTL = 8 * 60 * 60; // 8 hours in seconds

// Source Hunter config
const SOURCES_ACTIVE_KEY  = 'proxy_sources:active';   // SET — dynamic discovered URLs
const SOURCES_DEAD_KEY    = 'proxy_sources:dead';      // SET — confirmed dead, never re-add
const SOURCES_FAILURES_KEY = 'proxy_sources:failures'; // HASH — URL → consecutive fail count
const MIN_SOURCES         = 48;  // Target: always maintain 48+ active sources
const DEATH_STRIKES       = 2;   // Source dies after 2 consecutive failures
const RESURRECTION_DAYS   = 7;   // Dead sources get a second chance after 7 days
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

// ── Upstash REST API Wrapper (zero deps) ────────────────────────────────────

async function redis(command, ...args) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  const url = `${UPSTASH_URL}/${[command, ...args].map(encodeURIComponent).join('/')}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    const json = await res.json();
    return json.result;
  } catch (err) {
    console.warn(`[Redis] ${command} failed:`, err.message);
    return null;
  }
}

async function redisPipeline(commands) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands.map(c => ({ command: c }))),
  });
  return res.ok ? (await res.json()) : null;
}

// ── Phase 0a: Merge hardcoded + dynamic Redis sources ───────────────────────

async function getMergedSources() {
  const merged = new Set(HARDCODED_SOURCES);

  // Pull dynamic sources from Redis
  const dynamic = await redis('SMEMBERS', SOURCES_ACTIVE_KEY);
  if (dynamic && Array.isArray(dynamic)) {
    dynamic.forEach(url => merged.add(url));
    console.log(`[Hunter] Merged ${HARDCODED_SOURCES.length} hardcoded + ${dynamic.length} dynamic = ${merged.size} total sources`);
  } else {
    console.log(`[Hunter] Using ${HARDCODED_SOURCES.length} hardcoded sources (no dynamic sources in Redis yet)`);
  }

  return Array.from(merged);
}

// ── Phase 0b: Track source health (2-strike death rule) ─────────────────────

async function evaluateSourceHealth(sourceUrl, success) {
  if (!UPSTASH_URL) return; // Skip if no Redis

  if (success) {
    // Reset failure counter on success
    await redis('HDEL', SOURCES_FAILURES_KEY, sourceUrl);
    return;
  }

  // Increment failure count
  const strikes = await redis('HINCRBY', SOURCES_FAILURES_KEY, sourceUrl, '1');
  if (strikes >= DEATH_STRIKES) {
    console.log(`[Hunter] ☠️ SOURCE DEAD (${strikes} strikes): ${sourceUrl}`);
    // Remove from active, add to dead, clear failures
    await redisPipeline([
      ['SREM', SOURCES_ACTIVE_KEY, sourceUrl],
      ['SADD', SOURCES_DEAD_KEY, sourceUrl],
      ['HDEL', SOURCES_FAILURES_KEY, sourceUrl],
    ]);
  }
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
    // Skip if already dead (permanent ban)
    const isDead = await redis('SISMEMBER', SOURCES_DEAD_KEY, url);
    if (isDead) return false;

    // Skip if already active
    const isActive = await redis('SISMEMBER', SOURCES_ACTIVE_KEY, url);
    if (isActive) return false;

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
      await redis('SADD', SOURCES_ACTIVE_KEY, candidate);
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
  const dead = await redis('SRANDMEMBER', SOURCES_DEAD_KEY);
  if (dead) {
    console.log(`[Hunter] 🔄 Resurrecting for re-test: ${dead}`);
    await redisPipeline([
      ['SREM', SOURCES_DEAD_KEY, dead],
      ['SADD', SOURCES_ACTIVE_KEY, dead],
    ]);
  }
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

  // ── Phase 3: Push to Upstash ──
  const pushed = await pushToUpstash(survivors);

  const elapsed = Math.round((Date.now() - t0) / 1000);
  console.log('');
  console.log('[Reaper] ============================================================');
  console.log(`[Reaper] DONE in ${elapsed}s`);
  console.log(`[Reaper]   Sources used:  ${finalSources.length} (${HARDCODED_SOURCES.length} hardcoded + dynamic)`);
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
