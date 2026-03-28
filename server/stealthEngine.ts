/**
 * ============================================================
 * STEALTH ENGINE — Anti-Detection Layer for Proxy Verification
 * ============================================================
 * Based on real-world anti-ban configs used by large-scale scrapers.
 * Provides: profile rotation, delay+jitter, domain rate limiting,
 * adaptive concurrency, proxy scoring, and ban detection.
 *
 * Key principle: look like random real humans, not bots.
 * ============================================================
 */

// ── STEALTH_CONFIG: Master configuration object ──────────────

export const STEALTH_CONFIG = {
  // Request profiles — rotated per session (header consistency per request)
  USER_PROFILES: [
    {
      name: 'chrome_win',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'sec-ch-ua': '"Chromium";v="120", "Not(A:Brand";v="24"',
        'sec-ch-ua-platform': '"Windows"',
      },
    },
    {
      name: 'chrome_mac',
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'sec-ch-ua': '"Chromium";v="119"',
        'sec-ch-ua-platform': '"macOS"',
      },
    },
    {
      name: 'firefox_win',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.5',
      },
    },
    {
      name: 'safari_mac',
      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
      },
    },
    {
      name: 'safari_mobile',
      ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-us',
      },
    },
    {
      name: 'edge_win',
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'sec-ch-ua': '"Microsoft Edge";v="120", "Chromium";v="120"',
        'sec-ch-ua-platform': '"Windows"',
      },
    },
  ],

  // Delay + jitter engine (human-like timing)
  DELAY: {
    baseMs: [400, 2500] as [number, number],   // random base delay range
    jitterPercent: 0.25,                         // ±25% jitter on base
    longPauseEvery: 20,                          // every ~20 requests, take a long pause
    longPauseMs: [5000, 12000] as [number, number], // long pause range
  },

  // Domain-specific rate limits (requests per second)
  RATE_LIMIT: {
    youtube:   { rps: 3, burst: 5 },
    instagram: { rps: 1, burst: 2 },
    facebook:  { rps: 2, burst: 4 },
    default:   { rps: 5, burst: 8 },
  } as Record<string, { rps: number; burst: number }>,

  // Proxy rotation strategy
  ROTATION: {
    maxReusePerProxy: 3,
    cooldownSeconds: 120,
    maxFailBeforePause: 2,
  },

  // Adaptive concurrency engine
  ADAPTIVE: {
    lowSuccessThreshold: 40,   // % — if below, downscale
    highSuccessThreshold: 80,  // % — if above, upscale
    downscaleFactor: 0.3,      // reduce batch by 30%
    upscaleFactor: 0.1,        // increase batch by 10%
    minBatchSize: 50,
    maxBatchSize: 500,
    defaultBatchSize: 150,
  },

  // Validation pipeline stages
  VALIDATION: {
    stages: ['tcp_connect', 'http_head', 'platform_check'] as const,
    batchSize: 150,
    maxConcurrent: 300,
  },

  // Proxy lifecycle states
  LIFECYCLE: {
    states: ['active', 'weak', 'dead', 'bin'] as const,
    purgeAfterHours: 24,
    retryBinAfterHours: 6,
  },

  // Scoring model weights (sum to 1.0)
  SCORE: {
    latencyWeight: 0.3,
    successWeight: 0.4,
    uptimeWeight: 0.3,
  },

  // Ban detection keywords in response body
  BAN_SIGNALS: [
    'captcha',
    'unusual traffic',
    'login required',
    'blocked',
    'rate limit',
    'too many requests',
    'access denied',
    'bot detected',
    'verify you are human',
    'please complete the security check',
  ],
} as const;

// ── Profile Rotation ─────────────────────────────────────────

let _profileIndex = 0;

export function getNextProfile(): typeof STEALTH_CONFIG.USER_PROFILES[number] {
  const profile = STEALTH_CONFIG.USER_PROFILES[_profileIndex % STEALTH_CONFIG.USER_PROFILES.length];
  _profileIndex++;
  return profile;
}

export function getRandomProfile(): typeof STEALTH_CONFIG.USER_PROFILES[number] {
  return STEALTH_CONFIG.USER_PROFILES[Math.floor(Math.random() * STEALTH_CONFIG.USER_PROFILES.length)];
}

/** Returns array of all UA strings for passing to Rust verifier */
export function getAllUserAgents(): string[] {
  return STEALTH_CONFIG.USER_PROFILES.map(p => p.ua);
}

// ── Delay + Jitter Engine ────────────────────────────────────

let _requestCounter = 0;

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns milliseconds to wait before next request.
 * Includes jitter and occasional long pauses to mimic human browsing.
 */
export function getStealthDelay(): number {
  _requestCounter++;
  const cfg = STEALTH_CONFIG.DELAY;

  // Occasional long pause (every ~20 requests)
  if (_requestCounter % cfg.longPauseEvery === 0) {
    return randomBetween(cfg.longPauseMs[0], cfg.longPauseMs[1]);
  }

  // Normal delay with jitter
  const base = randomBetween(cfg.baseMs[0], cfg.baseMs[1]);
  const jitter = base * cfg.jitterPercent * (Math.random() * 2 - 1); // ±25%
  return Math.max(100, Math.floor(base + jitter));
}

