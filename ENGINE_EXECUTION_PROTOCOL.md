# [AGENT-STRICT] BONG-BARI EXTRACTION ENGINE: PHASE-WISE EXECUTION PROTOCOL
**MISSION CLASSIFICATION:** Unbreakable Production YT-Extractor Deployment.
**ARCHITECTURE:** Next-Gen Cobalt Docker + IPv6 Rotation + Caching Layer on Dedicated Hetzner Node.

*CRITICAL DIRECTIVE FOR ALL AI AGENTS:* 
Do NOT hallucinate commands. Do NOT skip verification steps. Every phase must be run, tested, and validated returning a `[SUCCESS]` state before moving to the next.

## 🟩 GLOBAL PRE-FLIGHT RULES
1. **Never mock responses:** Use real outputs from terminals.
2. **Never guess network routes:** Run `ping` and `curl` tests.
3. **Rollback state:** If a phase fails permanently, gracefully revert to the preceding phase.

---

## ⚙️ INITIATION PHASE
* **PHASE 1: SSH HANDSHAKE (User Action Required)**
  * **Objective:** Establish the very first secure connection.
  * **Agentic Check:** Verify user has changed the default root password because Hetzner forces an interactive TTY password reset. Agent cannot do this autonomously without SSH keys.
  * **Gate:** Wait for user confirmation: "I'm in".

---

## 🛠️ CORE INFRASTRUCTURE (HETZNER NODE)
* **PHASE 2: SERVER HARDENING & ESSENTIALS** -> [SUCCESS]
* **PHASE 3: DOCKER DAEMON DEPLOYMENT** -> [SUCCESS]
* **PHASE 4: IPv6 NETWORK ROTATION BINDING (THE BOT-GUARD BYPASS)** -> [SUCCESS]

---

## 🚀 THE ENGINE (COBALT INSTANCE)
* **PHASE 5: COBALT ENVIRONMENT VARIABLES** -> [SUCCESS]
* **PHASE 6: COBALT DOCKER CONTAINER IGNITION** -> [SUCCESS]
* **PHASE 7: LOCAL FIREWALL (UFW) PINHOLE** -> [SUCCESS]

---

## ⚡ BACKEND INTEGRATION (RENDER / VS CODE)
* **PHASE 8: RENDER CODEBASE REFITTING** -> [SUCCESS]
* **PHASE 9: CORS & ORIGIN VERIFICATION** -> [PENDING]
  * **Objective:** Ensure the Engine Room *only* accepts requests originating from `https://www.bongbari.com` and `http://localhost:5173`.
  * **Execution:** Add CORS logic in `downloader.ts` specifically routing requests. 
  * **Verification:** Inspect simulated HTTP headers.

* **PHASE 10: AUTOMATED INTEGRATION TESTS**
  * **Objective:** Test the new pipeline from the frontend codebase.
  * **Execution:** Use `run_in_terminal` to physically curl the local `downloader.ts` which proxies to the Hetzner Node.
  * **Verification:** Valid `.mp4` URL returned with `{ status: 'success' }`.

---

## 🌐 PRODUCTION DEPLOYMENT & CACHE
* **PHASE 11: SAFE DEPLOYMENT TO GITHUB PUSH**
  * **Objective:** Deploy to Render and Github Pages.
  * **Execution:** `npm run deploy:safe`.
  * **Verification:** GH Actions completed.

* **PHASE 12: REAL-WORLD METRICS AUDIT**
  * **Objective:** Monitor traffic live via the Hetzner node.
  * **Execution:** Keep an SSH terminal explicitly streaming `docker logs -f cobalt-engine`.
  * **Verification:** Navigate to `bongbari.com`, extract a real YT video, and watch the successful log hit your personal Docker Engine.

---
`EOF - AWAITING USER TO COMPLETE PHASE 1.`