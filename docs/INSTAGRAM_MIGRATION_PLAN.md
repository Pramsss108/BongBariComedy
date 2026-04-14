# Instagram Migration Plan — Permanent Instagram Graph API

> **Status:** Planning → Ready for execution  
> **Priority:** HIGH — Instagram driving more audience than YouTube  
> **Scope:** Homepage hero, video sections, CTAs, footer, backend API  
> **Approach:** 100% PERMANENT — Instagram Graph API with auto-refresh tokens (mirrors YouTube service architecture)

---

## 🎯 Goal

Replace YouTube as the primary content platform with Instagram Reels using the **permanent Instagram Graph API** — automatic fetching of latest + most viral reels, auto-refreshing tokens, zero manual curation. YouTube stays as a secondary footer link.

---

## 🔑 Instagram Graph API — Permanent Setup Guide

### Prerequisites (One-Time Setup)

#### Step 1: Convert to Instagram Professional Account
1. Open Instagram app → Settings → Account → Switch to Professional Account
2. Choose **Business** (not Creator) for full API access
3. Connect to a **Facebook Page** (create one if needed — can be hidden from public)
4. Account: `@thebongbari`

#### Step 2: Create Meta Developer App
1. Go to https://developers.facebook.com/apps/
2. Click **Create App** → Choose **Business** type
3. App name: `BongBari Website` (or similar)
4. Add product: **Instagram Graph API** (or "Instagram API with Facebook Login")
5. Note your **App ID** and **App Secret**

#### Step 3: Get Long-Lived Access Token (60 Days, Auto-Refreshable)

**Method A: Graph API Explorer (Fastest for Own Account)**
1. Go to https://developers.facebook.com/tools/explorer/
2. Select your app from dropdown
3. Click **Generate Access Token**
4. Select permissions:
   - `instagram_basic` — Read profile + media
   - `instagram_manage_insights` — Get engagement metrics (likes, comments, plays)
   - `pages_show_list` — Access linked Facebook Page
   - `pages_read_engagement` — Read page engagement data
5. Click **Generate** → Authorize → Copy the **short-lived token**

**Method B: Business Login for Instagram (Recommended for Production)**
1. In App Dashboard → Instagram → API Setup with Instagram Login
2. Note the **Instagram App ID** and **Instagram App Secret**
3. Redirect URI: `http://79.76.110.66:5000/api/instagram/callback` (Oracle VM)
4. Authorization URL:
   ```
   https://api.instagram.com/oauth/authorize
     ?client_id={instagram-app-id}
     &redirect_uri={redirect-uri}
     &scope=instagram_business_basic,instagram_business_manage_insights
     &response_type=code
   ```
5. Exchange code for token at server endpoint

#### Step 4: Exchange Short-Lived → Long-Lived Token

**For Facebook Login tokens:**
```
GET https://graph.facebook.com/v25.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={app-id}
  &client_secret={app-secret}
  &fb_exchange_token={short-lived-token}
```

**For Instagram Login tokens:**
```
GET https://graph.instagram.com/access_token
  ?grant_type=ig_exchange_token
  &client_secret={instagram-app-secret}
  &access_token={short-lived-token}
```

Returns a **60-day long-lived token**. Our server will auto-refresh it before expiry.

#### Step 5: Get Your Instagram User ID
```
GET https://graph.instagram.com/me?fields=id,username&access_token={long-lived-token}
```
Response: `{ "id": "17841400XXXXXXX", "username": "thebongbari" }`

#### Step 6: Set Environment Variables
Add to `server/.env`:
```env
INSTAGRAM_ACCESS_TOKEN=your-long-lived-token-here
INSTAGRAM_USER_ID=17841400XXXXXXX
INSTAGRAM_APP_ID=your-app-id
INSTAGRAM_APP_SECRET=your-app-secret
```

### API Endpoints We Use

#### Fetch All Media (Latest Reels)
```
GET https://graph.instagram.com/{user-id}/media
  ?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count
  &access_token={token}
```
- Returns up to 10K most recent media
- Filter `media_type === 'VIDEO'` for reels only
- Sort by `timestamp` desc → **Latest Reels**
- Supports time-based pagination with `since` and `until`

