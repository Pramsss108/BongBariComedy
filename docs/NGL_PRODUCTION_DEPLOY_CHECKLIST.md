# Bong NGL — Production Deploy Checklist (C15)

Run this every time before pushing NGL changes to production.

## Pre-Deploy (local)
1. `npm run check` — must exit 0 (TypeScript clean).
2. `npm run build:client` — must succeed; verify `dist/public/404.html` exists and mirrors `index.html`.
3. Open DevTools → Lighthouse → PWA score ≥ 90 (manifest + SW registered).
4. Confirm `client/public/sw.js` is copied into `dist/public/sw.js` after build.
5. Hit `http://localhost:5173/ngl/dashboard?u=<test>&k=<key>` → verify:
   - Inbox loads, new-message ping plays on new message.
   - Search bar filters messages.
   - Export button downloads JSON.
   - PRO FOMO lock card visible for free users (with sender hints).
   - Sound toggle persists across reloads (localStorage `bong_ngl_mute`).

## Deploy
6. `git add -A`
7. Commit message **must** contain `FORCE_PAGES_DEPLOY`.
8. `git pull --rebase origin main`
9. `git push origin main`
10. Wait for GitHub Actions "pages" + "deploy-backend" workflows to turn green (~3–5 min).
11. Hard refresh (`Ctrl+F5`) https://www.bongbari.com/ngl.

## Post-Deploy Verification (2 min)
- [ ] https://www.bongbari.com/sw.js returns JavaScript (not HTML).
- [ ] https://www.bongbari.com/site.webmanifest returns JSON with shortcuts.
- [ ] DevTools → Application → Service Workers → `bong-sw-v1` is activated.
- [ ] DevTools → Application → Manifest → "Add to Home Screen" works.
- [ ] `curl https://api.bongbari.com/api/ngl/stats` returns `{totalUsers, totalMessages}`.
- [ ] `curl -I https://api.bongbari.com/api/ngl/u/test` → 404 or 200 (not 502).
- [ ] Send a test message → dashboard ping sound plays, new message appears within 8s.
- [ ] Click a PRO theme as a free user → upgrade prompt shows (no server write).
- [ ] Save `default` theme as a free user → works.
- [ ] Export button downloads `bong-ngl-<user>-<date>.json` with `messages` array.

## Rollback (if broken)
1. `git revert HEAD && git push origin main` (adds revert commit, triggers redeploy).
2. On Oracle VM: `ssh opc@158.101.175.37` → `cd ~/bongbari && pm2 restart bongbari-server`.
3. If service worker is stuck: bump `SW_VERSION` in `client/public/sw.js` (e.g. `bong-sw-v2`), rebuild, redeploy. Old cache is auto-purged on activation.

## Known Safe Items (do NOT touch)
- `CNAME` file (canonical `www.bongbari.com`).
- `scripts/postbuild-spa-404.cjs` (generates `404.html` for deep links).
- Server NGL_THEMES whitelist (line ~315 in `server/routes/ngl.ts`) now includes 10 themes — sync with client if adding more.
- Schema columns `isPremium` + `premiumUntil` — foundational, do not remove.
