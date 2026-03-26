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

