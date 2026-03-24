# 🏗️ BONG BARI DOWNLOADER: THE 4-LAYER UNBREAKABLE ARCHITECTURE

**Status:** Layer 1 is 🟢 LOCKED AND TESTED. Moving to Layer 2.
**Goal:** Universal downloading (YouTube, Instagram, Facebook) with zero blocks, zero bandwidth costs, and endless fallback pipelines.

---

## 🟢 LAYER 1: The Golden Engine (Untouched & Locked)
**Status:** ✅ COMPLETED & DEPLOYED
**Target:** YouTube (Shorts & Long)
* **How it works:** Requests route instantly to your private Hetzner VPS running the Cobalt engine (`78.47.104.43:9000`). 
* **The Magic:** Bypasses Google's bot checks completely because it's a fresh, non-datacenter-flagged IP hitting Cobalt's built-in PO-Token solver.
* **Cost:** $0 Bandwidth on Render. 

---

## � LAYER 2: The "Ghost" Proxy Bypass (Specifically for IG/FB)
**Status:** ✅ COMPLETED & DEPLOYED (via Public Mirror APIs)
**Target:** Instagram Reels, Facebook Public Videos
* **The Problem:** Instagram blocks `yt-dlp` from extracting data if no login cookie is found. It gives an "Empty Media File" error.
* **The Smart Fix:** Instead of relying on proxy + yt-dlp which forces a cookie wall, we intercept Meta platforms immediately and route them through community-driven Cobalt mirrors (`co.wuk.sh`, `api.cobalt.tools`) via a headless NodeJS fetch script spoofing a browser user-agent.
* **The Advantage:** These mirrors already process millions of requests and maintain highly-rotated, active bot-bypassing Instagram cookies dynamically. We bounce the URL there, grab the raw CDN, and completely bypass Render/Proxy IP restrictions.

---

## 🔴 LAYER 3: The yt-dlp Rotator Engine (The Safety Net)
**Status:** 🟡 DESIGNED, READY TO INTEGRATE
**Target:** Absolute Fallback for all platforms if Layer 1 & 2 fail.
* **The Hack:** ASocks uses a format like `hold-session-session-69badf0...`. 
* We inject a **Random Crypto Generator** into the codebase. Every time Layer 3 runs, it scrambles the session ID: `hold-session-session-A7X9...` then `hold-session-session-M4B2...`.
* **Result:** Every single extraction gets a brand-new IP from the ASocks global pool. 
* **TV/iOS Headers injected to yt-dlp:** We will forcefully add `--extractor-args "youtube:player_client=ios,tv"` to the yt-dlp execution, dodging Captcha walls instantly.

---

## 🟣 LAYER 4: The Nuclear Option (Hetzner IPv6 Rotation)
**Status:** 📘 PLANNED (To be built natively into the VPS if needed)
**Target:** Unlimited Free Proxying without ASocks.
* **The Concept:** Hetzner provides a massive `/64 IPv6 subnet` block (literally 18 quintillion IP addresses) for free. 
* **The Engineering:** By writing a shell script on the Linux VPS using `ip -6 route` tables and `ndppd`, we can command the VPS to assign itself a randomly generated IPv6 address for *every single scrape*.
* **Why it's Layer 4:** Setting up IPv6 rotation is deeply complex Linux networking and some platforms (like Instagram) still prefer IPv4 for native API calls. We keep this documented as our ultimate anti-ban trump card. If YouTube bans Hetzner's main IP, we unleash the `/64 IPv6 Swarm`.

---

## 🗺️ EXECUTION PLAN (Agent Instructions)
1. **Never touch Layer 1 (`fetchSmartMetadata` VPS bypass).** It works. 
2. We will now build **Layer 2 (The Ghost bypass)** to handle Instagram and Facebook natively before it ever reaches yt-dlp.
3. We will then wrap the final `yt-dlp` block in **Layer 3 (ASocks rotator with TV headers)**.
---

## 🗄️ ADVANCED RESEARCH ARCHIVE: IPv6 ROTATION (DO NOT IMPLEMENT YET)
*The following is an alternative documented Vibe Coder strategy for establishing a flawless 4th Layer.*

🔥 **Real working model (Cobalt way)**
**Step 1:** Self-host Cobalt on your Hetzner VPS
✔ Already done (as per your setup)

**Step 2:** Use layered extraction
Flow:
1. Try Cobalt (IPv4)
2. If fail → Cobalt via Proxy
3. If fail → (future) IPv6

**Step 3:** Keep request behavior human-like
* no burst
* slight delay
* limited retries

🧾 **FINAL VERDICT**
**Phase 4:**
✔ Correct concept
✔ Keep as last layer
✔ Not needed now

**Cobalt:**
✔ Public API = bad (blocked)
✔ Self-host = best move
✔ But not 100% unblock forever

🧠 **ONE LINE TRUTH**
👉 You fixed the biggest problem already by self-hosting
👉 Remaining game = IP reputation + smart fallback

---

### 🟢 SETUP PLAYBOOK: IPv6 POOL ROTATION (ARCHIVED FOR FUTURE)
✅ **GOAL**
Every request → new IPv6 IP. No reuse → no pattern → harder to block.

**STEP 1 — Confirm IPv6 block**
Run: `ip -6 addr`
You should see: `inet6 xxxx:xxxx:xxxx:xxxx::/64`
👉 This /64 = your pool

**STEP 2 — Install required tools**
```bash
apt update
apt install ndppd -y
```

**STEP 3 — Configure ndppd**
Edit: `nano /etc/ndppd.conf`
```text
route-ttl 30000
proxy eth0 {
   router yes
   timeout 500
   ttl 30000
   rule xxxx:xxxx:xxxx:xxxx::/64 {
      static
   }
}
```
Restart: `systemctl restart ndppd`

**STEP 4 — Enable forwarding**
`sysctl -w net.ipv6.conf.all.forwarding=1`
Make permanent in `/etc/sysctl.conf`:
`net.ipv6.conf.all.forwarding=1`

**STEP 5 — RANDOM IPv6 GENERATOR**
`nano ipv6.sh`
```bash
#!/bin/bash
PREFIX="xxxx:xxxx:xxxx:xxxx"
RAND=$(cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 16 | head -n 1)
IP="$PREFIX:$RAND"
echo $IP
```
Make executable: `chmod +x ipv6.sh`

**STEP 6 — USE NEW IP PER REQUEST**
Every request:
```bash
IP=$(./ipv6.sh)
ip -6 addr add $IP/64 dev eth0
curl --interface $IP "https://youtube.com/..."
ip -6 addr del $IP/64 dev eth0
```

🔁 **FINAL LOGIC (IMPORTANT)**
For every single scrape: Generate new IPv6 -> Attach to interface -> Send request -> Remove IP.
* Result: Every request = new identity, no reuse.
* STRICT RULES: NEVER reuse IP, ALWAYS delete after request, Keep request speed controlled.
* RESULT: Practically unlimited IPs, Zero proxy cost, Strong anti-block layer.
