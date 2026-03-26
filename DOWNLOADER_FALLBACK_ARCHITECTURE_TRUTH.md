# Downloader Fallback Architecture (The Absolute Truth)
**Last Updated: March 2026**

## 1. The Blame & Accountability Rule
*Incident Context:* An agent incorrectly claimed Instagram "patched" our scraping ability. This was false. The real issue was a missing safety guard (`if (!isYouTubeURL)`) in the server codebase which caused the server to crash from memory exhaustion on Phase 4, preventing it from ever reaching Phase 6.
**The New Mandate:** Agents must NEVER blindly blame external APIs. If it worked yesterday, the agent must assume THEY broke the codebase architecture today. Strict, isolated raw testing of proxy connections is required before declaring a route "dead".

## 2. Why Cloudflare (CF) Swarm Fails for Instagram/Meta
**Question:** *Is CF Swarm (Phase 2) working for Instagram for free?*
**Answer:** No, and it purposely fails. Cloudflare workers operate on Datacenter IPs (ASN blocks). Meta (Instagram and Facebook) uses extremely aggressive AI to immediately block Datacenter IP scraping and demands login cookies. When Phase 2 hits Instagram, it receives a `403` or "Empty Media" block. 
*This is expected behavior.* The Swarm gracefully catches this failure and natively cascades downstream to our Paid proxies, which use Residential (Real User) IPs that Meta cannot easily block. CF Swarm works beautifully for YouTube/TikTok but is dead for Meta.

---

## 3. The Definitive Fallback Waterfall

Here is exactly how links travel through the multi-phase fallback engine based on the domain platform.

### For YOUTUBE Links (`youtube.com`, `youtu.be`)
1. **Phase 1 (Hetzner Cobalt Proxy):** First attempt. High speed. Clean IP.
   *If disabled/fails, cascades to:* 👇
2. **Phase 2 (Cloudflare Swarm Edge):** Distributes the request across V8 isolates. Unblockable by basic IP bans.
   *If BotGuard blocks CF, cascades to:* 👇
3. **Phase 3 (Direct Hetzner IPv6 ytdl-core):** Direct extraction using native server hardware. Uses `ios,tv` client spoofing.
   *If IPv6 block or 429 fails, cascades to:* 👇
4. **Phase 4 (YTDL-Core + BotGuard PO-Token):** Advanced Botguard bypass where the server natively solves a Proof-of-Origin token and passes it to Youtube.
   *If PO-Token fails, cascades to:* 👇
5. **🆓 Layer 7 (Free Proxy Pool):** Uses our own mined residential/datacenter proxies from the Proxy Kitchen (30 OSINT+Telegram sources). Runs yt-dlp with the best free proxy. **$0 cost.** Bans the proxy on failure and cascades.
   *If all free proxies fail, cascades to:* 👇
6. **Phase 6 (Paid ASocks Residential):** 💰 The absolute last resort. Injects a high-cost residential IP rotate session ($0.003/req) to force the payload through.

### For INSTAGRAM / FACEBOOK Links (`instagram.com`, `facebook.com`)
1. **Phase 1 (Hetzner Cobalt Proxy):** First attempt. Sometimes active if Cobalt upstream maintains Meta bypasses.
   *Often fails due to changing Meta walls, cascades to:* 👇
2. **Phase 2 (Cloudflare Swarm Edge):** Guaranteed to fail for Meta (due to Datacenter ASN blocks). Only remains here for architectural consistency. 
   *Instantly fails and cascades to:* 👇
   *(Phase 3 and Phase 4 are STRICTLY SKIPPED via codebase domain checks to prevent memory crashes!)*  👇
3. **🆓 Layer 7 (Free Proxy Pool):** Attempts Meta extraction via yt-dlp using our mined residential proxies. If we have residential proxies in the pool, this can bypass Meta's login walls for **$0**. Bans failed proxies automatically.
   *If no residential proxies or all fail, cascades to:* 👇
4. **Phase 6 (Paid ASocks Residential):** 🎯 **Target Result.** Uses paid rotating Indian/US residential IPs with `hold-session` ($0.003/req). This mimics a real mobile phone opening the app and successfully bypasses Meta's strict login walls to reliably extract the MP4 data.

---

## 4. Maintenance Guide (If things break)
If a user reports Instagram is failing:
1. **Check the logs for `FATAL ERROR: JavaScript heap out of memory`.** Wait—did a recent edit accidentally remove the non-YouTube guard in Phase 4?
2. **Test directly.** Write a raw `node.js` script using `child_process.execFile` that directly invokes `yt-dlp` using the exact ASocks proxy URL (`http://...hold-session...`) and the exact Instagram link. If the script succeeds, the proxy and Meta are fine; the Server Code is broken.
3. **Watch the Waterfall Limit.** Ensure standard Meta queries aren't getting stuck in infinite loops trying to resolve `ytdl-core` tokens. Meta links must bypass YouTube logic entirely to land in Phase 6 safely.