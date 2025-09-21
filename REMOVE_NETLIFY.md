# Remove / Decommission Netlify (You Moved to GitHub Pages + Render)

## Why Remove It?
Netlify account suspended / credits ended + you now use:
- Frontend: GitHub Pages (free) + www.bongbari.com custom domain
- Backend API: Render (Node server)
- Database: Neon Postgres

## 1. Netlify Dashboard Cleanup (If Still Accessible)
1. Log in to Netlify (if possible)
2. Go to **Site settings** → **Danger zone**
3. Click **Delete site** (this frees the domain association)
4. If you added environment variables there, no action needed now
5. If billing warnings show, ignore (you are migrated)

## 2. Remove Netlify Build Files from Repo (Optional)
You can safely delete these if you want:
- `netlify.toml`
- `netlify/functions/` folder (if exists)
- Any scripts referencing `netlify-cli`

(We left them untouched for now in case you want fallback hosting later.)

## 3. Remove Netlify Dependencies (Optional)
In `package.json`, you can remove:
- Scripts: `netlify:dev`, `dev:functions`, `dev:marquee`
- Dependency: `@netlify/blobs` (only if not used elsewhere)

Then run:
```powershell
npm install
```

## 4. Update Documentation
Already updated CORS + deployment docs for GitHub Pages.
No further Netlify references needed.

## 5. Promo Marquee / Functions Migration
All promo endpoints now go directly to `/api/homepage-promo` (Render server).

## 6. What You Keep
You **keep**:
- `gh-pages` branch (static build)
- Custom domain DNS at Hostinger
- Render backend logs & control
- Neon database data

## 7. Optional: Fully Purge Netlify Artifacts
If you want a cleaner repo later:
```powershell
# Delete config
Remove-Item netlify.toml

# Remove netlify-specific scripts (edit package.json)
# Commit changes
```

I can do this cleanup automatically if you want—just ask: "remove netlify files".

## 8. Verify Final Architecture
```
Browser (www.bongbari.com)
   ↓ (static hosting)
GitHub Pages (gh-pages branch)
   ↓ API calls
Render Backend (Express + Drizzle + Neon)
   ↓
Neon Postgres Database
```

All good. Let me know if you want the repo purged of Netlify now or keep it as backup.