#### Fetch Engagement (Most Viral)
Same endpoint, but sort by engagement score:
```
engagement = like_count + (comments_count * 3)
```
Higher weight on comments (indicates deeper engagement). Sort desc → **Most Viral Reels**

#### Auto-Refresh Token (Every 50 Days)

**For Instagram Login tokens:**
```
GET https://graph.instagram.com/refresh_access_token
  ?grant_type=ig_refresh_token
  &access_token={long-lived-token}
```

**For Facebook Login tokens:**
```
GET https://graph.facebook.com/v25.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={app-id}
  &client_secret={app-secret}
  &fb_exchange_token={current-long-lived-token}
```

Returns a **new 60-day token**. Our `instagramService.ts` handles this automatically.

### Access Level: Standard (No App Review Needed)
Since we only access **our own account** (`@thebongbari`), we only need **Standard Access** — no Meta App Review, no Business Verification. This works permanently for:
- Reading our own media (reels, posts)
- Getting engagement metrics (likes, comments)
- Refreshing tokens indefinitely

### Rate Limits
- `4800 × impressions` calls per 24-hour rolling window
- For a typical account: ~4,800–48,000 calls/day (more than enough)
- Our service refreshes every 2 minutes = ~720 calls/day (well within limits)

---

## 📋 Migration Phases

### Phase 1: Backend API (Foundation — Do First)
**Current:** YouTube Data API v3 + RSS scraping (`youtubeService.ts`)  
**Target:** Instagram Graph API with identical architecture (`instagramService.ts`)

| Task | File | Details |
|------|------|---------|
| Create Instagram service | `server/instagramService.ts` | Class-based, 2-min refresh, auto token refresh, latest + popular |
| Add API routes | `server/routes/cms.ts` | `/api/instagram/latest` + `/api/instagram/popular` |
| Set env vars | `server/.env` | `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`, `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` |

**Service Architecture (mirrors YouTubeService):**
```typescript
class InstagramService {
  // Identical pattern to YouTubeService
  start(userId, token)     // Begin auto-refresh cycle
  stop()                   // Stop interval
  getLatest(count)         // Recent reels by timestamp
  getPopular(count)        // Most viral by engagement score
  forceRefresh()           // Immediate fetch
  refreshToken()           // Auto-refresh before 60-day expiry
}
```

### Phase 2: Hero Section (High Impact)
**Current:** YouTube video embed (iframe, nocookie domain, tap-to-watch)  
**Target:** Instagram Reel embed or self-hosted MP4

| Task | File | Details |
|------|------|---------|
| Replace hero YouTube iframe with IG reel | `home.tsx` | Use self-hosted MP4 (fastest) or `instagram.com/reel/{id}/embed` |
| Update "Tap to Watch" thumbnail | `home.tsx` | Use `thumbnail_url` from Graph API (CDN-fresh) |
| Change Subscribe CTA → Follow on Instagram | `home.tsx` | Red YouTube button → Gradient IG button with IG icon |
| Replace YouTube icon import | `home.tsx` | `Youtube` → `Instagram` from lucide-react |

**Hero Strategy:** Self-hosted MP4 for speed. The `instagramService` provides the reel URL — we can cache the actual video file on the Oracle VM for instant loading.

### Phase 3: Video Grid Sections
**Current:** YouTube Shorts cards with thumbnails → iframe on click  
**Target:** Instagram Reels grid powered by live API data

| Task | File | Details |
|------|------|---------|
| Create `InstagramReel` component | `client/src/components/instagram-reel.tsx` | Thumbnail + play overlay → opens IG reel in new tab |
| Replace `YouTubeShort` in home.tsx | `home.tsx` | Swap to `<InstagramReel>` using API data |
| Update useQuery hooks | `home.tsx` | `/api/youtube/*` → `/api/instagram/*` |
| Update section titles | `home.tsx` | "View All on YouTube" → "View All on Instagram" |

