# How to Get Your Instagram API Token — Baby Steps Guide

> **Who is this for?** Non-coders. If you can use Instagram, you can do this.
> **Time needed:** 15-20 minutes (one time only, then it's automatic forever)
> **What you need:** Your Instagram account (@thebongbari) + a Facebook account

---

## WHY DO I NEED THIS?

Your Instagram reels are PUBLIC — anyone can see them. But Instagram doesn't let websites just grab your videos freely (unlike YouTube which has RSS feeds). Instagram BLOCKS scrapers.

**The Graph API token is like giving your OWN website a VIP pass to read YOUR OWN reels.** Once set up, our server auto-refreshes this pass every 50 days — you never touch it again.

Think of it like this:
- ❌ Scraping = sneaking into your own house through the window (Instagram will block you)
- ✅ Graph API = using your own key to unlock your front door (permanent, official, unbreakable)

---

## STEP 1: Make Sure Your Instagram is a "Professional Account"

**Time: 2 minutes**

1. Open **Instagram app** on your phone
2. Go to your **profile** (tap your picture bottom-right)
3. Tap the **☰ menu** (three lines, top-right)
4. Tap **Settings and privacy**
5. Scroll down → Tap **Account type and tools**
6. Tap **Switch to professional account**
7. Choose **Business** (NOT Creator)
8. Pick any category (like "Entertainment" or "Media")
9. Tap **Done**

> **Already professional?** Skip to Step 2.
> **How to check:** Go to your profile. If you see "Professional dashboard" or follower analytics, you're already professional.

---

## STEP 2: Connect Instagram to a Facebook Page

**Time: 3 minutes**

Your Instagram Business account needs to be linked to a Facebook Page. If you already have one linked, skip ahead.

1. Open **Instagram app** → your profile
2. Tap **Edit profile**
3. Under **Links** or **Page**, tap **Connect Facebook Page**
4. If you have a Facebook Page, select it
5. If you DON'T have one, tap **Create a new Facebook Page**
   - Page name: `Bong Bari Comedy` (or anything)
   - Category: `Entertainment`
   - Tap **Create**
6. Done! Your IG is now linked to a Facebook Page.

> **The Facebook Page can be hidden/unpublished.** It's just a bridge for the API — nobody needs to see it.

---

## STEP 3: Create a Meta Developer Account

**Time: 3 minutes**

1. Open your computer browser (Chrome/Edge)
2. Go to: **https://developers.facebook.com/**
3. Click **Get Started** or **Log In** (use your Facebook account)
4. Accept the terms
5. You're now a "Meta Developer" — it's free, no credit card needed

> **You should see:** A dashboard with "My Apps" at the top

---

## STEP 4: Create a Meta App

**Time: 5 minutes**

1. On the Meta Developer dashboard, click **Create App** (big green button)
2. You'll see app types — choose **Other** → click **Next**
3. Choose app type: **Business**  → click **Next**
4. Fill in:
   - **App name:** `BongBari Website` (or whatever you want)
   - **Contact email:** your email
   - **Business portfolio:** Skip or select if you have one
5. Click **Create App**
6. You might need to re-enter your Facebook password

> **You should see:** Your new app's dashboard page

7. Now add Instagram API to your app:
   - On the left sidebar, click **Add Product**
   - Find **Instagram** and click **Set up**
   - Choose **Instagram Graph API** → click **Set up**

> **IMPORTANT — Write down these 2 things (you'll need them):**
> - **App ID** — shown at the top of your app dashboard
> - **App Secret** — go to **App Settings → Basic** → click **Show** next to App Secret

---

## STEP 5: Get Your Access Token

**Time: 5 minutes**

This is the magic key that lets your website read your reels.

### Method A: Quick Way (Graph API Explorer)

1. Go to: **https://developers.facebook.com/tools/explorer/**
2. In the top-left dropdown, select your app (`BongBari Website`)
3. Click the **"Generate Access Token"** button
4. A popup asks for permissions — check these boxes:
   - ✅ `instagram_basic`
   - ✅ `pages_show_list`
   - ✅ `pages_read_engagement`
5. Click **Generate Access Token**
6. Facebook will ask you to log in and authorize — click **Continue** / **Allow** for everything
7. You'll see a long text string in the "Access Token" box — **that's your token!**

> **COPY THIS TOKEN** — save it somewhere safe (Notepad, etc.)

### Now Make It Long-Lived (IMPORTANT!)

The token you just got expires in 1 hour. We need to make it last 60 days (our server will auto-renew it after that).

8. Still in the Graph API Explorer, paste this URL in the top bar and hit **Submit**:

```
/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_TOKEN
```

Replace:
- `YOUR_APP_ID` → the App ID from Step 4
- `YOUR_APP_SECRET` → the App Secret from Step 4
- `YOUR_SHORT_TOKEN` → the token you just copied

9. Hit **Submit** — you'll get a response with `"access_token": "EAAG..."` — **that's your LONG-LIVED TOKEN!**

> **COPY THIS NEW LONGER TOKEN** — this is the one we'll use

---

## STEP 6: Get Your Instagram User ID

1. Still in the Graph API Explorer
2. Make sure your long-lived token is in the Access Token box
3. In the URL bar at top, type: `me?fields=id,username`
4. Click **Submit**
5. You'll see something like:
```json
{
  "id": "17841400XXXXXXX",
  "username": "thebongbari"
}
```
6. **COPY the `id` number** — that's your Instagram User ID

---

## STEP 7: Test It Works!

Before putting it in the server, let's make sure the token works.

1. In the Graph API Explorer URL bar, type:
```
YOUR_USER_ID/media?fields=id,caption,media_type,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=5
```
(Replace `YOUR_USER_ID` with the ID from Step 6)

2. Click **Submit**
3. You should see **your recent Instagram posts/reels listed!**

> **If you see your reels → SUCCESS! Your token works perfectly.**
> **If you see an error → go back to Step 5 and regenerate the token, making sure you selected all permissions.**

---

## STEP 8: Put the Token in Your Server

Now we put the token where our server can use it. This is the last step!

1. Open VS Code
2. Open the file `server/.env` (if it doesn't exist, create it)
3. Add these 4 lines at the bottom:

```env
INSTAGRAM_USER_ID=17841400XXXXXXX
INSTAGRAM_ACCESS_TOKEN=EAAG...your-long-lived-token-here...
INSTAGRAM_APP_ID=your-app-id-from-step-4
INSTAGRAM_APP_SECRET=your-app-secret-from-step-4
```

4. **Save the file**
5. Restart the dev server:
```powershell
npm run dev:live
```

6. Test in your browser:
   - Go to: `http://localhost:5000/api/instagram/latest`
   - You should see your 4 latest reels as JSON!
   - Go to: `http://localhost:5000/api/instagram/popular`
   - You should see your 4 most viral reels!

---

## DONE! What Happens Now?

### Automatic Forever:
- ✅ Server fetches your latest + most viral reels every 2 minutes
- ✅ Token auto-refreshes every 50 days (before the 60-day expiry)
- ✅ You NEVER need to touch this again
- ✅ Works on localhost AND production (Oracle VM)

### For Production (Oracle VM):
- SSH into the Oracle VM and add the same 4 env vars to the server's `.env` file there
- Or add them as GitHub Secrets so the deploy workflow sets them automatically

---

## TROUBLESHOOTING

### "I see an empty array `[]` when testing"
- Your token might have expired → Redo Step 5
- Your Instagram might not have video posts → Post a reel first, then test
- The env vars might not be loaded → Restart the server

### "Error: OAuthException"
- Your token is expired or invalid → Redo Step 5 to get a new one
- Make sure you used the LONG-LIVED token (Step 5 part 8-9), not the short one

### "I can't find Instagram Graph API in App Dashboard"
- Make sure you chose "Business" app type in Step 4
- Try: App Dashboard → Add Product → search "Instagram" → Set up

### "Permission denied" errors
- Go back to Graph API Explorer → regenerate token with ALL permissions checked
- Make sure your Instagram is a Business account (Step 1)
- Make sure it's connected to a Facebook Page (Step 2)

### "I messed everything up"
- No worries! Nothing is broken. Just start from Step 5 again to get a fresh token.
- Tokens are like passwords — you can always generate new ones.

---

## RED TEAM BACKUP: What If Graph API Ever Fails?

Our server has a **built-in scraping fallback**. If the Graph API token ever stops working:

1. The server automatically tries to scrape your public Instagram profile
2. It extracts reels from the public HTML/JSON data
3. This is less reliable but works as emergency backup

**Priority chain:**
1. 🥇 Graph API (permanent, official, auto-refresh) ← **PRIMARY**
2. 🥈 Public profile scraping (backup, may get blocked) ← **FALLBACK**
3. 🥉 Hardcoded featured reels (last resort) ← **EMERGENCY**

The service automatically falls through to the next method if the previous one fails. Zero downtime.

---

## QUICK REFERENCE CARD

| What | Value |
|------|-------|
| Instagram Account | `@thebongbari` |
| Account Type | Business (Professional) |
| Facebook Page | Connected (can be hidden) |
| Meta Developer Portal | https://developers.facebook.com/ |
| Graph API Explorer | https://developers.facebook.com/tools/explorer/ |
| Token Type | Long-lived (60 days, auto-refresh) |
| Token Auto-Refresh | Every 50 days by our server |
| API Refresh Interval | Every 2 minutes |
| Latest Reels | `GET /api/instagram/latest` (4 newest) |
| Popular Reels | `GET /api/instagram/popular` (4 most viral) |
| Env File | `server/.env` |
| Env Vars Needed | `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` |
