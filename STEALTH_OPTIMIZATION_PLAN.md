# Stealth Optimization Plan — Proxy Hunter System

> Anti-detection hardening for the Red Team proxy verification pipeline.
> Created after analysis of 10+ detection risks, real-world anti-ban configs, and industry patterns.

---

## Detection Risk Matrix (Pre-Stealth)

| # | Risk | Severity | Status |
|---|------|----------|--------|
| 1 | Static User-Agent (`Mozilla/5.0`) in all requests | HIGH | ✅ FIXED — 6 UA profiles, rotated per-proxy |
| 2 | Burst request patterns (all at once) | HIGH | ✅ FIXED — Delay+Jitter engine (400–2500ms) |
| 3 | No per-domain rate limiting (YT/IG/FB hit equally) | MEDIUM | ✅ FIXED — Domain rate limiter (YT 3rps, IG 1rps, FB 2rps) |
| 4 | Constant concurrency regardless of error rate | MEDIUM | ✅ FIXED — Adaptive batch sizing (50–500) |
| 5 | No ban/captcha detection in responses | HIGH | ✅ FIXED — 10 ban signal patterns checked |
| 6 | No proxy quality scoring | MEDIUM | ✅ FIXED — 0–100 composite score (latency/success/uptime) |
| 7 | No delay between verification chunks | HIGH | ✅ FIXED — Stealth sleep between Node.js chunks |
| 8 | Rust verifier has 0 delay between checks | HIGH | ✅ FIXED — Random inter-request delays in Rust |
| 9 | TLS/JA3 fingerprint static | LOW | ❌ SKIPPED — See rejected items |
| 10 | No proxy cooldown tracking | LOW | 📋 CONFIG DEFINED — Not yet enforced in code |

---

## Triage: ACCEPTED vs REJECTED vs ALREADY DONE

### ✅ ACCEPTED & IMPLEMENTED

| Feature | Implementation | File |
|---------|---------------|------|
| **Delay + Jitter Engine** | 400–2500ms base delay, ±25% jitter. Long pause every 20 requests (5–12s). | `stealthEngine.ts` |
| **UA Profile Rotation** | 6 real browser profiles (Chrome Win/Mac, Firefox Win, Safari Mac/Mobile, Edge Win). Rotated per-proxy in Rust verifier, random in Node.js fallback. | `stealthEngine.ts`, `main.rs` |
| **Domain Rate Limiting** | Per-platform RPS: YouTube 3/s (burst 5), Instagram 1/s (burst 2), Facebook 2/s (burst 4). | `stealthEngine.ts` |
| **Adaptive Concurrency** | Batch size auto-adjusts: ↓30% when success <40%, ↑10% when success >80%. Range: 50–500 (default 150). | `stealthEngine.ts` |
| **Proxy Scoring Model** | Composite 0–100 score. Weights: latency 30%, success 40%, uptime 30%. Applied in enrichResults + verifyProxy. | `stealthEngine.ts`, `proxyScraperService.ts` |
| **Ban Detection** | Checks response body for 10 patterns: captcha, unusual traffic, blocked, rate limited, access denied, challenge, forbidden, security check, WAF, bot detection. | `stealthEngine.ts` |
| **Stealth Status API** | `GET /api/admin/proxy-stealth-status` returns engine config + state. | `routes/system.ts` |
| **Rust UA + Delay** | Rust verifier accepts `user_agents[]` and `delay_ms[min, max]` in payload. Rotates UA per proxy index. Random delays between checks. | `rust-verifier/src/main.rs` |

### ❌ REJECTED (with reasoning)

| Feature | Why Rejected |
|---------|-------------|
| **TLS/JA3 Fingerprint Randomization** | Requires curl-impersonate or custom TLS stacks. Too complex for current Rust binary. We're testing proxies, not scraping guarded content. |
| **Proxy Chaining (A→B→target)** | We verify proxies, not scrape through them. The proxy IS the endpoint being tested. Chaining adds latency and complexity for zero benefit. |
| **Mobile IP Mix (25%)** | We can't control what IPs OSINT sources give us. We rank by quality instead of trying to filter by IP type. |
| **Session Simulation (multi-request chains)** | Verification is a single check per platform. Simulating human browsing sessions is overkill for a health check. |
| **Traffic Shaping Patterns (low/medium/spike/idle)** | The delay+jitter engine already creates natural-looking patterns. Explicit traffic profiles add complexity without meaningful benefit. |
| **Encryption/Obfuscation of Traffic** | Redis is Upstash (TLS), API is HTTPS. Traffic is already encrypted end-to-end. |
| **IP Pool Split 70/30 Residential/DC** | Can't control source IPs from OSINT scraping. We rank proxies by quality score instead. |

### ✅ ALREADY DONE (prior sessions)

| Feature | Session | Status |
|---------|---------|--------|
| BIN System (soft-delete pool) | P29 | Live |
| Raw Queue (gradual processing) | P20 | Live |
| Local PC Priority (residential IP first) | P27 | Live |
| Queue-based Scaling | P20 | Live |
| Tier Revalidation (Platinum 30m, Gold 2h, Bronze 24h) | P14 | Live |
| Semaphore Limiting (500 concurrent) | P17-FIX | Live |

---

## STEALTH_CONFIG Reference

```
PROFILES: 6 UA strings (Chrome Win/Mac, Firefox Win, Safari Mac/Mobile, Edge Win)
DELAY:
  baseMs: [400, 2500]
  jitterPercent: 0.25
  longPauseEvery: 20 requests
  longPauseMs: [5000, 12000]
DOMAIN_LIMITS:
  youtube.com: 3 rps / burst 5
  instagram.com: 1 rps / burst 2
  facebook.com: 2 rps / burst 4
ADAPTIVE:
  minBatch: 50, maxBatch: 500, default: 150
  downscale: 30% when success < 40%
  upscale: 10% when success > 80%
SCORING:
  latencyWeight: 0.30
  successWeight: 0.40
  uptimeWeight: 0.30
BAN_SIGNALS: captcha, unusual traffic, blocked, rate limited, access denied,
             challenge required, forbidden, security check, WAF, bot detection
```

---

## Files Modified

| File | Changes |
|------|---------|
| `server/stealthEngine.ts` | **NEW** — Full stealth config + helpers (~300 lines) |
| `server/rust-verifier/src/main.rs` | UA rotation per proxy, random inter-request delays, `rand` crate |
| `server/rust-verifier/Cargo.toml` | Added `rand = "0.9"` dependency |
| `server/rustVerifier.ts` | Passes `user_agents` + `delay_ms` to all 3 verify paths (Local PC, Hetzner, Local Rust) |
| `server/proxyScraperService.ts` | Stealth imports, `score` field on ProxyPlatforms, scoring in enrichResults + verifyProxy, adaptive tracking in verifyBatch, stealth delays in Node.js fallback, ban detection in runCheck |
| `server/routes/system.ts` | `GET /api/admin/proxy-stealth-status` endpoint |

---

## Verification Checklist

1. `npx tsc --noEmit` → 0 errors ✅
2. `cargo check` in `server/rust-verifier` → compiles ✅
3. `GET /api/admin/proxy-stealth-status` returns JSON with config + state
4. Proxy verification uses random UA (check logs for `[Stealth]` prefix)
5. Node.js fallback shows inter-chunk delays in logs
6. Dashboard shows `score` field on newly verified proxies
