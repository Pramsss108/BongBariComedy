# Hostinger Frontend Deployment Guide

## Setup Overview
- **Backend**: Render (already working with Neon database) ✅
- **Frontend**: Hostinger static hosting (alternative to Netlify)
- **Database**: Neon Postgres ✅

## Step 1: Prepare Frontend Build
```bash
# Build the frontend for production
npm run build:client
```
This creates a `dist` folder with all static files.

## Step 2: Update API URLs
The frontend needs to point to your Render backend URL instead of localhost.

**File to update**: `client/src/config/api.ts` (or wherever API URLs are defined)
```typescript
// Update this:
const API_BASE_URL = 'http://localhost:5000';
// To this:
const API_BASE_URL = 'https://your-app-name.onrender.com';
```

## Step 3: Hostinger Setup
1. **Login** to your Hostinger cPanel
2. **Go to File Manager**
3. **Navigate** to `public_html` folder
4. **Upload** entire contents of `dist` folder
5. **Set permissions** if needed (755 for folders, 644 for files)

## Step 4: Manual Deployment Process
Every time you make changes:
```bash
# 1. Build locally
npm run build:client

# 2. Upload dist folder contents to Hostinger via:
#    - cPanel File Manager (drag & drop)
#    - FTP client (FileZilla)
#    - SSH if available
```

## Alternative: GitHub Pages (FREE)
If you prefer free hosting:
1. Push your code to GitHub
2. Go to repository Settings > Pages
3. Set source to "Deploy from a branch"
4. Choose main branch / docs folder
5. Your site will be at: `https://yourusername.github.io/BongBariComedy`

## Production Configuration Needed
- Update CORS in backend to allow your Hostinger domain
- Update API base URLs in frontend
- Test all endpoints work with new frontend domain

## Cost Comparison
- **Hostinger**: ~$2-5/month (reliable, your domain)
- **GitHub Pages**: Free (github.io subdomain or custom domain)
- **Vercel**: Free tier available (risk of suspension)

## Next Steps
1. Choose hosting provider
2. Update API URLs in frontend
3. Build and deploy
4. Update CORS settings
5. Test live site