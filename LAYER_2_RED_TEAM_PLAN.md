# 🛡️ Layer 2 Red Team Execution Plan (Cloudflare Swarm Edge)

## 📌 Objective
Isolate, stress-test, and harden the **Cloudflare Worker Proxy (Layer 2)**. We need to see exactly how Meta and YouTube firewalls react to Cloudflare Datacenter IPs (ASN 13335) and implement industry-standard spoofing to bypass them if possible.

---

## 🛠️ Phase 1: Engine Isolation (Backend Strict Mode)
Currently, if an engine fails, the backend silently "waterfalls" down to Layer 6 (ASocks) to ensure the user gets their video. 
**Red Team Requirement:** We cannot test Layer 2 if it secretly falls back. 
**Action:** We will modify server/routes/downloader.ts. If a specific engine is requested via the **Developer Dropdown** (e.g., orceEngine: 'layer2_cf'), the backend will **DISABLE fallbacks**. If Layer 2 fails, it will instantly throw the raw error/HTTP block to the frontend so we can study the exact firewall response.

---

## 🔬 Phase 2: Vulnerability & Hardening Checks
When we hit Cloudflare Workers, we face specific corporate firewalls:
1. **Meta (Instagram/FB) ASN Blocks:** Meta famously blocks Cloudflare IPs to stop scrapers. We expect a 403 Forbidden or a redirect to a Login page. We will test the exact block pattern.
2. **YouTube BotGuard:** Google shares massive peering with Cloudflare. Often, YouTube *allows* Cloudflare IPs without rate limits if the headers perfectly match standard Android/iOS devices.
3. **Header Leaks:** Cloudflare injects CF-Connecting-IP and X-Forwarded-For. We need to ensure our worker strips these or spoofs them so the target doesn't know it's a proxy.

---

## 🚀 Phase 3: Execution Steps
1. **Patch Router:** Update server/routes/downloader.ts to strictly isolate orceEngine requests (No Fallbacks).
2. **Test 1 (YouTube):** Force Layer 2 on a standard YouTube Short. Document if it bypasses BotGuard.
3. **Test 2 (Meta):** Force Layer 2 on an Instagram Reel. Document the exact error (e.g., login required, connection refused).
4. **Harden CF Worker:** If it fails, we will review the CF Worker's code (or spoofing logic) to inject heavy Android User-Agents and precise Accept-Language headers.


## 💡 Vibe Coder Architect: Industry Standard Scaling & "Permanent\" Unban Methods
The industry explicitly avoids single points of failure by mixing and rotating public instances alongside dark residential networks. Here is the modern blueprint for how aggressive platforms (Meta, YT) are permanently bypassed without excessive costs:

### 1. The Cobalt Aggregator Mix (Free, High Availability)
Instead of relying strictly on our Hetzner Cobalt instance (which can get ASN-flagged eventually), we can build an **Edge Cobalt Router**.
- **How it works:** We scrape and maintain a live sub-list of public community Cobalt instances (e.g., \pi.cobalt.foo\, \cobalt.bar\, etc.).
- **Execution:** When a request hits our backend, it picks a random public Cobalt mirror from an active array. If the mirror is dead/blocked, it immediately catches the \403\ and silently retries on the next mirror in milliseconds.
- **Why it’s permanent:** Because the instances are hosted across hundreds of different ASNs globally by the community. Meta/YouTube cannot ban all of them at once.

### 2. IPv6 Native Subnet Rotation (VPS Strategy)
For YouTube, Datacenter IPv4s are burned quickly, but IPv6 has a nearly infinite address space (\/64\ gives you eighteen quintillion IPs).
- **How it works:** We configure our Hetzner server to bind all \yt-dlp\ or proxy requests to a random IPv6 address from our \/64\ subnet on every single hit.
- **Result:** YouTube’s BotGuard sees a completely fresh, unique IP every time. A ban is statistically impossible to enforce at the individual IP level.

### 3. Bypassing Meta's Cloudflare Block (Client-Side)
Meta blocks Datacenter ASNs (like Cloudflare) instantly. To get around this without paying for Residential Proxies:
- **Client-Side Extraction (Browser CORS):** The user's own browser runs the fetch via a raw CORS proxy. Meta sees the user's natural Residential IP (e.g., Jio, Airtel) fetching the metadata. Zero ban risk for our servers, because the user's own internet is used to scrape the payload link!

