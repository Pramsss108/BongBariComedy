# 🛸 ANTIGRAVITY v13.5: DOM & INFRASTRUCTURE TEST PLAN
**Objective:** Iterate on the recent tweaks without blind coding. Follow these phases sequentially so we know exactly where the pipe is breaking (if it breaks).

---

## ??? PHASE 1: The "Anti-Block" Metadata Test (Backend)
**What We Tweaked:** We injected --extractor-args "youtube:player_client=android,ios" into yt-dlp to pretend we are a mobile app, tricking YouTube into dropping the "Sign in to confirm you're not a bot" 403 blocks.
**What to Test:**
1. Open the Downloader on live ongbari.com or localhost:5173.
2. Paste any YouTube Short link (e.g., https://youtube.com/shorts/-DkS34UVEGA).
3. Press **Fetch**.
**Expected Result:** The server should process the metadata cleanly and the UI should transition to the Video Preview within 10-18 seconds. 
**If it Errors (Red UI Box):** You will see an error. Record exactly what it says (e.g., "Bot Blocked" vs "Timeout").

## ? PHASE 2: The "45s DOM Life-Support" Test (Frontend Hang Fix)
**What We Tweaked:** Previously, React violently killed the connection at 15.0 seconds (hardcoded), leaving users with a ghost "95% Resolving..." spin if the proxy took 15.5 seconds. I extended the AbortController in the React DOM to **45 seconds** to allow the proxy engine time to fallback and breathe. 
**What to Test:**
1. Use a heavy video link.
2. Watch the loading bar.
**Expected Result:** It might take slightly longer (around 15-20 seconds on Render due to free-tier lag), but **it will NOT freeze at 95% forever**. If it fails, it will smoothly trigger the red [!] ERROR box instead of freezing.

## ??? PHASE 3: The "Antigravity DOM" 404 Image Fix
**What We Tweaked:** YouTube Shorts don't always have an hqdefault.jpg, throwing nasty HTTP 404 errors in the console and breaking the visual layout with ugly "broken image" browser boxes. I injected an inline Antigravity DOM safe-hook: <img onError={(e) => e.currentTarget.style.display = 'none'} />.
**What to Test:**
1. Run a Short link that previously triggered the 404 error logs in DevTools.
**Expected Result:** The DevTools might still log a 404 network request (that's the browser hitting YouTube), but the **UI won't break**. The image will gracefully auto-hide itself against the dark g-zinc skeleton background, perfectly matching the Antigravity design system rules.

## ?? PHASE 4: The "Raw Iron" Video Stream
**What We Tweaked:** Stripped the ASocks residential proxy from the /proxy-stream endpoint. Residential proxies die when you force GBs of mp4 files through them. Render now pipes the video purely over its high-speed datacenter IP. 
**What to Test:**
1. Once the preview screen loads, click **Play** or drag the scrubber.
**Expected Result:** Zero black screens. The video buffer should fill almost instantly after fetching the source.

---

## ??? NEXT STEPS: HOW TO ITERATE
If *any* of the 4 phases above fail during your test, copy the exact failure and paste it in chat. 
We will execute rapid "surgical strikes" instead of massive rewrites:
- *If Phase 1 fails*: We rotate the proxy pool strings.
- *If Phase 2 fails*: We adjust the React UI state timing.
- *If Phase 3 fails*: We force alternative thumbnail fallbacks (like maxresdefault).
- *If Phase 4 fails*: We debug the Google CDN URL expiry limits.

**?? Your Turn:** Do a hard refresh (Ctrl + Shift + R) on the site now and run the sequential test!
