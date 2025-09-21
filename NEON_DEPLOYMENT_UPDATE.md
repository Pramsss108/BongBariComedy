# Updated Deployment Configuration for Neon Database

## Environment Variables to Update

### 1. Render (Backend Deployment)
Go to your Render dashboard → Your service → Environment tab and update/add these variables:

```
DATABASE_URL=postgresql://neondb_owner:npg_tnZHhjiP0c9s@ep-snowy-rain-adu1hltp-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
GEMINI_API_KEY=AIzaSyDZc4bEPBkqa2zLCxV_XNVEWYRAR4PmTB4
JWT_SECRET=[your-existing-jwt-secret]
YOUTUBE_CHANNEL_ID=UCNXvQhwAn4b2sAm6pCM9w7Q
YOUTUBE_API_KEY=AIzaSyC9xBYncxvSALTuVr2pqTnokHHxbFOLiH8
CORS_ORIGIN=https://<your-netlify-site>.netlify.app
NODE_ENV=production
```

**Key Changes:**
- Added `DATABASE_URL` pointing to your Neon database
- This replaces any SQLite or in-memory storage
- All community posts, reactions, and pending posts will now persist in Neon

### 2. Netlify (Frontend Deployment)
Go to your Netlify dashboard → Site settings → Environment variables:

```
VITE_API_BASE=https://<your-render-app>.onrender.com
VITE_YOUTUBE_CHANNEL_ID=UCNXvQhwAn4b2sAm6pCM9w7Q
```

## Migration Steps

### Step 1: Update Render Environment
1. Log into your Render dashboard
2. Go to your BongBariComedy service
3. Click "Environment" tab
4. Add/update the `DATABASE_URL` variable with the Neon connection string above
5. Click "Save Changes"
6. Render will automatically redeploy

### Step 2: Wait for Deployment
1. Monitor the deployment logs in Render
2. Look for these success messages:
   - `[env] DATABASE_URL loaded: true`
   - `[storage] Using Postgres (Neon) storage.`
   - `[express] serving on port [PORT]`

### Step 3: Test the Deployment
Test these endpoints on your live Render URL:

1. **Health Check**: `https://your-app.onrender.com/api/health`
   - Should return: `{"ok":true,"aiReady":true}`

2. **Community Feed**: `https://your-app.onrender.com/api/community/feed`
   - Should return: `[]` (empty array initially)

3. **Submit Test Post**: 
   ```bash
   curl -X POST https://your-app.onrender.com/api/submit-story \
     -H "Content-Type: application/json" \
     -H "x-test-bypass: [your-test-bypass-token]" \
     -d '{"text":"Test post from Neon database","name":"Test User","isAnonymous":false}'
   ```

### Step 4: Verify Database Migration
1. Check that posts are now stored in Neon database
2. Verify reactions, pending posts, and admin functions work
3. Ensure no data is lost during server restarts (persistent storage)

## What Changed
- **Before**: Community posts stored in memory (lost on restart)
- **After**: Community posts stored in Neon PostgreSQL database (persistent)
- **Migration**: Old in-memory data will be lost, but new posts will persist

## Troubleshooting
- **"DATABASE_URL not set" in logs**: Environment variable not properly set in Render
- **Connection errors**: Check Neon database is active and connection string is correct
- **500 errors**: Check Render logs for specific database connection issues

## Rollback Plan
If issues occur, temporarily remove `DATABASE_URL` from Render environment to fall back to in-memory storage while troubleshooting.