# Copilot Instructions — BongBariComedy

Purpose: Make AI agents productive fast by documenting how this repo is organized, how it builds/tests/deploys, and the project-specific patterns to follow.

## Platform policy (read first)
- Frontend hosting: GitHub Pages (canonical domain: `www.bongbari.com`).
- Backend: Render (`https://bongbaricomedy.onrender.com`).
- Replit is banned (legacy/ex-platform). Do not add any Replit scripts, SDKs, or plugins. If you see any Replit banner/scripts, remove them.
- Do not introduce Netlify/Vercel changes unless explicitly requested; our SPA routing relies on the GitHub Pages `404.html` strategy.

## 🎯 **Site Features & Integrations (October 2025)**
### **Enhanced Legal Pages** ✅
- **Privacy Policy** (`/privacy`): 17 comprehensive sections, ultra-compact spacing, scrollable UX
- **Terms & Conditions** (`/terms`): 18 detailed legal sections, professional layout
- **Features**: Fixed headers, custom scrollbars, mobile-responsive, legal compliance ready

### **Analytics & Tracking Stack** ✅
- **Meta Pixel**: ID `1438457663902341` - Facebook/Instagram advertising analytics (correctly placed in head + noscript in body)
- **Google Analytics**: ID `G-3MYRJ1EJ7N` - Website traffic, user behavior, conversion tracking
- **Enhanced Measurement**: Auto-tracks page views, scrolls, outbound clicks, file downloads
- **Coverage**: All pages including SPA routes, 404 errors, deep links
- **Implementation**: Properly integrated in Vite build template (`client/index.html`)

### **SEO & Structured Data** ✅
- **Schema Markup (JSON-LD)**: LocalBusiness + Organization structured data for Google Rich Results
- **sitemap.xml**: 9 pages indexed with proper priorities and change frequencies
- **robots.txt**: Search engine guidelines, admin protection, asset management
- **Google Search Console**: Verified domain with sitemap submission ready
- **Rich Results**: Organization details, contact info, business address, geo-coordinates

### **Domain & Hosting Setup** ✅
- **Primary Domain**: `www.bongbari.com` (CNAME configured)
- **SSL Certificate**: Auto-enabled via GitHub Pages
- **CDN**: Global content delivery through GitHub's infrastructure
- **Backend API**: `bongbaricomedy.onrender.com` for dynamic features
- **Build System**: Vite with dual template system (client/index.html for production builds)

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

## Quick Start
- Open project in VS Code, ensure Copilot enabled.
- Run locally:
  ```powershell
  npm install   # only if deps changed
  npm run dev:live   # (does: kill ports -> open server window -> start client)
  ```
- Browse `http://localhost:5173` and iterate. Commit to `main` to auto-deploy.

### Manual (Alternate) Startup (No combined script)
If `dev:live` ever fails you can run the three steps yourself:
```powershell
npm run start:clean      # kill ports 5000 5173 8888
npm run start:server     # starts backend (in one terminal)
npm run start:client     # starts frontend (second terminal)
```
Then open `http://localhost:5173`.

### Hassle‑free Deploy (Non‑coder)
- Use one of these from VS Code Terminal (PowerShell):
  - Safe deploy (recommended): `npm run deploy:safe` – runs preflight (typecheck + build + verify), commits with `FORCE_PAGES_DEPLOY`, pushes.
## Non‑Coder Safe: View/Diff/Restore Any File From GitHub
- Show remote version (from GitHub `main`) of a file:
  npm run git:fetch ; npm run remote:file -- client/src/index.css
  ```
- See differences between your local file and GitHub `main`:
  ```powershell
  npm run git:fetch ; npm run diff:file -- client/src/index.css
- Safely restore your local file from GitHub `main` (auto‑backup to `.backups/`):
  ```powershell
  npm run restore:file -- client/src/index.css
  ```
  ```powershell
  npm run backup:file -- client/src/index.css
  ```
- These commands never push; they only fetch, view, diff, and restore locally.
- After restore, you can run locally and verify before committing.

## Architecture
- Server: Express (TS, ESM) in `server/`, all API under `/api/*`. Dev injects Vite middleware; prod serves `dist/public/` (see `server/vite.ts`). Backend hosted on Render `https://bongbaricomedy.onrender.com`.
- Data: Drizzle ORM with Neon Postgres when `DATABASE_URL` exists; otherwise `MemStorage` stubs. Shared schema/types in `shared/` (`shared/schema.ts`). SQLite schemas exist for local utilities, but **SQLite is not used for app data; all features require Neon/Postgres**.
- Vite aliases: `@` → `client/src`, `@shared` → `shared`, `@assets` → `attached_assets`.
## Dev / Build / Test
- Run local (frees ports first if needed):
  ```powershell
  npm run dev:live
  ```