**Data Structure:**
```typescript
interface InstagramReel {
  reelId: string;         // Instagram media ID
  caption: string;        // First line of caption
  thumbnail: string;      // thumbnail_url from Graph API
  permalink: string;      // Full instagram.com URL
  publishedAt: string;    // ISO timestamp
  likeCount: number;      // For engagement scoring
  commentCount: number;   // For engagement scoring
}
```

### Phase 4: CTAs & Links Sitewide
| Task | File | Details |
|------|------|---------|
| Hero Subscribe → Follow | `home.tsx` | YouTube subscribe → `instagram.com/thebongbari` |
| Footer IG link priority | `footer.tsx` | Move Instagram to first position |
| Schema.org JSON-LD | `client/index.html` | Update sameAs URLs — Instagram first |
| Social meta tags | SEO head | og:see_also → Instagram profile |

### Phase 5: Thumbnail Strategy
**Solved by Graph API:** The `thumbnail_url` field from Graph API provides CDN-hosted thumbnails directly. No need for self-hosting.

- **Primary:** `thumbnail_url` from `GET /{user-id}/media` (auto-refreshed with data)
- **Fallback:** Self-hosted WebP in `client/public/reels/` for hero/featured content
- **CDN URLs are session-valid** — they refresh every 2 minutes with our service cycle

---

## 🏗️ Implementation Order (All Permanent, No Manual Steps)

```
Phase 1 — Backend (DO FIRST):
├── 1. ✅ Create instagramService.ts (mirrors youtubeService.ts)
├── 2. ✅ Add /api/instagram/latest + /api/instagram/popular routes
├── 3. Get Instagram Graph API token (one-time setup, then auto-refresh)
└── 4. Test endpoints: GET http://localhost:5000/api/instagram/latest

Phase 2 — Frontend Hero:
├── 5. Replace hero video with latest/featured IG reel
├── 6. Subscribe CTA → Follow on Instagram
└── 7. Update hero thumbnail source

Phase 3 — Frontend Grids:
├── 8. Create InstagramReel component
├── 9. Swap YouTubeShort → InstagramReel in Latest Comedy section
├── 10. Swap YouTubeShort → InstagramReel in Most Loved section
└── 11. Update useQuery URLs to /api/instagram/*

Phase 4 — Sitewide:
├── 12. Footer: IG link first, YT secondary
├── 13. Schema.org + meta tags
└── 14. Remove youtubeService.ts (cleanup, keep YouTube routes as legacy)
```

---

## 📂 Files to Create/Modify

### New Files
- `server/instagramService.ts` — Permanent IG Graph API service (auto-refresh tokens + data)
- `client/src/components/instagram-reel.tsx` — Reel card component

### Modified Files
- `server/routes/cms.ts` — Add `/api/instagram/latest` + `/api/instagram/popular`
- `server/.env` — Add `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`, `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`
- `client/src/pages/home.tsx` — Hero, sections, CTAs, data queries
- `client/src/components/footer.tsx` — Social link priority
- `client/index.html` — Schema.org, meta tags

### Keep as Legacy (remove later)
- `server/youtubeService.ts` — Keep working, YouTube routes stay functional
- `client/src/components/youtube-short.tsx` — Replace with instagram-reel.tsx after testing

---

## 🔒 Security Notes

- **NEVER commit tokens to git.** All tokens live in `server/.env` (gitignored).
- **Token auto-refresh** runs server-side only — no tokens exposed to frontend.
- **Standard Access** = no App Review needed for own account. Fully permanent.
- **Rate limiting** is generous (4800 × impressions/day). Our 2-min refresh is well within limits.

---

## 🚀 Quick Start Commands

**After setting up env vars, test the API:**
```powershell
# Start servers
npm run dev:live

# Test Instagram API endpoints
curl http://localhost:5000/api/instagram/latest
curl http://localhost:5000/api/instagram/popular
```

**To begin frontend migration, tell the agent:**
> "Execute Instagram migration Phase 2 — replace hero with Instagram, swap video grids to InstagramReel component"
