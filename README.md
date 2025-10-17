# BongBariComedy

🎭 **Bengali Comedy Channel Website** - Live at [www.bongbari.com](https://www.bongbari.com)

## 🚀 **Current Features (October 2025)**
- ✅ **Enhanced Legal Pages**: Professional Privacy Policy & Terms with scrollable UX
- ✅ **Analytics Stack**: Meta Pixel + Google Analytics (GA4) with enhanced measurement
- ✅ **SEO & Structured Data**: sitemap.xml, robots.txt, Schema Markup (JSON-LD)
- ✅ **Google Rich Results**: LocalBusiness + Organization structured data
- ✅ **Full-Stack**: React frontend (GitHub Pages) + Express backend (Render)
- ✅ **Community Features**: User content feed, admin moderation, AI chatbot
- ✅ **Professional Domain**: Custom domain with SSL certificate
- ✅ **Responsive Design**: Mobile-first with desktop optimizations

## 🔗 **Live Integrations**
- **Domain**: `www.bongbari.com` (GitHub Pages with CDN)
- **Backend**: `bongbaricomedy.onrender.com` (Express + Postgres)
- **Analytics**: Meta Pixel (`1438457663902341`) + Google Analytics (`G-3MYRJ1EJ7N`)
- **SEO**: Schema Markup for LocalBusiness, sitemap.xml, robots.txt
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

## 🔐 Google OAuth (Dev + Production)

This app uses Google OAuth for login. Follow these steps exactly.

### 1) Google Cloud Console settings
Edit your OAuth 2.0 Client ID (Web application) and set:

- Authorised JavaScript origins:
      - `https://www.bongbari.com` (production)
      - `http://localhost:5173` (local frontend)
      - `http://localhost:5000` (optional; some browsers validate origin on redirects)
- Authorised redirect URIs:
      - `https://bongbaricomedy.onrender.com/api/auth/google/callback` (production backend)
      - `http://localhost:5000/api/auth/google/callback` (local backend)

Note: After saving, Google may take 1–10 minutes to propagate changes.

### 2) Local development wiring
- Frontend API base is read from `client/.env` during dev. We include:
      - `VITE_API_BASE=http://localhost:5000`
- The login page now uses the shared API helper, so the Google button automatically opens: `http://localhost:5000/api/auth/google` in dev.
- The backend sets the OAuth redirect URI based on `NODE_ENV` (with safe trimming) to: `http://localhost:5000/api/auth/google/callback`.

### 3) Production wiring
- Frontend uses `client/.env.production` → `VITE_API_BASE=https://bongbaricomedy.onrender.com`.
- Backend redirect URI is: `https://bongbaricomedy.onrender.com/api/auth/google/callback`.
- Required server env (on Render): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

### 4) Common issues and fixes (non‑coder friendly)
- Error: `redirect_uri_mismatch` showing `https://www.bongbari.com/api/auth/google/callback`
      - Cause: frontend used wrong API base or Google Console missing correct redirect.
      - Fix:
            1. Ensure Google Console redirect URIs match exactly (see above).
            2. In dev, confirm `client/.env` has `VITE_API_BASE=http://localhost:5000`.
            3. Hard refresh the browser or use an Incognito window.
            4. Optional sanity check:
                   - Visit `http://localhost:5000/api/version` → `environment` should be `development` (no trailing spaces).
                   - Hitting `http://localhost:5000/api/auth/google` should redirect to Google; the embedded `redirect_uri` must be `http://localhost:5000/api/auth/google/callback`.

### 5) Gotchas we fixed
- We trimmed `NODE_ENV` when deciding the redirect URL to avoid accidental trailing spaces.
- We removed a hardcoded Render fallback in the login page and now always use the shared API base helper.

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
 - For local Google login testing, always open a fresh Incognito window after updating `.env` or Console settings to avoid cached bundles.

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