- Build client (creates SPA `404.html`): `npm run build:client`. Full build (client + bundle server): `npm run build`.
- Type check: `npm run check`. Preflight (non-coder safe): `node scripts/preflight.cjs`.
- Tests: Vitest integration hits `http://localhost:5000`. CI: start backend `npm run dev:server:esm` → wait for `/api/version` → `npm run test:integration` (see `.github/workflows/ci-tests.yml`, `tests/api.test.ts`).

  - For non-GET requests send `X-CSRF-Token` (managed via `setCSRFToken()` in `queryClient.ts`). Refresh with `GET /api/auth/csrf-token`.
  - Include `Authorization: Bearer <sessionId>` for protected endpoints.
- Selection: `server/storage.ts` chooses Postgres (`server/db.pg.ts`) when `DATABASE_URL` exists, else `MemStorage` stubs.
- Schemas: primary in `shared/schema.ts` (Postgres). Optional local SQLite: `drizzle.sqlite.config.ts` + `shared/schema.sqlite.ts`.
- Don’t commit `dist/`—GitHub Actions handles Pages deploy. Commit messages may use `type(scope): message`.
- Backend env via `server/.env` (fallback to root `.env`): `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`, optional `YOUTUBE_CHANNEL_ID`, Upstash tokens.
- Edit features/content; test at `http://localhost:5173`.
- Commit/push to `main` to deploy frontend (Pages) and backend (Render) automatically.
## Key Paths
- API base and helpers: `client/src/lib/queryClient.ts`.
- Endpoints: `server/routes.ts`.
- Storage: `server/storage.ts`, `server/postgresStorage.ts`.
- Build glue: `scripts/postbuild-spa-404.cjs`, `scripts/preflight.cjs`.
- Tooling: `vite.config.ts`, `server/vite.ts`.
- CI/Deploy: `.github/workflows/ci-tests.yml`, `.github/workflows/deploy.yml`.
## Testing Checklist
- Login works (200 + `sessionId` + CSRF stored).
- Protected calls succeed (e.g., `/api/auth/me`).
- Deep links like `/admin` load the SPA (not GH 404); `404.html` mirrors `index.html`.
- Network calls use absolute API base (Render), not relative `/api`.
- No console errors or mixed-content warnings.

## Troubleshooting
- API base issues: check `window.__API_BASE__` in console; ensure `404.html` matches `index.html`; verify `ensureApiBase()` path.
- CI failures: open the failed job log in Actions; copy the last 20 lines for debugging.
- Local Postgres vs memory: without `DATABASE_URL`, community features are stubs; use Neon for full behavior.

### Google OAuth (Dev/Prod) — Quick Runbook
- Client builds Google login URL via `buildApiUrl('/api/auth/google')` so base is automatic.
- Dev: `client/.env` must contain `VITE_API_BASE=http://localhost:5000`.
- Server decides redirect URI by `process.env.NODE_ENV?.trim() === 'production'`:
  - Dev → `http://localhost:5000/api/auth/google/callback`
  - Prod → `https://bongbaricomedy.onrender.com/api/auth/google/callback`
- Google Cloud Console must include:
  - JavaScript origins: `https://www.bongbari.com`, `http://localhost:5173` (optionally `http://localhost:5000`)
  - Redirect URIs: `https://bongbaricomedy.onrender.com/api/auth/google/callback`, `http://localhost:5000/api/auth/google/callback`
- If you see `redirect_uri_mismatch`:
  1) Recheck Console URIs (exact match), save, wait 1–10 minutes.
  2) In dev, ensure `VITE_API_BASE` points to `http://localhost:5000` and restart Vite.
  3) Hard refresh or use Incognito window.
  4) Sanity: `GET /api/version` → environment should be `development` (no trailing spaces). Hitting `/api/auth/google` should include the expected `redirect_uri` in the 302 Location.

### Blank Site (White Screen) on GitHub Pages
- If the live site is blank, check browser DevTools → Network tab. If the main JS bundle (e.g., `index-xxxx.js`) returns HTML or a redirect, the deploy is out of sync.
- Always wait for the Pages workflow to finish before checking the live site. Hard refresh (Ctrl+F5) after deploy.

### 🚨 CRITICAL MISTAKES TO AVOID (Lessons from October 13, 2025 Incident)
**NEVER DO THESE - THEY BREAK WORKING SITES:**

1. **NEVER TOUCH THE CNAME FILE** unless explicitly asked to change domains
   - Site was working perfectly at `www.bongbari.com`
   - Agent saw user accessing `bongbari.com` (without www) showing blank
   - Agent wrongly changed CNAME from `www.bongbari.com` to `bongbari.com`
   - This broke the entire DNS setup and caused routing failures
   - **Correct action**: Tell user to use `www.bongbari.com` instead

