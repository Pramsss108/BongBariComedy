# Copilot Instructions — BongBariComedy

Purpose: Make AI agents productive fast by documenting how this repo is organized, how it builds/tests/deploys, and the project-specific patterns to follow.

## 🎯 **Site Features & Integrations (October 2025)**
### **Enhanced Legal Pages** ✅
- **Privacy Policy** (`/privacy`): 17 comprehensive sections, ultra-compact spacing, scrollable UX
- **Terms & Conditions** (`/terms`): 18 detailed legal sections, professional layout
- **Features**: Fixed headers, custom scrollbars, mobile-responsive, legal compliance ready

### **Analytics & Tracking Stack** ✅
- **Meta Pixel**: ID `1438457663902341` - Facebook/Instagram advertising analytics
- **Google Analytics**: ID `G-3MYRJ1EJ7N` - Website traffic, user behavior, conversion tracking
- **Enhanced Measurement**: Auto-tracks page views, scrolls, outbound clicks, file downloads
- **Coverage**: All pages including SPA routes, 404 errors, deep links

### **SEO Optimization** ✅
- **sitemap.xml**: 9 pages indexed with proper priorities and change frequencies
- **robots.txt**: Search engine guidelines, admin protection, asset management
- **Google Search Console**: Verified domain with sitemap submission ready
- **Structure**: SEO-friendly URLs, meta tags, canonical links

### **Domain & Hosting Setup** ✅
- **Primary Domain**: `www.bongbari.com` (CNAME configured)
- **SSL Certificate**: Auto-enabled via GitHub Pages
- **CDN**: Global content delivery through GitHub's infrastructure
- **Backend API**: `bongbaricomedy.onrender.com` for dynamic features

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