# Quick Verification Guide (Non‑Coder)

Use this anytime you want to confirm everything (GitHub, Render backend, Netlify frontend, Neon database) is healthy.

---
## 0. One-Time Setup (Local)
Create or edit `server/.env` and be sure it includes your real `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`.

Example (DO NOT COMMIT secrets):
```
DATABASE_URL=postgres://...your-neon-connection...
GEMINI_API_KEY=sk-...
JWT_SECRET=copy-from-sec-generator
```

---
## 1. GitHub (Source Code)
1. Open repository on GitHub.
2. Confirm latest commit message matches what you expect (e.g. `chore: add db-check script`).
3. If something seems missing: press F5 to refresh. Still missing? You (or we) may need to push local changes.

Healthy = Latest commit you expect is visible.

---
## 2. Backend (Render)
1. Open your Render service URL in browser: `https://bongbaricomedy.onrender.com/health`.
2. You should see JSON: `{"status":"ok"}`.
3. Optional deeper check: `https://bongbaricomedy.onrender.com/api/health` → should show `{ ok: true, aiReady: true/false }`.

Healthy = Both endpoints load fast (<2s) with JSON (not HTML / not an error page).

If FAILS:
- 404 or HTML page: service not deployed or route order broken (let me know).
- 500: check Render Logs → last lines show error; share here.

---
## 3. Frontend (Netlify)
1. Visit your Netlify site main URL.
2. Press F12 → Network tab → refresh page.
3. Look for request to `/health` hitting backend (should be a 200) and NO repeated 404s for `homepage-promo`.
4. Page should load content; no red errors in Console.

Healthy = No red network errors (except maybe fonts/images), especially no promo 404 spam.

If FAILS:
- If `/health` blocked by CORS: we can tighten/adjust `CORS_ORIGIN` value.
- If site shows outdated code: trigger redeploy in Netlify (Deploys → Trigger deploy → Clear cache & deploy).

---
## 4. Database (Neon Postgres)
Option A (Browser / Neon Console):
1. Log in to Neon dashboard.
2. Open the project → SQL Editor.
3. Run: `SELECT 1;` (should return 1). Run: `SELECT * FROM users LIMIT 1;` (may be empty; that's OK).

Option B (Local Script):
1. Ensure `DATABASE_URL` exists in `server/.env`.
2. Run in PowerShell (from project root):
```
npm run db:check
```
3. Expected output JSON like:
```
{
  "ok": true,
  "latencyMs": 180,
  "select1": 1,
  "tableCounts": {"users":0,"blog_posts":"missing", ...},
  "publicTables": <number>
}
```

Healthy = `ok: true`.

If FAILS:
- Error: `DATABASE_URL missing` → add it to `server/.env`.
- Auth / TLS error: regenerate connection string in Neon (Pooling connection, full SSL) and update `.env` then retry.

---
## 5. Environment Variables Recap
Backend (Render Dashboard → Environment):
- Must have: `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`, optional `YOUTUBE_CHANNEL_ID`, `CORS_ORIGIN`.

Frontend (Netlify → Site settings → Build & deploy → Environment):
- Must have: `VITE_API_BASE` = `https://bongbaricomedy.onrender.com`.

Healthy = All present, no obvious typos.

---
## 6. Optional Hardening (When Stable)
1. Tighten CORS: set `CORS_ORIGIN` to only `https://<your-netlify-domain>` (remove `*` and localhost) → redeploy Render.
2. Rotate secrets every few months: generate new `JWT_SECRET` (PowerShell: `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`). Update Render env + redeploy.
3. Remove unused legacy components (already removed PromoMarquee on homepage).

---
## 7. Daily 30‑Second Health Routine
1. Open Netlify site → quick visual check.
2. Open browser tab `.../health` → confirm `{"status":"ok"}`.
3. (Weekly) Run `npm run db:check` locally.

---
## 8. When Asking for Help
Copy + paste:
1. Output of `npm run db:check`.
2. Screenshot of Render logs (last 20 lines).
3. Any red errors from browser Console.

---
Everything passes? You are good. Next possible feature: storing homepage content or chatbot training data in these Postgres tables.