### 4. Smart Proxy Waterfalls (The True Vibe)
1. **Public Cobalt Array:** Try 3 different public instances.
2. **VPS IPv6 Rotation:** Native extraction using randomized IPv6.
3. **Ghost Browser Proxy:** Client-side CORS extraction.
4. **ASocks Fallback:** The final, paid net to ensure 100% success.

---

## 🛠️ Automated Execution: Cloudflare Worker Hardened Spoofing Code
To accurately test if Layer 2 can bypass Meta/YouTube, the Cloudflare Worker cannot just proxy standard requests. It MUST strip out its Cloudflare datacenter identifiers and inject ultra-realistic residential mobile headers. 
Here is the exact code to be pasted into the Cloudflare Worker to deploy this spoofing logic:

\\\javascript
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
\\\

---

## 🏗️ Automated Execution: Building the "Omni-Aggregator" Router
To avoid single-point-of-failure bans without paying for proxies, we will automate the "Cobalt Aggregator Mix". Our Node.js backend will run a background cron job to scrape and maintain a live pool of community extraction APIs from three massive open-source networks.

### 1. The Master Node Endpoints
Our cron job will periodically fetch these Master URLs to build the proxy array:

*   **Network 1: Cobalt Master Tracker** 
    *   **URL:** \https://instances.cobalt.best/api/instances.json\
    *   **Filter Logic:** Iterate JSON. Only push URLs where \online.api == true\ and \cors == true\.
*   **Network 2: The Piped Array (YouTube Failsafe 1)**
    *   **URL:** \https://piped-instances.kavin.rocks/\
    *   **Filter Logic:** Read the "backends" array. Push the active \pi_url\ keys.
*   **Network 3: The Invidious Array (YouTube Failsafe 2)**
    *   **URL:** \https://api.invidious.io/instances.json\
    *   **Filter Logic:** Iterate JSON. Skip any URI containing \.onion\ or \.i2p\. Keep if \pi\ boolean is \	rue\. Extract the \uri\ value.

### 2. Node.js Backend Architecture
1. **The Pulse Checker (Cron):** A \setInterval\ that runs exactly once every 60 minutes in the backend. It performs a fast \GET\ check to the three Master URLs above.
2. **The Active Pool (Memory Cache):** The resulting healthy instances (100+ URLs) are merged and stored in high-speed application memory (e.g., \let activeProxyPool = []\).
3. **The Router Roulette:** When a download request triggers Layer 1 or fallback architectures:
   \\\	ypescript
   // Grab a random, healthy API from the active pool to spread our scrape payload
   const proxy = activeProxyPool[Math.floor(Math.random() * activeProxyPool.length)];
   \\\

### 3. Meta / Instagram Ultimate Bypass
The Omni-Aggregator works for YouTube perfectly. However, **Meta will instantly ban data-center IPs**. 
For Instagram/Facebook, the *only* permanent free unban method is **Client-Side Extraction** (Phase 3 in the waterfall). 
We will shift the network payload request completely out of our server and onto the *User's Client*. The React frontend will bounce through a raw CORS worker to Meta directly. Because the metadata query originates from a random end-user’s **Home Wi-Fi (Jio, Airtel, residential routing)**, Meta does NOT block it. This effectively provides infinite free residential proxies utilizing our own user traffic.

---

## 🛠️ Automated Execution: Cloudflare Worker Hardened Spoofing Code
To accurately test if Layer 2 can bypass Meta/YouTube, the Cloudflare Worker cannot just proxy standard requests. It MUST strip out its Cloudflare datacenter identifiers and inject ultra-realistic residential mobile headers. 
Here is the exact code to be pasted into the Cloudflare Worker to deploy this spoofing logic:

\\\javascript
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
\\\

---

## 🏗️ Automated Execution: Building the "Omni-Aggregator" Router
To avoid single-point-of-failure bans without paying for proxies, we will automate the "Cobalt Aggregator Mix". Our Node.js backend will run a background cron job to scrape and maintain a live pool of community extraction APIs from three massive open-source networks.

### 1. The Master Node Endpoints
Our cron job will periodically fetch these Master URLs to build the proxy array:

*   **Network 1: Cobalt Master Tracker** 
    *   **URL:** \https://instances.cobalt.best/api/instances.json\
    *   **Filter Logic:** Iterate JSON. Only push URLs where \online.api == true\ and \cors == true\.
*   **Network 2: The Piped Array (YouTube Failsafe 1)**
    *   **URL:** \https://piped-instances.kavin.rocks/\
    *   **Filter Logic:** Read the "backends" array. Push the active \pi_url\ keys.
