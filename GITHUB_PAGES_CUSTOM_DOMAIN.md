# GitHub Pages + Custom Domain Deployment Guide

## 🎉 PERFECT SOLUTION: Free Hosting + Your Custom Domain!

**Your Setup:**
- ✅ **Backend**: Render (https://bongbaricomedy.onrender.com)
- ✅ **Database**: Neon Postgres 
- ✅ **Frontend**: GitHub Pages (FREE)
- ✅ **Domain**: Your Hostinger custom domain

## Step 1: Prepare for GitHub Pages

### Build with correct base path:
```powershell
# Rebuild with your environment
npm run build:client
```

## Step 2: Deploy to GitHub Pages

### Method A: Automatic Deployment (Recommended)
```powershell
# 1. Add all changes to git
git add .
git commit -m "Prepare for GitHub Pages deployment"

# 2. Push to main branch
git push origin main

# 3. Create gh-pages branch and deploy
git checkout -b gh-pages

# 4. Copy dist contents to root
Copy-Item -Path "dist\public\*" -Destination "." -Recurse -Force

# 5. Add CNAME file for custom domain
echo "yourdomain.com" > CNAME

# 6. Commit and push
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages

# 7. Go back to main
git checkout main
```

### Method B: GitHub Actions (Auto-deploy on push)
I can set up automatic deployment that builds and deploys whenever you push code.

## Step 3: Configure GitHub Pages

1. **Go to GitHub repository** → Settings → Pages
2. **Source**: Deploy from a branch
3. **Branch**: gh-pages / (root)
4. **Custom domain**: Enter your Hostinger domain
5. **Enforce HTTPS**: ✅ (recommended)

## Step 4: Configure Your Custom Domain

### Option A: Point to GitHub Pages
In your Hostinger domain settings:
```
Type: CNAME
Name: @ (or www)
Value: yourusername.github.io
```

### Option B: Use A Records (Alternative)
```
Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153  
Value: 185.199.110.153
Value: 185.199.111.153
```

## Step 5: Update Backend CORS

Your Render backend needs to allow your custom domain:

**File**: `server/index.ts`
```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',                    // Development
    'https://yourdomain.com',                   // Your custom domain
    'https://www.yourdomain.com',               // www version
    'https://yourusername.github.io'            // GitHub Pages fallback
  ]
}));
```

## Step 6: Test Everything

1. **Visit your custom domain**
2. **Check community feed loading**
3. **Test story submission**
4. **Verify API calls work**

## Benefits of This Setup

✅ **Free hosting** (GitHub Pages)
✅ **Your custom domain** (from Hostinger)
✅ **Automatic HTTPS**
✅ **Global CDN** (fast worldwide)
✅ **Automatic deployments** (if using GitHub Actions)
✅ **Version control** (every deployment tracked)

## Cost Comparison

- **GitHub Pages + Custom Domain**: Domain cost only (~$10/year)
- **Hostinger Hosting**: ~$24-60/year + domain
- **Netlify/Vercel**: Risk of suspension

## What's your custom domain?

Once you tell me your domain name, I'll:
1. Update the CORS settings
2. Help set up the DNS configuration
3. Deploy to GitHub Pages
4. Test everything works

**This is the best solution - free hosting with your professional domain!**
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
