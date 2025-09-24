# Copilot Instructions — BongBariComedy

Purpose: Make AI agents productive fast by documenting how this repo is organized, how it builds/tests/deploys, and the project-specific patterns to follow.

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

## Non‑Coder Safe: View/Diff/Restore Any File From GitHub
- Show remote version (from GitHub `main`) of a file:
  ```powershell
  npm run git:fetch ; npm run remote:file -- client/src/index.css
  ```
- See differences between your local file and GitHub `main`:
  ```powershell
  npm run git:fetch ; npm run diff:file -- client/src/index.css
  ```
- Safely restore your local file from GitHub `main` (auto‑backup to `.backups/`):
  ```powershell
  npm run restore:file -- client/src/index.css
  ```
- Make a manual backup anytime:
  ```powershell
  npm run backup:file -- client/src/index.css
  ```
Notes:
- These commands never push; they only fetch, view, diff, and restore locally.
- After restore, you can run locally and verify before committing.

## Architecture
- Client: React + Vite SPA in `client/`; build to `dist/public/`. SPA routing via `404.html` copied from `index.html` (see `scripts/postbuild-spa-404.cjs`). Domain: `https://bongbari.com` (GitHub Pages).
- Server: Express (TS, ESM) in `server/`, all API under `/api/*`. Dev injects Vite middleware; prod serves `dist/public/` (see `server/vite.ts`). Backend hosted on Render `https://bongbaricomedy.onrender.com`.
- Data: Drizzle ORM with Neon Postgres when `DATABASE_URL` exists; otherwise `MemStorage` stubs. Shared schema/types in `shared/` (`shared/schema.ts`). SQLite schemas exist for local utilities, but production uses Postgres.
- Vite aliases: `@` → `client/src`, `@shared` → `shared`, `@assets` → `attached_assets`.

## Dev / Build / Test
- Run local (frees ports first if needed):
  ```powershell
  npm run dev:live
  ```
- Vite proxy: `/api` → `:5000` (or `:8888` when `NETLIFY=1`). Dev-only mock for `/.netlify/functions/homepage-promo` writes `.dev/promo.json` (see `vite.config.ts`).
- Build client (creates SPA `404.html`): `npm run build:client`. Full build (client + bundle server): `npm run build`.
- Type check: `npm run check`. Preflight (non-coder safe): `node scripts/preflight.cjs`.
- Tests: Vitest integration hits `http://localhost:5000`. CI: start backend `npm run dev:server:esm` → wait for `/api/version` → `npm run test:integration` (see `.github/workflows/ci-tests.yml`, `tests/api.test.ts`).

## API Base & Auth
- API base resolution lives in `client/src/lib/queryClient.ts`:
  - Order: `import.meta.env.VITE_API_BASE` → `window.__API_BASE__` (runtime `<script>` support) → if host ends with `bongbari.com`, default to Render URL.
  - Use `buildApiUrl()` and `apiRequest()` for all client calls; never hardcode relative `/api/...`.
- Auth: `/api/auth/login` returns `{ sessionId, csrfToken }`. Store session as `localStorage['admin_session']` (also `admin_jwt`).
  - For non-GET requests send `X-CSRF-Token` (managed via `setCSRFToken()` in `queryClient.ts`). Refresh with `GET /api/auth/csrf-token`.
  - Include `Authorization: Bearer <sessionId>` for protected endpoints.

## Routes & Security
- Implement endpoints in `server/routes.ts`; keep responses JSON and `sanitizeBody` inputs. Admin auth uses an in-memory session map plus CSRF helpers from `server/middleware/security.ts`.
- Rate limiting: dedupe by device via `x-device-id` or `bbc_device_id` cookie; backed by Upstash or Postgres `rate_limits`, with in-process fallback.
- Logging: `server/index.ts` logs only `/api` requests, capturing and truncating JSON bodies.

## Storage & Migrations
- Selection: `server/storage.ts` chooses Postgres (`server/db.pg.ts`) when `DATABASE_URL` exists, else `MemStorage` stubs.
- Schemas: primary in `shared/schema.ts` (Postgres). Optional local SQLite: `drizzle.sqlite.config.ts` + `shared/schema.sqlite.ts`.
- Pattern: add table in `shared/schema.ts` → run Drizzle push → add methods in `server/postgresStorage.ts` → consume via the `storage` abstraction in routes.

## Conventions
- Always call APIs via `apiRequest()`/`buildApiUrl()`; don’t hardcode relative `/api` paths.
- Keep the runtime API base `<script>` in the built `index.html`; `404.html` mirrors it via postbuild copy, ensuring deep links resolve API correctly.
- Use path aliases and React Query provider already wired in `client/src/App.tsx`.
- Don’t commit `dist/`—GitHub Actions handles Pages deploy. Commit messages may use `type(scope): message`.
- Backend env via `server/.env` (fallback to root `.env`): `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`, optional `YOUTUBE_CHANNEL_ID`, Upstash tokens.
- To force a Pages deploy when no client changes: include `FORCE_PAGES_DEPLOY` in the commit message.

## Daily Workflow
- Edit features/content; test at `http://localhost:5173`.
- Commit/push to `main` to deploy frontend (Pages) and backend (Render) automatically.
- Pull latest before new work: `git pull origin main`.

## Key Paths
- API base and helpers: `client/src/lib/queryClient.ts`.
- Auth flow: `client/src/pages/login.tsx`, `client/src/hooks/useAuth.ts`.
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
- Chatbot endpoints return JSON if changed.
- No console errors or mixed-content warnings.

## Troubleshooting
- API base issues: check `window.__API_BASE__` in console; ensure `404.html` matches `index.html`; verify `ensureApiBase()` path.
- CI failures: open the failed job log in Actions; copy the last 20 lines for debugging.
- Local Postgres vs memory: without `DATABASE_URL`, community features are stubs; use Neon for full behavior.

## Security Notes
- Never log tokens; store admin session in `localStorage['admin_session']` only.
- Always send `X-CSRF-Token` for non-GET requests when authenticated.

If anything above is unclear (e.g., exact API base needs, new endpoints, or env vars), say what you’re adding and we’ll extend these notes.

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