# BongBariComedy

🎭 **Bengali Comedy Channel Website** - Live at [www.bongbari.com](https://www.bongbari.com)

## 🚀 **Current Features (October 2025)**
- ✅ **Enhanced Legal Pages**: Professional Privacy Policy & Terms with scrollable UX
- ✅ **Analytics Stack**: Meta Pixel + Google Analytics (GA4) with enhanced measurement
- ✅ **SEO Optimized**: sitemap.xml, robots.txt, Google Search Console verified
- ✅ **Full-Stack**: React frontend (GitHub Pages) + Express backend (Render)
- ✅ **Community Features**: User content feed, admin moderation, AI chatbot
- ✅ **Professional Domain**: Custom domain with SSL certificate
- ✅ **Responsive Design**: Mobile-first with desktop optimizations

## 🔗 **Live Integrations**
- **Domain**: `www.bongbari.com` (GitHub Pages)
- **Backend**: `bongbaricomedy.onrender.com` (Express + Postgres)
- **Analytics**: Meta Pixel (`1438457663902341`) + Google Analytics (`G-3MYRJ1EJ7N`)
- **Database**: Neon Postgres for persistent data
- **AI**: Gemini API for chatbot functionality

## Quick Start (Simple Local Dev)
To run everything locally, use:

```powershell
npm run dev:live
```

This will:
- Kill any old server/client processes on ports 5000, 5173, 8888
- Open a new window for the backend server
- Start the frontend (Vite) in your current window

Manual steps if you want to run each part separately:
```powershell
npm run start:clean      # kill ports 5000 5173 8888
npm run start:server     # starts backend (in one terminal)
npm run start:client     # starts frontend (second terminal)
```
Then open `http://localhost:5173` in your browser.

## 🏗️ **Architecture Overview**
```
User visits www.bongbari.com
         ↓
   GitHub Pages (React SPA)
   - Meta Pixel tracking
   - Google Analytics
   - SEO optimized
         ↓ 
   API calls → bongbaricomedy.onrender.com
   - Express.js backend
   - JWT authentication
   - CSRF protection
         ↓
   Neon Database (Postgres)
   - User content
   - Analytics data
   - Persistent storage
```

**Full-stack app**: React (Vite) frontend on GitHub Pages, Express + Postgres (Neon) backend on Render. SPA routing supported with `404.html` copy. Chatbot (Gemini), community feed, admin panels.

## Quick Scripts
| Purpose | Command |
|---------|---------|
| Dev backend (watch) | `npm run dev:server:esm` |
| Dev client | `npm run client` |
| Preflight (non-coder safe check) | `node scripts/preflight.cjs` |
| Type check only | `npm run check` |
| Build client | `npm run build:client` |

## Non‑Coder Magic Deploy Guide

Push Flow (Frontend Auto Deploy to GitHub Pages):
1. (Optional) Run local preflight:
	```bash
	node scripts/preflight.cjs
	```
	Ends with `SUCCESS: Safe to push.` → proceed.
2. Commit & push to `main`.
3. GitHub Actions workflow runs. If no client-related files changed it exits early (this is normal; site stays as-is).
4. If changes detected: TypeScript check → build → verify `index.html` + `404.html` → upload → deploy.

Status Meaning:
- ✅ Email with green check: site updated.
- ❌ Email: deploy failed (your code is still safely pushed). Click “View workflow run” → open failed step → read bottom lines.

Force a Deploy Even If No Frontend Changes:
Add `FORCE_PAGES_DEPLOY` anywhere in the commit message.

## 📊 **Analytics & Tracking**
### **Integrated Tracking Stack**
- **Meta Pixel** (`1438457663902341`): Facebook/Instagram advertising analytics
- **Google Analytics** (`G-3MYRJ1EJ7N`): Website traffic, user behavior, conversion tracking
- **Enhanced Measurement**: Auto-tracks scrolls, outbound clicks, file downloads
- **Coverage**: All pages via SPA routing, including deep links and 404 errors

### **SEO Infrastructure**
- **sitemap.xml**: 9 pages indexed with priorities and change frequencies
- **robots.txt**: Search engine guidelines, protects admin areas
- **Google Search Console**: Domain verified, sitemap submitted
- **Meta Tags**: Proper titles, descriptions, canonical URLs

### **Performance Optimizations**
- **CDN**: GitHub Pages global content delivery
- **Preconnect**: YouTube, Google Fonts for faster loading
- **Code Splitting**: Lazy-loaded routes and components
- **Image Optimization**: WebP format with fallbacks

Common Failure Causes:
- Pages not enabled: Repo Settings → Pages → Source = GitHub Actions.
- Missing `index.html`: build failed earlier (see build step log).
- Permission error: rare; re-run job from GitHub UI (Actions tab).

How to Re-run Without New Commit:
GitHub → Actions → Failed run → Re-run jobs.

Need Help Debugging?
Copy/paste last ~20 lines of the failed step log.

## Structure
```
client/                         React source code
├── src/pages/PrivacyPolicy.tsx   Enhanced privacy policy (17 sections)
├── src/pages/TermsPage.tsx       Terms & conditions (18 sections)
├── src/index.css                 Desktop & global styles
└── src/mobile-overrides.css      Mobile-only responsive fixes

shared/                         Shared TypeScript schema/types
server/                         Express + storage logic  
scripts/                        Utility & build scripts
dist/public/                    Built frontend (index.html + 404.html)

Root Files:
├── index.html                  Main template (Meta Pixel + GA4)
├── 404.html                    SPA routing fallback
├── sitemap.xml                 SEO site structure (9 pages)
├── robots.txt                  Search engine guidelines
└── CNAME                       Custom domain configuration
```

## Notes
- `build:client` auto creates `404.html` for SPA deep links.
- API base is detected at runtime; deep links still work on GitHub Pages.

## Responsive CSS Workflow (Non-coder Friendly)
- Desktop and global styles: edit `client/src/index.css` only. This is the main file for all desktop and default styles.
- Mobile-only fixes: edit `client/src/mobile-overrides.css` only. This file uses `@media (max-width: 768px)` to target phones and small screens.
- Do NOT use or create a desktop override file. All desktop changes go in `index.css`.
- Tablet overrides can be added later if needed, but are not present now.

How to work:
- For desktop or global changes, ask to update `index.css`.
- For phone-only fixes, ask to update `mobile-overrides.css`.
- This keeps things simple, safe, and future-proof for non-coders.

Example:
- "Make hero headline smaller on desktop" → edit `index.css`.
- "Fix header height on mobile" → edit `mobile-overrides.css`.

No duplication, no confusion. Desktop is always in `index.css`, mobile fixes are isolated in `mobile-overrides.css`.

## Preflight Details
`scripts/preflight.cjs` runs:
1. `npm run check` (TypeScript)
2. `npm run build:client`
3. Verifies `dist/public/index.html` & `dist/public/404.html`

If any step fails it stops with a red message so you can fix before pushing.

---
Maintained by Bong Bari Comedy Automation.
