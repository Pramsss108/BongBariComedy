# Hostinger Deployment - Production Ready

## Your Current Setup ✅
- **Backend**: Render (working, green tick with Neon database)
- **Database**: Neon Postgres (working)
- **Frontend**: Ready for Hostinger deployment

## Step 1: Create Production Environment File
Create `.env.production` in your client folder with your Render backend URL:

```bash
# client/.env.production
VITE_API_BASE=https://your-render-app-name.onrender.com
```

## Step 2: Build for Production
```bash
# From root directory
npm run build:client
```
This creates `client/dist` folder with optimized static files.

## Step 3: Hostinger Upload
1. **Login** to Hostinger cPanel
2. **File Manager** → `public_html` folder  
3. **Upload** all files from `client/dist` folder
4. **Extract** if needed (drag & drop works too)

## Step 4: Update Backend CORS (Important!)
Your Render backend needs to allow your Hostinger domain.

**File to update**: `server/index.ts`
Add your Hostinger domain to CORS origins:
```typescript
// Update CORS to include your Hostinger domain
app.use(cors({
  origin: [
    'http://localhost:5173',           // Development
    'https://yourdomain.com',          // Your Hostinger domain
    'https://your-app.onrender.com'    // If needed
  ]
}));
```

## Step 5: Test Everything
1. Visit your Hostinger website
2. Test community feed loading
3. Test story submission
4. Check API calls in browser console

## Alternative: GitHub Pages (100% FREE)
If you want to save money:
```bash
# 1. Build with GitHub Pages base
npm run build:client

# 2. Create gh-pages branch
git checkout -b gh-pages

# 3. Copy dist contents to root
cp -r client/dist/* .

# 4. Push to GitHub
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages

# 5. Enable GitHub Pages in repo settings
# Your site: https://yourusername.github.io/BongBariComedy
```

## Which Should You Choose?

### Hostinger ($2-5/month)
- ✅ Custom domain (yoursite.com)
- ✅ More professional
- ✅ Better performance
- ✅ No GitHub dependency

### GitHub Pages (FREE)
- ✅ Completely free
- ✅ Automatic deployment from Git
- ✅ Good performance
- ❌ GitHub subdomain (unless custom domain)