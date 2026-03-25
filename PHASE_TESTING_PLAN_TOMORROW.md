# Phase Testing & Repair Plan (Tomorrow)

## 📌 Objective
Systematically test, repair, and build the dedicated downloader engine layers now that the visual Developer Tools Dropdown and core routing architecture (OOM safeguards) are stable.

## 🛠️ The Hitlist

### 1. Test & Repair Layer 2: Cloudflare (CF) Swarm Edge
- **Current Status:** Needs verification.
- **Action Plan:**
  - Force traffic to `layer2` via the new Developer UI.
  - Verify if our Cloudflare Workers are successfully bypassing YouTube BotGuard.
  - Confirm if Meta (Instagram/FB) is indeed strictly blocking Datacenter IPs at the Cloudflare edge (and log the exact HTTP code).
  - *Goal:* Ensure smooth passthrough for YT and immediate, clean rejection for Meta so it falls back to ASocks organically without hanging.

### 2. Build Layer 3: Native IPv6 Direct (Hetzner)
- **Current Status:** Needs to be built.
- **Action Plan:**
  - Build out a custom Native IPv6 rotation proxy inside of the server environments.
  - *Why:* YouTube tracks standard IPv4 aggressively. Utilizing the massive `/64` IPv6 blocks provided by servers (like Hetzner) allows us to bypass YouTube rate limits locally without burning Cloudflare/Cobalt limits.
  - *Goal:* Write the network interface logic to route metadata fetches dynamically through changing IPv6 addresses.

### 3. Test & Patch Layer 4: YTDL-Core Spoofer
- **Current Status:** Needs validation against current Google 403 rate limits.
- **Action Plan:**
  - Force YouTube links through `layer4`.
  - Validate if the generic `ytdl-core` implementation is throwing `403 Forbidden` or BotGuard "signCode" errors.
  - Implement advanced Headless PO-Token solvers or OAuth2 bypass injections if the standard engine fails.
  - *Goal:* Ensure we have a bulletproof Node.js native fallback that doesn't depend on external Cobalt APIs if they go down.

## 🧪 Execution Protocol
For each layer, we will:
1. Select the target layer strictly from the **Developer Engine Override** dropdown.
2. Input a test URL (1 Meta URL, 1 YouTube URL).
3. Observe the internal logs to ensure no other layer was accidentally triggered.
4. Patch the respective backend codebase until it yields a clean `200 OK` direct CDN stream payload.