# Operations Quick Sheet

## 1. Local Development
```
npm install
npm run dev        # backend + client concurrently (existing workflow)
```
Edit `server/.env` using `server/.env.example` as a guide.

## 2. Build Artifacts
```
npm run build      # builds client + bundles server to dist/
```
Output:
- `dist/public` (frontend static files)
- `dist/index.js` (server entry for production)

## 3. Render Deployment
Environment variables (Render dashboard -> Environment):
```
DATABASE_URL=...
GEMINI_API_KEY=...
JWT_SECRET=...
YOUTUBE_CHANNEL_ID=...
CORS_ORIGIN=https://<netlify-site>.netlify.app
```
Build Command (choose one):
```
# Recommended (ensures devDependencies installed before building)
npm run render:build

# Or (if Render installs devDependencies already)
npm run build
```
Start Command:
```
npm start
```
Render automatically sets `NODE_ENV=production`.

## 4. Netlify Deployment
Environment variable (Site settings -> Environment):
```
VITE_API_BASE=https://<render-app>.onrender.com
```
Build:
```
npm run build:client
```
Publish directory:
```
dist/public
```

## 5. Health Check
```
node scripts/health-check.mjs https://<render-app>.onrender.com/health
```
Expected JSON: `{ "status": "ok" }`.

## 6. Env Verification (CI/Pre-Deploy)
```
node scripts/verify-env.mjs DATABASE_URL GEMINI_API_KEY JWT_SECRET
```
Exits non-zero if any are missing.

## 7. Rotating Secrets
1. Generate new value (JWT: concatenate multiple GUIDs)
2. Update in Render dashboard
3. Redeploy service
4. Invalidate sessions if necessary

## 8. CORS Tightening
After confirming production works, remove localhost from `CORS_ORIGIN` in Render.

## 9. Common Issues
- 404 on /health: Ensure `NODE_ENV=production` and server built (`npm run build`).
- 127 build error: Start script must not use Windows `set` syntax (already fixed).
- CORS error in browser: Check `Origin` value is included in `CORS_ORIGIN`.
- vite: not found: Render may have installed only production dependencies. Use `render:build` script so devDependencies (vite, esbuild, tailwind) are installed during build.

## 10. Scripts Overview
- `npm run build` – full build (client + server bundle)
- `npm start` – run production bundle (`dist/index.js`)
- `node scripts/health-check.mjs <url>` – quick health probe
- `node scripts/verify-env.mjs VAR1 VAR2` – ensure env vars exist