*   **Network 3: The Invidious Array (YouTube Failsafe 2)**
    *   **URL:** \https://api.invidious.io/instances.json\
    *   **Filter Logic:** Iterate JSON. Skip any URI containing \.onion\ or \.i2p\. Keep if \pi\ boolean is \	rue\. Extract the \uri\ value.

### 2. Node.js Backend Architecture
1. **The Pulse Checker (Cron):** A \setInterval\ that runs exactly once every 60 minutes in the backend. It performs a fast \GET\ check to the three Master URLs above.
2. **The Active Pool (Memory Cache):** The resulting healthy instances (100+ URLs) are merged and stored in high-speed application memory (e.g., \let activeProxyPool = []\).
3. **The Router Roulette:** When a download request triggers Layer 1 or fallback architectures:
   \\\	ypescript
   // Grab a random, healthy API from the active pool to spread our scrape payload
   const proxy = activeProxyPool[Math.floor(Math.random() * activeProxyPool.length)];
   \\\

### 3. Meta / Instagram Ultimate Bypass
The Omni-Aggregator works for YouTube perfectly. However, **Meta will instantly ban data-center IPs**. 
For Instagram/Facebook, the *only* permanent free unban method is **Client-Side Extraction** (Phase 3 in the waterfall). 
We will shift the network payload request completely out of our server and onto the *User's Client*. The React frontend will bounce through a raw CORS worker to Meta directly. Because the metadata query originates from a random end-user’s **Home Wi-Fi (Jio, Airtel, residential routing)**, Meta does NOT block it. This effectively provides infinite free residential proxies utilizing our own user traffic.

---

## 🛠️ Automated Execution: Cloudflare Worker Hardened Spoofing Code
To accurately test if Layer 2 can bypass Meta/YouTube, the Cloudflare Worker cannot just proxy standard requests. It MUST strip out its Cloudflare datacenter identifiers and inject ultra-realistic residential mobile headers. 
Here is the exact code to be pasted into the Cloudflare Worker to deploy this spoofing logic:

\\\javascript
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
\\\

---

## 🏗️ Automated Execution: Building the "Omni-Aggregator" Router
To avoid single-point-of-failure bans without paying for proxies, we will automate the "Cobalt Aggregator Mix". Our Node.js backend will run a background cron job to scrape and maintain a live pool of community extraction APIs from three massive open-source networks.

### 1. The Master Node Endpoints
Our cron job will periodically fetch these Master URLs to build the proxy array:

*   **Network 1: Cobalt Master Tracker** 
    *   **URL:** \https://instances.cobalt.best/api/instances.json\
    *   **Filter Logic:** Iterate JSON. Only push URLs where \online.api == true\ and \cors == true\.
*   **Network 2: The Piped Array (YouTube Failsafe 1)**
    *   **URL:** \https://piped-instances.kavin.rocks/\
    *   **Filter Logic:** Read the "backends" array. Push the active \pi_url\ keys.
*   **Network 3: The Invidious Array (YouTube Failsafe 2)**
    *   **URL:** \https://api.invidious.io/instances.json\
    *   **Filter Logic:** Iterate JSON. Skip any URI containing \.onion\ or \.i2p\. Keep if \pi\ boolean is \	rue\. Extract the \uri\ value.

### 2. Node.js Backend Architecture
1. **The Pulse Checker (Cron):** A \setInterval\ that runs exactly once every 60 minutes in the backend. It performs a fast \GET\ check to the three Master URLs above.
2. **The Active Pool (Memory Cache):** The resulting healthy instances (100+ URLs) are merged and stored in high-speed application memory (e.g., \let activeProxyPool = []\).
3. **The Router Roulette:** When a download request triggers Layer 1 or fallback architectures:
   \\\	ypescript
   // Grab a random, healthy API from the active pool to spread our scrape payload
   const proxy = activeProxyPool[Math.floor(Math.random() * activeProxyPool.length)];
   \\\

### 3. Meta / Instagram Ultimate Bypass
The Omni-Aggregator works for YouTube perfectly. However, **Meta will instantly ban data-center IPs**. 
For Instagram/Facebook, the *only* permanent free unban method is **Client-Side Extraction** (Phase 3 in the waterfall). 
We will shift the network payload request completely out of our server and onto the *User's Client*. The React frontend will bounce through a raw CORS worker to Meta directly. Because the metadata query originates from a random end-user’s **Home Wi-Fi (Jio, Airtel, residential routing)**, Meta does NOT block it. This effectively provides infinite free residential proxies utilizing our own user traffic.
