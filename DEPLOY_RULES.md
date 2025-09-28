# Non‑Coder Deploy (One‑Click)

Use these two commands from VS Code Terminal (PowerShell):

- Safe deploy (recommended): runs checks, builds, commits with cache‑bust, pushes
```
npm run deploy:safe
```
- Force Pages to rebuild (no code changes, quick retry):
```
npm run deploy:force
```

What the safe deploy does:
- Type checks TS
- Builds client and creates 404.html from index.html
- Verifies outputs
- Commits with `FORCE_PAGES_DEPLOY` (helps bust caches) and pushes to `main`
- GitHub Actions builds and deploys to Pages automatically

Rules:
- Edit only in `client/**` for site content/behavior. Root `index.html` is not used by deploy; the built one in `dist/public/` is.
- CNAME is `www.bongbari.com`. The apex `bongbari.com` redirects to `www`.
- If you need to restore a file to GitHub version:
  - View remote file: `npm run git:fetch ; npm run remote:file -- client/src/index.css`
  - Diff: `npm run git:fetch ; npm run diff:file -- client/src/index.css`
  - Restore: `npm run restore:file -- client/src/index.css`

Troubleshooting:
- If live page is blank or shows redirect HTML, run `npm run deploy:force` once to trigger a rebuild.
- Always wait for the GitHub Pages workflow to finish, then hard refresh (Ctrl+F5).