2. **Don't "fix" working configurations**
   - If homepage works but user accesses wrong URL, guide them to correct URL
   - Don't modify technical files to match user's incorrect URL
   - DNS/CNAME changes take time to propagate and can break everything

3. **Blank site troubleshooting order:**
   - First: Check if user is using correct domain (www vs non-www)
   - Second: Check build assets and deployment
   - Last resort: Consider CNAME/DNS changes (and ask first!)

4. **When site works locally but not live:**
   - Usually deployment propagation issue (wait 2-3 minutes)
   - Or user accessing wrong domain variant
   - NOT a reason to change CNAME file

**Remember: "If it ain't broke, don't fix it!" - Especially CNAME files.**

## Security Notes
- Never log tokens; store admin session in `localStorage['admin_session']` only.
- Always send `X-CSRF-Token` for non-GET requests when authenticated.


## Hero/CTA Desktop Sizing & Section Rules (Zero-Mismatch)
- On desktop, the hero video container (`.mobile-video-container`) must use:
  - `max-width: 520px` at `min-width: 768px` (tablet)
  - `max-width: 600px` at `min-width: 1024px` (desktop)
- Always force `compactHero` mode for desktop hero section for above-the-fold visibility.
- The 3 CTA buttons ("Bong Kahini", "Subscribe", "Collab?") must end the first hero section, with extra bottom margin (`mb-4 sm:mb-6`) to clearly separate from the next section.
- Never increase hero/video size or spacing unless above-the-fold visibility is confirmed on desktop.
- Do not change these rules unless updating both code and this instruction file together.

## Agent Playbook
- Add an API route (server): edit `server/routes.ts`.
  ```ts
  // ...existing imports and middleware
  app.get('/api/ping', (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });
  // For protected POSTs: use Authorization header and expect CSRF header on client
  app.post('/api/admin/example', isAuthenticated, async (req, res) => {
    // optional: validateCSRF(req,res,next) pattern if you add it here
    res.json({ ok: true });
  });
  ```
- Call it from the client (use helpers):
  ```ts
  import { apiRequest } from '@/lib/queryClient';
  const data = await apiRequest('/api/ping');
  // For mutations after login, CSRF is auto-attached if set via login flow
  await apiRequest('/api/admin/example', { method: 'POST', body: JSON.stringify({ foo: 'bar' }), headers: { 'Content-Type': 'application/json' } });
  ```
- Write/extend an integration test: update `tests/api.test.ts`.
  ```ts
  test('ping works', async () => {
    const res = await fetch(`${API_BASE}/api/ping`);
    const j = await res.json();
    expect(res.status).toBe(200);
    expect(j).toHaveProperty('ok', true);
  });
  ```
- Env/secrets checklist (local dev): `server/.env`
  - Required: `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`
  - Optional: `YOUTUBE_CHANNEL_ID`, Upstash `UPSTASH_REST_URL`, `UPSTASH_REST_TOKEN`
- Handy commands (PowerShell):
  ```powershell
  npm run predev:live; npm run dev:live        # run servers
  npm run check                                 # typecheck
  npm run build:client                          # build SPA + 404.html
  npm run test:integration                       # run API tests (needs :5000)
  ```

## ✅ Safe‑Ops Guide & Deploy Checklist (Zero-Regressions)

Follow these rules to avoid the exact mistakes we hit. Treat this as the guardrail playbook.

### 1) Which HTML to edit (critical)
- Always add tracking/meta/JSON‑LD to `client/index.html` (Vite template).
- Do NOT add or rely on root `index.html` for production tracking.
- `404.html` is auto‑generated from the built `index.html` by `scripts/postbuild-spa-404.cjs`.

### 2) Analytics placement rules (Vite/HTML compliant)
- Meta Pixel script goes in `<head>`. The required `<noscript>` image MUST be in `<body>` (never in `<head>`).
- GA4 `gtag` `<script async>` in `<head>`, with the config block right after it.
- Do not mount analytics inside React components; keep them in the HTML template so they load on first paint.

### 3) SEO files must live in Vite public
- Put `robots.txt` and `sitemap.xml` in `client/public/` so they ship to production at `/robots.txt` and `/sitemap.xml`.
- If you place them at repo root, the SPA will serve an in‑app 404 instead.

### 4) SPA routing on GitHub Pages
- We rely on `404.html` to boot the SPA for deep links. Never delete the postbuild script.
- If a deep link shows GitHub’s native 404, ensure the build ran and `dist/public/404.html` exists and matches `index.html`.

