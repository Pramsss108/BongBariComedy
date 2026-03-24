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

## 🟡 LAYER 2: The "Ghost" Proxy Bypass (Specifically for IG/FB)
**Status:** 🏗️ NEXT TO EXECUTE (Phase 2)
**Target:** Instagram Reels, Facebook Public Videos
* **The Problem:** Instagram blocks `yt-dlp` from extracting data if no login cookie is found. It gives an "Empty Media File" error.
* **The Smart Fix (Your TV/Mobile Header Idea!):** You are 100% right about the headers. Instead of using `yt-dlp` for this, we will write a custom native `fetch` module in Node.js.
* **The Spoofing:** We will inject **iOS/Android App Headers** (e.g., `Instagram 219.0.0.12.117 Android` or Smart TV User-Agents). Mobile API endpoints have much lower bot-protection than web endpoints. 
* **The Network:** We wrap this custom mobile-spoofed request inside your ASocks proxy. Instagram thinks a real human holding an iPhone in India is requesting the video.

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