# 🛡️ Layer 2 Red Team Execution Plan (Cloudflare Swarm Edge)

## 📌 Objective
Isolate, stress-test, and harden the **Cloudflare Worker Proxy (Layer 2)**. We need to see exactly how Meta and YouTube firewalls react to Cloudflare Datacenter IPs (ASN 13335) and implement industry-standard spoofing to bypass them if possible.

---

## 🛠️ Phase 1: Engine Isolation (Backend Strict Mode)
Currently, if an engine fails, the backend silently "waterfalls" down to Layer 6 (ASocks) to ensure the user gets their video. 
**Red Team Requirement:** We cannot test Layer 2 if it secretly falls back. 
**Action:** We will modify server/routes/downloader.ts. If a specific engine is requested via the **Developer Dropdown** (e.g., forceEngine: 'layer2_cf'), the backend will **DISABLE fallbacks**. If Layer 2 fails, it will instantly throw the raw error/HTTP block to the frontend so we can study the exact firewall response.

---

## 🔬 Phase 2: Vulnerability & Hardening Checks
When we hit Cloudflare Workers, we face specific corporate firewalls:
1. **Meta (Instagram/FB) ASN Blocks:** Meta famously blocks Cloudflare IPs to stop scrapers. We expect a 403 Forbidden or a redirect to a Login page. We will test the exact block pattern.
2. **YouTube BotGuard:** Google shares massive peering with Cloudflare. Often, YouTube *allows* Cloudflare IPs without rate limits if the headers perfectly match standard Android/iOS devices.
3. **Header Leaks:** Cloudflare injects CF-Connecting-IP and X-Forwarded-For. We need to ensure our worker strips these or spoofs them so the target doesn't know it's a proxy.

---

## 🚀 Phase 3: Execution Steps
1. **Patch Router:** Update server/routes/downloader.ts to strictly isolate forceEngine requests (No Fallbacks).
2. **Test 1 (YouTube):** Force Layer 2 on a standard YouTube Short. Document if it bypasses BotGuard.
3. **Test 2 (Meta):** Force Layer 2 on an Instagram Reel. Document the exact error (e.g., login required, connection refused).
4. **Harden CF Worker:** If it fails, we will review the CF Worker's code (or spoofing logic) to inject heavy Android User-Agents and precise Accept-Language headers.

---

## 🛠️ Automated Execution: Cloudflare Worker Hardened Spoofing Code
To accurately test if Layer 2 can bypass Meta/YouTube, the Cloudflare Worker cannot just proxy standard requests. It MUST strip out its Cloudflare datacenter identifiers and inject ultra-realistic residential mobile headers. 
Here is the exact code to be pasted into the Cloudflare Worker to deploy this spoofing logic:

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Target URL passed as a query parameter (e.g., worker.dev/?url=https://youtube.com...)
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });

    // 1. Strip all Cloudflare proxy tracking headers
    const spoofedHeaders = new Headers(request.headers);
    const headersToRemove = [
      "cf-connecting-ip", "cf-ipcountry", "cf-ray", 
      "cf-visitor", "x-forwarded-for", "x-real-ip", 
      "x-forwarded-proto"
    ];
    headersToRemove.forEach(h => spoofedHeaders.delete(h));

    // 2. Inject heavy Mobile/Natural Browser Fingerprints
    spoofedHeaders.set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1");
    spoofedHeaders.set("Accept-Language", "en-US,en;q=0.9");
    spoofedHeaders.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8");
    spoofedHeaders.set("Sec-Fetch-Dest", "document");
    spoofedHeaders.set("Sec-Fetch-Mode", "navigate");
    spoofedHeaders.set("Sec-Fetch-Site", "none");
    spoofedHeaders.set("Sec-Fetch-User", "?1");

    const newReq = new Request(targetUrl, {
      method: request.method,
      headers: spoofedHeaders,
      redirect: "follow"
    });

    try {
      const response = await fetch(newReq);
      return response;
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }
};
```

---

## 🏗️ Automated Execution: Building the "Omni-Aggregator" Router
To avoid single-point-of-failure bans without paying for proxies, we will automate the "Cobalt Aggregator Mix". Our Node.js backend will run a background cron job to scrape and maintain a live pool of community extraction APIs from three massive open-source networks.

### 1. The Master Node Endpoints
Our cron job will periodically fetch these Master URLs to build the proxy array:

*   **Network 1: Cobalt Master Tracker** 
    *   **URL:** `https://instances.cobalt.best/api/instances.json`
    *   **Filter Logic:** Iterate JSON. Only push URLs where `online.api == true` and `cors == true`.
*   **Network 2: The Piped Array (YouTube Failsafe 1)**
    *   **URL:** `https://piped-instances.kavin.rocks/`
    *   **Filter Logic:** Read the "backends" array. Push the active `api_url` keys.
*   **Network 3: The Invidious Array (YouTube Failsafe 2)**
    *   **URL:** `https://api.invidious.io/instances.json`
    *   **Filter Logic:** Iterate JSON. Skip any URI containing `.onion` or `.i2p`. Keep if `api` boolean is `true`. Extract the `uri` value.

### 2. Node.js Backend Architecture (Zero-Cost Self-Healing)
Because we already run the Node.js Express backend on our standard hosting (Render/VPS), building this background service costs **$0 extra**. It consumes virtually no CPU/RAM since it just handles string arrays and lightweight HTTP pings in the background.

1. **The 3-Hour Pulse (Cron):** A scheduled task (`setInterval` / cron) that runs exactly once every 3 hours. It fetches the three Master URLs, extracting the proxy list.
2. **Ping Verification:** Before adding a proxy to the pool, the backend fires a micro `GET /` or `OPTIONS` request to verify the instance isn't dead. Only passing instances go into the cache.
3. **The Active Pool (Memory Cache):** Discovered healthy APIs are written over the old array into a high-speed runtime memory variable (`let activeProxyPool = []`). This purges stale nodes immediately every 3 hours.
4. **Reactive Self-Healing / Auto-Delete:** This is the Vibe-Coder secret. If a user tries to download a video and the selected proxy times out or throws a 500 error, we don't wait 3 hours for the next cron job. We instantly intercept the `<error>` block and aggressively delete that specific proxy from the array on the spot so nobody else hits it.

```typescript
// Example: Router Roulette & Self-Healing Extraction
const proxy = activeProxyPool[Math.floor(Math.random() * activeProxyPool.length)];

try {
    const videoData = await fetch(proxy + "/api/json...");
    // Return data to user
} catch (error) {
    console.error("Proxy died underneath us, purging from memory:", proxy);
    // Instant Self-Healing: Delete the dead proxy from the array
    activeProxyPool = activeProxyPool.filter(p => p !== proxy);

    // Fallback logic automatically triggers next index...
}
```

### 3. Meta / Instagram Ultimate Bypass
The Omni-Aggregator works for YouTube perfectly. However, **Meta will instantly ban data-center IPs**. 
For Instagram/Facebook, the *only* permanent free unban method is **Client-Side Extraction** (Phase 3 in the waterfall). 
We will shift the network payload request completely out of our server and onto the *User's Client*. The React frontend will bounce through a raw CORS worker to Meta directly. Because the metadata query originates from a random end-user’s **Home Wi-Fi (Jio, Airtel, residential routing)**, Meta does NOT block it. This effectively provides infinite free residential proxies utilizing our own user traffic.

