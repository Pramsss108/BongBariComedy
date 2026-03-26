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
