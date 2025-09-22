# BongBari Project Onboarding Guide (2025)

Welcome to the BongBari project!  
This is a Bengali comedy content platform with a modern, automated workflow—no manual deploys needed.

---

## Architecture Overview

- **Frontend:**  
  - React + Vite (TypeScript)  
  - Deployed via GitHub Pages at [https://bongbari.com](https://bongbari.com)  
  - SPA routing: Both `index.html` and a mirrored `404.html` (auto-generated) ensure deep links (e.g., `/login`, `/admin`) always load the app.

- **Backend:**  
  - Express (TypeScript, ESM)  
  - Hosted on Render: [https://bongbaricomedy.onrender.com](https://bongbaricomedy.onrender.com)  
  - Exposes `/api` routes (auth, community, reactions, moderation, chatbot, trends, YouTube feed, etc.)

- **Database:**  
  - Neon Postgres (remote, production)  
  - Some legacy SQLite files exist, but all production data is in Postgres.

- **Authentication:**  
  - Username/password login  
  - Session token stored as `admin_session` in localStorage  
  - CSRF token required for mutating requests (header: `X-CSRF-Token`)

- **API Base Resolution:**  
  - Centralized in `client/src/lib/queryClient.ts`  
  - Logic:  
    1. Uses `VITE_API_BASE` from `.env.production` at build  
    2. Can be overridden at runtime via `<script>` in `404.html`  
    3. Fallback: If hostname ends with `bongbari.com`, uses Render URL  
  - `ensureApiBase()` ensures the correct API base is always used, even on deep links.

- **Build & Deploy:**  
  - `npm run build:client` builds frontend and copies `index.html` to `404.html`  
  - GitHub Actions workflow auto-builds and deploys to GitHub Pages on every push to `main`  
  - Backend auto-deploys from `main` on Render

---

## Daily Workflow (Non-Coder Friendly)

1. **Open VS Code**
   - Open the project folder.
   - Make sure Copilot is enabled.

2. **Run Locally**
   - Open terminal.
   - If you added/changed packages:  
     ```sh
     npm install
     ```
   - Start both servers:  
     ```sh
     npm run dev:live
     ```
   - Open [http://localhost:5173](http://localhost:5173) in your browser.

3. **Make Changes**
   - Use Copilot for help.
   - Edit/add features, fix bugs, or update content.
   - Save and test in your browser.

4. **Push to GitHub**
   - When ready:  
     ```sh
     git add .
     git commit -m "Describe your change"
     git push origin main
     ```
   - Or use the VS Code Source Control panel.

5. **Automatic Deploy**
   - GitHub Actions builds and deploys your site to [https://bongbari.com](https://bongbari.com)
   - Render auto-deploys backend from `main`.

6. **Check Live Site**
   - Visit [https://bongbari.com](https://bongbari.com) after a few minutes to see your changes.

7. **Repeat**
   - Pull latest changes if you worked elsewhere:  
     ```sh
     git pull origin main
     ```

---

## Project Conventions

- Use `/api/...` or the `buildApiUrl()` helper for all API calls.
- Never hardcode relative API paths in client code—always use `apiRequest()`.
- Keep the `<script>` that sets `window.API_BASE` in `index.html` and `404.html`.
- Do not commit `dist/`—deploys are handled by GitHub Actions.
- Keep changes focused; avoid refactoring unrelated code unless needed.
- Commit messages: `type(scope): message` (e.g., `feat(auth): add password strength meter`).

---

## Important Files

- `client/src/lib/queryClient.ts` (API base logic)
- `scripts/postbuild-spa-404.cjs` (ensures SPA deep links)
- `package.json` (build & dev scripts)
- `server/routes.ts` (backend endpoints)
- `client/src/pages/login.tsx` (auth flow)
- `.env.production` (`VITE_API_BASE` for build-time)
- `404.html` (auto-generated, must match `index.html`)

---

## Testing Checklist (After Any Change)

- Local login works (200 + token + CSRF).
- Protected API calls succeed (e.g., `/api/auth/me`).
- Deep links (e.g., `/admin`) load the app, not a GitHub 404.
- Network tab shows absolute API calls to Render, not relative.
- Chatbot POST returns JSON (if changed).
- No console errors or mixed content warnings.

---

## Troubleshooting

- If API base breaks:  
  - Check `window.API_BASE` in browser console.
  - Ensure `404.html` matches `index.html` and contains the fallback `<script>`.
  - Confirm `ensureApiBase()` is present in code.

- If you see a red X on GitHub:  
  - Click it, view the error, and ask for help (send the log or screenshot).

---

## Security Notes

- Never log tokens.
- Always send CSRF header for non-GET requests.

---

## Next Potential Enhancements

- Code splitting/lazy loading (to reduce bundle size)
- Add version endpoint/build hash for diagnostics
- Add minimal tests for auth/chatbot
- Further workflow improvements as needed

---

**Current Status:**  
System is stable, login and deploys work, and the workflow is fully automated.  
You can develop, test, and deploy with zero manual steps—just push and your site updates!
