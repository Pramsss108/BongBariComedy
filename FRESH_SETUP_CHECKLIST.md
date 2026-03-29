# Fresh Setup Checklist - GitHub Pages + Render + Neon DB

## Project Status: CLEANED ✅
All Netlify references and dependencies have been removed. The project is now fresh for GitHub Pages + Render + Neon DB development.

## Current Architecture
- **Frontend**: GitHub Pages (www.bongbari.com) with SPA routing
- **Backend**: Render (https://bongbaricomedy.onrender.com) 
- **Database**: Neon Postgres
- **Custom Domain**: www.bongbari.com via Hostinger DNS

## What Was Removed
✅ netlify.toml configuration file  
✅ @netlify/blobs dependency  
✅ Netlify function API calls in components  
✅ Netlify dev scripts from package.json  
✅ Netlify references in documentation  

## Environment Configuration

### Backend (Render)
```env
DATABASE_URL=postgresql://username:password@host/db
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-key
NODE_ENV=production
```

### Frontend (.env.production)
```env
VITE_API_BASE=https://bongbaricomedy.onrender.com
```

## Development Workflow

### Local Development
```bash
# Terminal 1: Start backend
npm run dev:server:esm

# Terminal 2: Start frontend 
npm run client

# Or use the dev task (runs both)
npm run dev
```

### Deployment

#### Backend to Render
- Push to main branch
- Render automatically deploys via GitHub integration

#### Frontend to GitHub Pages
```bash
# Build and deploy to GitHub Pages
npm run build:client
git checkout gh-pages
cp -r dist/* .
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
git checkout main
```

## API Endpoints Working
✅ /api/auth/* (login, logout, me)  
✅ /api/homepage-promo (promotional marquee)  
✅ /api/community/* (posts, reactions)  
✅ /api/youtube (YouTube integration)  
✅ /api/stories (story submission)  
✅ /api/memes (meme service)  

## Manual Steps Before Tomorrow's Development

### 1. Test Live Site
- [ ] Visit https://www.bongbari.com 
- [ ] Test login: https://www.bongbari.com/login
- [ ] Test community feed: https://www.bongbari.com/community-feed
- [ ] Test story submission: https://www.bongbari.com/stories

### 2. Verify API Connections
- [ ] Open browser dev tools on live site
- [ ] Check Network tab for API calls to Render backend
- [ ] Ensure no 404s or CORS errors

### 3. Database Health Check
```bash
# Run locally to verify Neon connection
npm run db:check
```

### 4. Optional: Update Domain SSL (Auto-renewed)
GitHub Pages provides free SSL for custom domains. No action needed.

## Next Development Priorities

1. **Mobile UI Enhancement**
   - Redesign community feed for mobile responsiveness
   - Add dynamic CSS padding for phone/desktop

2. **Feature Completion**
   - Migrate meme service to Postgres
   - Seed blog posts into Neon database
   - Complete community moderation features

3. **Performance Optimization**
   - Optimize API response caching
   - Implement image optimization
   - Add service worker for offline support

## Troubleshooting

### SPA Routing Issues
If direct URL access fails, check:
- 404.html exists in gh-pages branch
- index.html has routing script
- CNAME file points to www.bongbari.com

### API Connection Issues
Check:
1. Render backend is running (green status)
2. CORS allows your domain
3. Environment variables are set correctly

### Database Connection Issues
Run `npm run db:check` locally to verify Neon connectivity.

---

**Status**: Project is fresh and ready for development! 🚀
---

> ## ~~RENDER~~ — BANNED & REPLACED (March 29, 2026)
> 
> **All Render references above are OBSOLETE.** Render.com pipeline minutes exhausted, free tier unreliable.
> 
> | Old (Render) | New (Oracle Cloud Always Free) |
> |---|---|
> | ~~bongbaricomedy.onrender.com~~ | http://79.76.110.66:5000 |
> | ~~Render free tier (512MB RAM)~~ | Oracle VM (951MB RAM + 1.5GB swap) |
> | ~~Render auto-deploy~~ | GitHub Actions → Oracle VM SSH deploy |
> | ~~Render CPU 0.1 vCPU~~ | Oracle 1 OCPU (AMD EPYC) |
> | ~~Render sleeps after 15min~~ | PM2 24/7, auto-restart on reboot |
> 
> **Do NOT add any Render configs, buildpacks, or references. Oracle Cloud is the permanent backend.**

---

> ## ~~RENDER~~ -- BANNED & REPLACED (March 29, 2026)
> 
> **All Render references above are OBSOLETE.** Render.com pipeline minutes exhausted, free tier unreliable.
> 
> | Old (Render) | New (Oracle Cloud Always Free) |
> |---|---|
> | ~~bongbaricomedy.onrender.com~~ | `http://79.76.110.66:5000` |
> | ~~Render free tier (512MB RAM)~~ | Oracle VM (951MB RAM + 1.5GB swap) |
> | ~~Render auto-deploy~~ | GitHub Actions -> Oracle VM SSH deploy |
> | ~~Render CPU 0.1 vCPU~~ | Oracle 1 OCPU (AMD EPYC) |
> | ~~Render sleeps after 15min~~ | PM2 24/7, auto-restart on reboot |
> 
> **Do NOT add any Render configs, buildpacks, or references. Oracle Cloud is the permanent backend.**