### 5) Canonical domain and CNAME (do not change)
- Canonical domain: `www.bongbari.com`. Do not edit `CNAME` unless explicitly changing domains.
- If someone opens `bongbari.com` (apex) and sees issues, guide them to `www.bongbari.com`. Do NOT “fix” CNAME.

### 6) Safe deploy flow
1. Optional sanity: `npm run check`
2. Build client: `npm run build:client` (generates SPA `404.html`)
3. Commit with message containing `FORCE_PAGES_DEPLOY` to bust caches deterministically.
4. Push to `main`. Wait for GitHub Pages to finish. Hard refresh (Ctrl+F5).

### 7) After‑deploy verification (2 minutes)
- Open `https://www.bongbari.com`
- Check `https://www.bongbari.com/robots.txt` returns plain text (no SPA content)
- Check `https://www.bongbari.com/sitemap.xml` returns XML
- View source: ensure Meta Pixel and GA4 exist in `<head>`, and Pixel `<noscript>` exists in `<body>`
- Google Rich Results Test: confirm JSON‑LD detected
- DevTools Network: main JS bundle returns JS (not HTML)

### Quick Runbooks

• Robots/sitemap return SPA 404
- Move `robots.txt` and `sitemap.xml` to `client/public/`
- `npm run build:client` → commit (include `FORCE_PAGES_DEPLOY`) → push

• Schema Markup not detected
- Ensure `<script type="application/ld+json">…</script>` is in `client/index.html` `<head>`
- Rebuild and deploy, then re‑test in Google Rich Results

• Vite build fails with `disallowed-content-in-noscript-in-head`
- Move the `<noscript>` block to `<body>`
- Keep the Pixel JS in `<head>`

• Deep link shows GitHub 404 page
- Ensure build ran and `scripts/postbuild-spa-404.cjs` created `dist/public/404.html`
- Wait for Pages publish, hard refresh

• Homepage blank / JS bundle returns HTML
- Likely Pages cache mismatch. Wait for Pages workflow to finish, then hard refresh
- If still broken: verify that `404.html` mirrors `index.html`, and that the built JS bundle URL actually returns JS (not HTML)

## 🚨 **EMERGENCY DEPLOYMENT INCIDENT PLAYBOOK (October 17, 2025)**

**Critical Rule for Non-Coders: When site crashes with broken JS files, NEVER experiment - use emergency deployment immediately.**

### **Common Symptoms:**
- Site shows loading spinner forever (`"Loading Bong Bari..."`)
- Browser DevTools shows 404 errors for JS files (e.g., `un2ETt.js` not found)
- Console errors about missing script resources
- Blank white screen or stuck loading state

### **Root Cause Analysis:**
- **Build inconsistency**: Different Copilot agents/models can generate different Vite build outputs
- **Cache conflicts**: GitHub Pages serving old cached files while expecting new file names
- **Asset mismatch**: `index.html` references JS bundles that don't exist in the deployed build
- **Deployment race conditions**: Multiple builds/commits creating inconsistent asset states

### **EMERGENCY RECOVERY (Non-Coder Safe):**
```powershell
npm run deploy:safe
```

**What this does:**
1. ✅ **Preflight check**: TypeScript validation + clean build generation
2. ✅ **Asset verification**: Ensures all JS/CSS bundles exist and are properly referenced
3. ✅ **Cache busting**: Commits with `FORCE_PAGES_DEPLOY` to override GitHub Pages cache
4. ✅ **Clean deployment**: Fresh production build without asset conflicts

### **Prevention Rules:**
1. **NEVER edit production files directly** - always work locally first
2. **ALWAYS use `npm run deploy:safe`** instead of manual `git commit/push` for deployment
3. **WAIT for deployment completion** (2-3 minutes) before checking live site
4. **Hard refresh** (Ctrl+F5) after deployment to clear browser cache
5. **Document ANY emergency fixes** in copilot-instructions.md for future agents

### **Non-Coder Emergency Protocol:**
- ❌ **DON'T**: Try to fix broken JS files manually
- ❌ **DON'T**: Edit production files when site is broken
- ❌ **DON'T**: Experiment with build settings during outages
- ✅ **DO**: Run `npm run deploy:safe` immediately
- ✅ **DO**: Wait for deployment to complete
- ✅ **DO**: Document the incident for future prevention

### **Incident Documentation (October 17, 2025):**
**Problem**: Site crashed with broken `un2ETt.js` file after another Copilot model made deployment errors
**Solution**: Emergency deployment with `npm run deploy:safe` created clean build and restored site
**Lesson**: Always use safe deployment scripts, never edit production during outages
**Prevention**: This playbook added to prevent future incidents