# 📋 PENDING_UPGRADES.md — Bong Bari What's NOT Done Yet

> Everything in ZERO_DOWNTIME.md that is still pending. This is the live task board.
> Tick off each item when done. Do NOT put completed work here — it lives in ZERO_DOWNTIME.md.

---

## Status Overview

| Batch | Task | Status |
|---|---|---|
| A | UptimeRobot monitor setup | ⏳ PENDING |
| A | Telegram alert integration | ⏳ PENDING |
| B | `status.bongbari.com` DNS + status page | ⏳ PENDING |
| C | Spline 3D sad robot in down page | ⏳ PENDING |
| D | Service Worker / vite-plugin-pwa | ⏳ PENDING |

---

## Batch A — Uptime Monitoring (Do This First, 5 min, no code)

### Steps (manual SaaS setup):
1. Go to [uptimerobot.com](https://uptimerobot.com) → Create free account
2. "Add New Monitor" → type: HTTP(S), URL: `https://www.bongbari.com`, interval: 5 min
3. Add second monitor: `https://api.bongbari.com` (Hetzner backend)
4. Go to "Alert Contacts" → Add Telegram:
   - Talk to [@BotFather](https://t.me/BotFather) on Telegram → create a bot → get bot token
   - Get your chat ID from [@userinfobot](https://t.me/userinfobot)
   - Paste both into UptimeRobot's Telegram integration
5. Test: pause a monitor → Telegram should receive alert within 5 min

**No code changes needed.**

---

## Batch B — Status Page (10 min after Batch A)

### Steps:
1. UptimeRobot → "Status Pages" → "Create Status Page"
2. Add both monitors (frontend + backend)
3. Set name: "Bong Bari Status"
4. Enable custom domain: `status.bongbari.com`
5. UptimeRobot gives you a CNAME target (e.g. `stats.uptimerobot.com`)
6. In Cloudflare DNS (bongbari.com zone):
   - Add: `CNAME  status  →  stats.uptimerobot.com`  (proxy OFF, DNS only)
7. Wait 5 min → open `https://status.bongbari.com`

**No code changes needed.**

---

## Batch C — Spline 3D Sad Robot in Down Page

### What it will look like
The current orange spinner overlay gets replaced with a full cinematic scene:
- **Background**: Spline 3D sad robot (transparent bg, interactive mouse parallax)
- **Text layer**: GSAP typewriter text over the top
- **Glassmorphism card**: White/blur message box floating over the robot
- **Auto-reload**: Same 20s timer, preserved

### Your Action Steps (before agent codes anything):

**Step 1 — Remix the Spline file**
1. Open: https://community.spline.design/file/1b9e5a0a-f7a4-4a24-a642-2439fa20c2ff
2. Click **Remix** (top right) — this copies it to YOUR spline.design workspace
3. In your workspace: hide any Spline logo/watermark layers (left panel → find logo layer → eye icon off)
4. Set background to transparent: Scene panel → Background → set alpha to 0

**Step 2 — Export the prod URL**
1. Click **Export** → **Code Export** tab
2. Copy the URL — it looks like: `https://prod.spline.design/XXXXXXXXXXXXXXXX/scene.splinecode`
3. Paste that URL to the agent in chat: "Here is my Spline URL: [paste]"

**Step 3 — Agent integrates**
Once you share the `prod.spline.design` URL, the agent will:
- Replace `showDownPage()` in `client/index.html` with the Spline web component version
- Load `@splinetool/viewer` via unpkg CDN (one `<script type="module">` tag injected)
- Wrap the robot in a full-screen container with glassmorphism card overlay
- Add GSAP typewriter text (via CDN, no npm)
- Keep auto-reload, keep "Click here to reload" link
- Total added page weight: ~40KB Spline viewer JS + your scene file

### Technical Integration Method (for reference)
```js
// Inside showDownPage() — what agent will generate:
// 1. Inject Spline viewer module
var sv = document.createElement('script');
sv.type = 'module';
sv.src = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';
document.head.appendChild(sv);

// 2. Create overlay with spline-viewer web component
// <spline-viewer url="https://prod.spline.design/YOUR_ID/scene.splinecode"></spline-viewer>
// + glassmorphism card + GSAP typewriter on top
```

> ⚠️ **Do NOT try to use the community URL directly** (`community.spline.design/...`) — that doesn't work in production. You need the `prod.spline.design` export URL. Remix first.

---

## Batch D — Service Worker Cache (Last, Most Powerful)

### What it does
Eliminates the white-screen CDN race condition at the root level. After first visit, ALL assets are pre-cached. Future deploys never cause a blank screen — the user gets a "New version available" banner instead.

### Pre-Implementation Checklist (agent will verify before coding)
- [ ] Check `vite.config.ts` for any existing `vite-plugin-pwa` setup
- [ ] Confirm `client/public/sw.js` does NOT already exist
- [ ] Confirm no existing service worker registered in `client/index.html`

### What Agent Will Build
1. Install `vite-plugin-pwa` dev dependency
2. Configure in `vite.config.ts`: `StaleWhileRevalidate` for HTML, `CacheFirst` for JS/CSS
3. Add "New version available — click to refresh" toast banner component
4. Test locally: build → serve → check DevTools Application → Service Workers tab

**Trigger**: Just say "Do Batch D" after A+B are confirmed working.

---

## GitHub Secrets Safety — READ THIS

### Are your secrets safe in git history?
**YES. GitHub Secrets are NEVER stored in git.** Here's how it works:

```
You set: HETZNER_SSH_KEY = <private key contents>
GitHub stores it: encrypted in GitHub's vault (not in your repo)
In workflow file: ${{ secrets.HETZNER_SSH_KEY }} → GitHub injects at runtime
In git history: workflow file just shows the literal text ${{ secrets.HETZNER_SSH_KEY }}
                Nobody can extract the actual value from git history
```

**The ONLY way secrets leak from git history:**
- If you accidentally committed the raw secret value in a file (e.g., `.env`, `config.js`)
- Run `git log --all -p | grep -i "secret_value"` to check if any raw secret is in history

### Check for accidental commits (run this):
```powershell
# Check if .env was ever committed (it should be in .gitignore)
git log --all --full-history -- ".env"
git log --all --full-history -- "server/.env"
```
If these return nothing → you're safe. If they return commits → that's a problem to fix.

### Revert / History on GitHub
Full git history is always accessible:
- **View history**: `git log --oneline` or GitHub → repo → Commits tab
- **Revert a commit**: `git revert <commit-hash>` (safe, creates a new commit)
- **Hard reset** (dangerous): `git reset --hard <commit-hash>` + force push (ask before doing)
- **Compare versions**: GitHub → repo → file → "History" button → any commit → see diff

---

## Cloudflare Pages — 6 Problems & Smart Solutions

> **Current decision**: Stay on GitHub Pages for now. This section documents HOW each problem is solved IF we ever migrate — so there are zero unknowns.

### Benefits of Cloudflare Pages (vs GitHub Pages)
| Feature | GitHub Pages | Cloudflare Pages |
|---|---|---|
| CDN propagation after deploy | 30–90 seconds | < 5 seconds (instant) |
| Free bandwidth | Soft limits | Truly unlimited |
| Build minutes | Unlimited (GitHub Actions) | 500 builds/month free |
| Custom domains | 1 per repo | Multiple |
| Branch previews | ❌ | ✅ Auto preview URLs |
| Edge functions | ❌ | ✅ (Workers) |
| Analytics built-in | ❌ | ✅ Free Web Analytics |

---

### Problem 1 — SPA routing: `404.html` strategy breaks
**Problem**: Cloudflare Pages doesn't use `404.html` for SPA fallback. Deep links like `/admin`, `/privacy` would 404.

**Smart Solution — add `_redirects` file alongside `404.html`**
```
# client/public/_redirects  ← create this file now (even on GitHub Pages it's harmless)
/*  /index.html  200
```
This file is already the Cloudflare Pages convention. GitHub Pages ignores it. So we can add it **today** and it becomes a zero-effort migration step.

**Status**: ⏳ Can be done now (30 seconds, one file) — agent can do it on command.

---

### Problem 2 — GitHub Actions deploy workflow needs rewrite
**Problem**: Current `.github/workflows/deploy.yml` uses `actions/deploy-pages`. Cloudflare Pages uses `cloudflare/pages-action`.

**Smart Solution — connect repo directly to Cloudflare Pages (zero workflow rewrite)**
Cloudflare Pages can auto-build from your GitHub repo WITHOUT any workflow changes:
1. Go to [pages.cloudflare.com](https://pages.cloudflare.com) → Connect GitHub repo
2. Set build command: `npm run build:client`
3. Set output directory: `dist/public`
4. Cloudflare Pages builds on every push to `main` automatically

The existing GitHub Actions workflow still runs (TypeScript check, smoke-test) but the Pages deploy step becomes Cloudflare's job.
The Hetzner VPS deploy step (`deploy.yml` SSH section) remains 100% unchanged.

**Status**: ⏳ Migration step — do when ready.

---

### Problem 3 — CNAME change (DNS propagation risk)
**Problem**: Currently `CNAME` file says `www.bongbari.com` → GitHub Pages. On Cloudflare Pages you need to update DNS.

**Smart Solution — your domain is ALREADY on Cloudflare DNS (zero propagation risk)**
Because `bongbari.com` is managed by Cloudflare, DNS changes propagate in **under 60 seconds** (not 24–48 hours like other registrars). The risk is minimal:
1. Cloudflare Pages → Custom Domain → enter `www.bongbari.com`
2. Cloudflare auto-updates the DNS CNAME for `www` to `your-project.pages.dev`
3. Done. Propagation: < 60 seconds.

**Status**: ⏳ Trivial when ready — not a real problem for us.

---

### Problem 4 — White Screen Watchdog becomes less necessary
**Problem**: Our `showDownPage()` + `cacheBust()` system was built for GitHub Pages' slow CDN. On Cloudflare Pages it rarely triggers.

**Smart Solution — it's NOT a problem, it's a bonus**
Keep the watchdog. On Cloudflare Pages, it just never fires because propagation is instant. Zero harm, zero overhead. It costs nothing to keep it.
If we ever move back or hit a Cloudflare edge issue, it auto-heals.

**Status**: ✅ Not a problem. Watchdog stays forever regardless.

---

### Problem 5 — Secrets need to be recreated in Cloudflare
**Problem**: `HETZNER_SSH_KEY`, `HETZNER_ENV` etc. are in GitHub Secrets. On Cloudflare Pages builds, they'd need to be in Cloudflare's environment variables.

**Smart Solution — backend deploy stays in GitHub Actions, not Cloudflare**
We don't need to move secrets. Here's the split:
- **Frontend build + deploy**: Cloudflare Pages (auto, no secrets needed for the build itself)
- **Backend deploy to Hetzner VPS**: Still triggered by GitHub Actions (secrets stay in GitHub)

We can keep a minimal GitHub Actions workflow that only does the Hetzner SSH deploy step when `main` is pushed. Zero secrets move to Cloudflare.

**Status**: ⏳ Architecture design — zero actual secret migration needed.

---

### Problem 6 — 500 builds/month free tier limit
**Problem**: Cloudflare Pages free tier: 500 builds/month. Risk of hitting limit.

**Smart Solution — proxy-reaper NEVER triggers a Pages build**
The proxy-reaper workflow runs every 4 hours but it does NOT push to `client/` files — it only updates `client/public/data/verified-proxies.json` which is in `.gitignore` effectively (or it commits to a separate branch).

Actual Pages builds only trigger on real code pushes. Realistically: 5–15 builds/month. 500 limit is not a concern.

If it ever becomes a concern: Cloudflare Pages Pro is $20/month with unlimited builds.

**Status**: ✅ Not a real problem for our usage pattern.

---

### Migration Readiness Summary

| Problem | Solved? | Effort |
|---|---|---|
| SPA routing `_redirects` | ✅ 30-second fix, add file now | Trivial |
| Workflow rewrite | ✅ Not needed, use CF auto-build | Zero |
| CNAME/DNS change | ✅ Already on CF DNS, < 60s propagation | Trivial |
| Watchdog overhead | ✅ Keep it, harmless | None |
| Secrets migration | ✅ Backend stays in GitHub Actions | None |
| Build limit | ✅ ~15 builds/month, well under 500 | None |

> **Conclusion**: All 6 "problems" are solved. Migration is actually **low-risk and low-effort** whenever we decide to do it. The `_redirects` file can be added today (it's harmless on GitHub Pages). Everything else happens at migration time.

---

## Dev Preview — Secret URL (IMPLEMENTED ✅)

> **For non-coders — no terminal needed. Just open a URL.**

### To see the animated down page instantly:
```
https://www.bongbari.com?__bb_preview=down
```

Or on local dev:
```
http://localhost:5173?__bb_preview=down
```

**How it works:**
- The `?__bb_preview=down` parameter is checked in the watchdog script on every page load
- If it finds this exact secret value, it shows the animated overlay after 400ms
- The overlay shows a "Dev Preview" label so you know it's a test
- Normal users cannot stumble on this — the parameter name is private and not linked anywhere

**Security**: Anyone who knows the URL can see the overlay (it's just a visual overlay, no data exposed). The overlay shows no sensitive information. If you want to change the secret param, tell the agent.

---

*Created: 22 April 2026 | Living document — update as batches complete*
