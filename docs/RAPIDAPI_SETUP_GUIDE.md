# RapidAPI Setup Guide (No-Coder Friendly)

## What This Does
Gets your Instagram reels automatically every day using **instagram120** API on RapidAPI.
- **Free**: 1,000 requests/month (we only need ~30 for daily use)
- **Automatic**: GitHub Actions runs it daily at 2 AM UTC
- **Zero maintenance**: No tokens to refresh, no apps to manage

---

## Step-by-Step Setup (5 minutes)

### Step 1: Create a RapidAPI Account
1. Go to **https://rapidapi.com**
2. Click **Sign Up** (use Google or email)
3. Verify your email if needed

### Step 2: Subscribe to instagram120 API
1. Go to: **https://rapidapi.com/3205/api/instagram120**
2. Click **Subscribe to Test** or **Pricing**
3. Choose the **Basic (Free)** plan — $0.00/month, 1,000 requests
4. Click **Subscribe**

### Step 3: Copy Your API Key
1. After subscribing, you'll see a **playground/testing page**
2. Look for `X-RapidAPI-Key` in the header section
3. Copy the long key (looks like: `b6997cf95dmsh...fe534b7c851f`)
4. **Keep this secret!** Don't share it publicly

### Step 4: Add API Key to GitHub Secrets
1. Go to your GitHub repo: **https://github.com/Pramsss108/BongBariComedy**
2. Click **Settings** (tab at the top)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Name: `RAPIDAPI_KEY`
6. Value: *paste your API key from Step 3*
7. Click **Add secret**

### Step 5: Test It!
1. Go to **Actions** tab in your GitHub repo
2. Click **Update Instagram Reels Data** workflow
3. Click **Run workflow** → **Run workflow** (green button)
4. Wait 1-2 minutes for it to complete
5. Check `client/public/data/reels-data.json` — it should have your latest reels!

---

## That's It! 🎉

The workflow runs automatically every day. Your reels will update on the live site within minutes of each run.

### How It Works (Simple Version)
```
Daily at 2 AM UTC:
  1. GitHub Actions wakes up
  2. Calls instagram120 API → gets your latest reels (1 request)
  3. Saves to reels-data.json
  4. Commits + pushes → site auto-deploys
```

### If RapidAPI Fails
The scraper automatically falls back to **Graph API** (if you've set that up too).
See `docs/INSTAGRAM_SETUP_GUIDE_NO_CODER.md` for Graph API setup.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Workflow shows "missing RAPIDAPI_KEY" | Go to Settings → Secrets → check `RAPIDAPI_KEY` exists |
| "Rate limit exceeded (429)" | You've used 1000 requests this month. Wait for next month reset |
| "Forbidden (403)" | Your API key is wrong. Re-copy from RapidAPI dashboard |
| No reels in output | Check if `@thebongbari` has public reels on Instagram. The `/posts` endpoint may be flaky — scraper auto-falls back to `/reels` endpoint |

## Optional: Change the API Host
If instagram120 ever dies, you can switch to another API:
1. Go to Settings → Secrets → **New repository secret**
2. Name: `RAPIDAPI_HOST`
3. Value: the new API's host (e.g., `instagram-looter2.p.rapidapi.com`)
4. The scraper will automatically try generic endpoints for the new host