/** Compact delay for between verification sub-batches (not per-proxy) */
export function getBatchDelay(): number {
  return randomBetween(800, 3000);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Adaptive Concurrency ─────────────────────────────────────

let _currentBatchSize: number = STEALTH_CONFIG.ADAPTIVE.defaultBatchSize;

/**
 * Adjusts batch size based on success rate.
 * Call after each verification batch with the percentage of successful proxies.
 */
export function adaptBatchSize(successRatePercent: number): number {
  const cfg = STEALTH_CONFIG.ADAPTIVE;

  if (successRatePercent < cfg.lowSuccessThreshold) {
    // Error rate too high — slow down
    _currentBatchSize = Math.max(
      cfg.minBatchSize,
      Math.floor(_currentBatchSize * (1 - cfg.downscaleFactor))
    );
    console.log(`[Stealth] 📉 Adaptive: success ${successRatePercent.toFixed(0)}% < ${cfg.lowSuccessThreshold}% — batch ↓ ${_currentBatchSize}`);
  } else if (successRatePercent > cfg.highSuccessThreshold) {
    // Going well — speed up slightly
    _currentBatchSize = Math.min(
      cfg.maxBatchSize,
      Math.floor(_currentBatchSize * (1 + cfg.upscaleFactor))
    );
    console.log(`[Stealth] 📈 Adaptive: success ${successRatePercent.toFixed(0)}% > ${cfg.highSuccessThreshold}% — batch ↑ ${_currentBatchSize}`);
  }

  return _currentBatchSize;
}

export function getCurrentBatchSize(): number {
  return _currentBatchSize;
}

export function resetAdaptive(): void {
  _currentBatchSize = STEALTH_CONFIG.ADAPTIVE.defaultBatchSize;
}

// ── Proxy Scoring Model ──────────────────────────────────────

export interface ProxyScore {
  score: number;        // 0-100 composite score
  latencyScore: number; // 0-100 based on response time
  successScore: number; // 0-100 based on platform access
  uptimeScore: number;  // 0-100 based on consecutive checks
}

/**
 * Calculates a composite quality score (0-100) for a proxy.
 * Higher = better. Used alongside tier for fine-grained ranking.
 */
export function calculateProxyScore(
  latencyMs: number,
  platformsReached: number, // out of 3 (yt, fb, ig)
  failCount: number,
  totalChecks: number,
): ProxyScore {
  const w = STEALTH_CONFIG.SCORE;

  // Latency score: 100 for <200ms, 0 for >10000ms, linear between
  const latencyScore = Math.max(0, Math.min(100, 100 - (latencyMs / 100)));

  // Success score: based on platforms reached (0/3 = 0, 3/3 = 100)
  const successScore = (platformsReached / 3) * 100;

  // Uptime score: based on fail count vs total checks
  const uptimeRatio = totalChecks > 0 ? Math.max(0, 1 - (failCount / totalChecks)) : 0.5;
  const uptimeScore = uptimeRatio * 100;

  const score = Math.round(
    w.latencyWeight * latencyScore +
    w.successWeight * successScore +
    w.uptimeWeight * uptimeScore
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    latencyScore: Math.round(latencyScore),
    successScore: Math.round(successScore),
    uptimeScore: Math.round(uptimeScore),
  };
}

// ── Ban Detection ────────────────────────────────────────────

/**
 * Checks response body/text for ban signals.
 * Returns the detected signal string or null if clean.
 */
export function detectBanSignal(responseText: string): string | null {
  const lower = responseText.toLowerCase();
  for (const signal of STEALTH_CONFIG.BAN_SIGNALS) {
    if (lower.includes(signal.toLowerCase())) {
      return signal;
    }
  }
  return null;
}

// ── Domain Rate Limiter ──────────────────────────────────────

const _domainTimestamps: Record<string, number[]> = {};

/**
 * Returns true if the request to this domain is allowed under rate limits.
 * Call before making a request. Returns false if you should wait.
 */
export function isDomainAllowed(domain: string): boolean {
  const key = domain.includes('youtube') ? 'youtube'
    : domain.includes('instagram') ? 'instagram'
    : domain.includes('facebook') ? 'facebook'
    : 'default';

  const limit = STEALTH_CONFIG.RATE_LIMIT[key] || STEALTH_CONFIG.RATE_LIMIT.default;
  const now = Date.now();
  const window = 1000; // 1 second window

  if (!_domainTimestamps[key]) _domainTimestamps[key] = [];

  // Remove timestamps older than window
  _domainTimestamps[key] = _domainTimestamps[key].filter(t => now - t < window);

  if (_domainTimestamps[key].length >= limit.burst) {
    return false; // Rate limited
  }

  _domainTimestamps[key].push(now);
  return true;
}

/**
 * Returns milliseconds to wait before domain is available again.
 */
export function getDomainWaitTime(domain: string): number {
  const key = domain.includes('youtube') ? 'youtube'
    : domain.includes('instagram') ? 'instagram'
    : domain.includes('facebook') ? 'facebook'
    : 'default';

  const now = Date.now();
  const timestamps = _domainTimestamps[key] || [];
  if (timestamps.length === 0) return 0;

  const oldest = Math.min(...timestamps);
  const waitMs = 1000 - (now - oldest);
  return Math.max(0, waitMs);
}

// ── Stealth Status (for API/dashboard) ───────────────────────

export function getStealthStatus() {
  return {
    currentBatchSize: _currentBatchSize,
    requestCounter: _requestCounter,
    profileCount: STEALTH_CONFIG.USER_PROFILES.length,
    config: {
      delayRange: STEALTH_CONFIG.DELAY.baseMs,
      jitterPercent: STEALTH_CONFIG.DELAY.jitterPercent,
      longPauseEvery: STEALTH_CONFIG.DELAY.longPauseEvery,
      adaptiveRange: [STEALTH_CONFIG.ADAPTIVE.minBatchSize, STEALTH_CONFIG.ADAPTIVE.maxBatchSize],
      banSignalCount: STEALTH_CONFIG.BAN_SIGNALS.length,
      rateLimits: STEALTH_CONFIG.RATE_LIMIT,
    },
  };
}
