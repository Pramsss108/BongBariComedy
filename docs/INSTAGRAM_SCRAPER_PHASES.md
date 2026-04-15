# Instagram Reels — Multi-Tier Architecture

## Overview
A **multi-tier** Instagram Reels pipeline for BongBari that automatically falls
back between data sources. Data is fetched daily via GitHub Actions, committed to
git as static JSON, and served by the Express backend.

### Why not scraping?
> **Exhaustive testing (April 2025)** confirmed every scraping method is dead:
> - ALL Picuki/Proxigram mirrors: dead certs, DNS failures, captcha walls
> - IG v1 Private API: 429 even through paid residential ASOCKS proxy
> - Instaloader (Python): 403 even through residential proxy
> - IG embed page: 785KB shell, zero media data
> - IG profile page: login wall via proxy
> - Instagram has locked ALL anonymous scraping completely.

---

## Architecture

```
                          ┌──────────────────────────────┐
  2 AM UTC (daily)        │    GitHub Actions Runner      │
  schedule: cron          │                                │
  ───────────────────────►│  node scripts/scrape-reels.cjs │
                          │         │                      │
                          │  ┌──────▼──────────────────┐   │
                          │  │ Tier 1: Graph API       │   │
                          │  │ (official, free)        │   │
                          │  └──────┬──────────────────┘   │
                          │         │ if fails...          │
                          │  ┌──────▼──────────────────┐   │
                          │  │ Tier 2: RapidAPI        │   │
                          │  │ (commercial free tier)  │   │
                          │  └──────┬──────────────────┘   │
                          │         │                      │
                          │    Smart-Cache Check           │
                          │    (only write if changed)     │
                          │         │                      │
                          │    ┌────▼──────────────┐       │
                          │    │ git commit + push │       │
                          │    └───────────────────┘       │
                          └──────────────────────────────┘
                                     │
                                     ▼
                  client/public/data/reels-data.json
                  (committed to git, served statically)
                                     │
                                     ▼
                  ┌──────────────────────────────────┐
                  │       Express Backend             │
                  │  instagramService.ts              │
                  │                                    │
                  │  Priority 1: Static JSON ◄── daily │
                  │  Priority 2: Graph API   ◄── live  │
                  └──────────────────────────────────┘
```

## Files
| File | Purpose |
|------|---------|
| `scripts/scrape-reels.cjs` | Multi-tier fetcher (Graph API → RapidAPI), smart-cache, seed mode |
| `.github/workflows/update-reels.yml` | Daily cron at 2 AM UTC + manual trigger |
| `client/public/data/reels-data.json` | Static output (committed to git) |
| `server/instagramService.ts` | Service: Static JSON priority → Graph API fallback |
| `docs/INSTAGRAM_SETUP_GUIDE_NO_CODER.md` | Baby-step setup guide for Graph API token |

---

## Setup Options (pick ONE or both)

### Option A: Graph API (recommended — free, permanent, official)
**Setup time: ~10 minutes**

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new app → "Business" type
3. Add "Instagram Basic Display" product
4. In Graph API Explorer, get a User Token with `user_media` scope
5. Exchange for a long-lived token (60 days, auto-refreshed by scraper)
6. Add GitHub Secrets:
   - `INSTAGRAM_USER_ID` — Your Instagram Business Account numeric ID
   - `INSTAGRAM_ACCESS_TOKEN` — Long-lived Graph API token

Full guide: `docs/INSTAGRAM_SETUP_GUIDE_NO_CODER.md`

### Option B: RapidAPI (easy — 2 minutes, 100-500 free requests/month)
**Setup time: ~2 minutes**

1. Go to [rapidapi.com](https://rapidapi.com) → Create free account
2. Search for "Instagram Data" (or "Instagram47", "Instagram Scraper")
3. Subscribe to the free tier
4. Copy your API key from the dashboard
5. Add GitHub Secrets:
   - `RAPIDAPI_KEY` — Your RapidAPI key
   - `RAPIDAPI_HOST` — The API host (e.g., `instagram-data1.p.rapidapi.com`)

### Option C: Both (belt-and-suspenders)
Set all secrets → Graph API is tried first, RapidAPI is automatic fallback.

---

## Test Locally

```powershell
# Create seed data (no API needed)
node scripts/scrape-reels.cjs --seed

# Test Graph API
$env:INSTAGRAM_USER_ID="your-id"
$env:INSTAGRAM_ACCESS_TOKEN="your-token"
node scripts/scrape-reels.cjs --tier=graph --force

# Test RapidAPI
$env:RAPIDAPI_KEY="your-key"
$env:RAPIDAPI_HOST="instagram-data1.p.rapidapi.com"
node scripts/scrape-reels.cjs --tier=rapid --force

# Auto-detect (tries all configured tiers)
node scripts/scrape-reels.cjs --force

# Check generated data
type client\public\data\reels-data.json

# Check backend data source
curl http://localhost:5000/api/instagram/info

# Trigger GitHub Actions manually
# → GitHub repo → Actions → Update Instagram Reels Data → Run workflow
```

---

## Smart-Cache
The scraper only writes `reels-data.json` when **actual content changes**:
1. Compare `totalVideos` count
2. Compare `latest[0..3].reelId` (newest 4 IDs)
3. Compare `popular[0..3].reelId` (top 4 IDs)
4. If ALL match → skip write → no git commit → no deploy

## Token Auto-Refresh
Graph API: scraper calls the token refresh endpoint after each run. Tokens last
60 days and are renewable indefinitely. Daily cron keeps them fresh.
