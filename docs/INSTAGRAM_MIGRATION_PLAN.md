# Instagram Migration Plan — Replace YouTube with Instagram

> **Status:** Planning → Ready for execution  
> **Priority:** HIGH — Instagram driving more audience than YouTube  
> **Scope:** Homepage hero, video sections, CTAs, footer, backend API  

---

## 🎯 Goal

Replace YouTube as the primary content platform with Instagram Reels. YouTube stays as a secondary link — Instagram becomes the hero, the grid, the CTAs.

---

## 📋 Migration Phases

### Phase 1: Hero Section (High Impact)
**Current:** YouTube video embed (iframe, nocookie domain, tap-to-watch)  
**Target:** Instagram Reel embed or native video player

| Task | File | Details |
|------|------|---------|
| Replace hero YouTube iframe with Instagram Reel embed | `client/src/pages/home.tsx` L447-468 | Use `instagram.com/reel/{id}/embed` or self-hosted MP4 for speed |
| Update "Tap to Watch" thumbnail | `home.tsx` L441 | Replace `i.ytimg.com` thumbnail with IG reel cover or custom poster |
| Change Subscribe CTA → Follow on Instagram | `home.tsx` L518 | Red YouTube button → Gradient IG button with IG icon |
| Remove YouTube icon import | `home.tsx` L21 | Replace `Youtube` with `Instagram` from lucide-react |

**Decision Point:** Instagram embeds are SLOW (heavy iframe). Options:
1. **Self-hosted MP4** (fastest — host 1-2 featured reels as MP4 on the server/CDN) ⭐ RECOMMENDED
2. **Instagram oEmbed** (requires Facebook API token, still iframe-based)
3. **Instagram embed iframe** (no API needed, but heavy and may break)

### Phase 2: Video Grid Sections (Latest Comedy + Most Loved)
**Current:** YouTube Shorts cards with thumbnails → iframe on click  
**Target:** Instagram Reels grid

| Task | File | Details |
|------|------|---------|
| Create `InstagramReel` component | New: `client/src/components/instagram-reel.tsx` | Thumbnail + play overlay → opens IG reel in new tab (or inline embed) |
| Replace `YouTubeShort` usage in home.tsx | `home.tsx` L636, L713 | Swap `<YouTubeShort>` → `<InstagramReel>` |
| Update fallback video data | `home.tsx` L320-327 | Replace YouTube `videoId`s with Instagram reel shortcodes |
| Update section titles/links | `home.tsx` L605, L682 | "View All on YouTube" → "View All on Instagram" |

**Data structure change:**
```typescript
// Before (YouTube)
interface YouTubeVideo {
  videoId: string;      // YouTube video ID
  title: string;
  thumbnail: string;    // i.ytimg.com URL
  publishedAt: string;
}

// After (Instagram)
interface InstagramReel {
  reelId: string;       // Instagram reel shortcode (e.g., "C1234abcdef")
  title: string;        // Caption or custom title
  thumbnail: string;    // CDN-hosted thumbnail (IG thumbnails need auth)
  publishedAt: string;
  permalink: string;    // Full Instagram URL
}
```

### Phase 3: Backend API Migration
**Current:** YouTube Data API v3 + RSS scraping  
**Target:** Instagram Graph API (or manual curation)

| Task | File | Details |
|------|------|---------|
| Create IG service | New: `server/instagramService.ts` | Fetch reels via Graph API or manual JSON |
| Update API routes | `server/routes/cms.ts` | `/api/youtube/latest` → `/api/instagram/latest` |
| Update client queries | `home.tsx` L310-318 | Change query URLs to `/api/instagram/*` |
| New env vars | `server/.env` | `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID` |

**Instagram API Options:**
1. **Instagram Graph API** (requires Facebook Business account + long-lived token)
   - Endpoint: `GET /{user-id}/media?fields=id,caption,media_url,thumbnail_url,permalink,timestamp&media_type=VIDEO`
   - Token refresh: every 60 days
   - Pros: Official, reliable
   - Cons: Needs Facebook Business setup
   
2. **Manual curation** (no API needed) ⭐ SIMPLEST
   - Hardcode 4-8 featured reels in a JSON config file
   - Update monthly or when new content drops
   - Pros: Zero API dependency, instant, free
   - Cons: Manual updates needed

3. **Hybrid** (recommended for v1)
   - Start with manual curation (Phase 1)
   - Add Graph API later when token setup is done (Phase 2)

### Phase 4: CTAs & Links Sitewide
| Task | File | Details |
|------|------|---------|
| Hero Subscribe → Follow | `home.tsx` L515-518 | YouTube subscribe → `instagram.com/thebongbari` |
| Footer YouTube link priority | `footer.tsx` L38 | Move Instagram to first position, YouTube secondary |
| Schema.org JSON-LD | `client/index.html` | Update sameAs URLs — Instagram first |
| Social meta tags | SEO head | og:see_also → Instagram profile |
| Work With Us trust badges | `work-with-us.tsx` | "1M+ Views" → "500K+ Reels Views" or similar |

### Phase 5: Thumbnail Strategy
**Problem:** Instagram doesn't provide public thumbnail URLs like YouTube does.

**Solutions:**
1. **Self-hosted thumbnails** — Screenshot reel covers, host in `client/public/reels/` ⭐
2. **Use `media_url`** from Graph API (requires token)
3. **Use Instagram CDN** — URLs expire, NOT recommended for production

**Recommended approach:** Host thumbnails as WebP in `client/public/reels/thumb-{reelId}.webp`

---

## 🏗️ Implementation Order

```
Week 1 (Quick Wins):
├── 1. Replace hero CTA: Subscribe → Follow on Instagram
├── 2. Update footer: IG link first
├── 3. Manually curate 8 featured reels (4 latest, 4 popular)
├── 4. Create InstagramReel component (thumbnail + external link)
└── 5. Swap video grids to use InstagramReel

Week 2 (Polish):
├── 6. Self-host reel thumbnails as WebP
├── 7. Hero section: self-hosted MP4 or IG embed
├── 8. Update schema.org & meta tags
└── 9. Remove YouTube service code (cleanup)

Week 3 (Optional API):
├── 10. Setup Instagram Graph API token
├── 11. Create instagramService.ts
├── 12. Auto-fetch latest reels via API
└── 13. Token refresh cron job
```

---

## ⚠️ Key Decisions Needed

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Hero video source | Self-hosted MP4 / IG embed / Keep YT | **Self-hosted MP4** (fastest load) |
| Reel grid behavior on click | Open in new tab / Inline embed / Modal | **Open in new tab** (simplest, sends traffic to IG) |
| Data source | Graph API / Manual JSON / Both | **Manual JSON first**, API later |
| Keep YouTube at all? | Remove completely / Secondary link | **Keep as secondary** in footer only |
| Thumbnail hosting | Self-hosted WebP / CDN / API | **Self-hosted WebP** in `/public/reels/` |

---

## 📂 Files to Create/Modify

### New Files
- `client/src/components/instagram-reel.tsx` — Reel card component
- `client/src/data/featured-reels.ts` — Manual reel curation data
- `client/public/reels/` — Thumbnail directory
- `server/instagramService.ts` — (Phase 3, optional)

### Modified Files
- `client/src/pages/home.tsx` — Hero, sections, CTAs, data queries
- `client/src/components/footer.tsx` — Social link priority
- `client/index.html` — Schema.org, meta tags
- `server/routes/cms.ts` — New API endpoints
- `shared/schema.ts` — New types (if Graph API)

### Deprecated (can remove after migration)
- `client/src/components/youtube-short.tsx` — Replace with instagram-reel.tsx
- `server/youtubeService.ts` — Replace with instagramService.ts (or remove if manual)

---

## 🚀 Quick Start Command

To begin Phase 1 (hero CTA + footer), tell the agent:
> "Execute Instagram migration Phase 1 — change hero Subscribe to Follow on Instagram, update footer IG link priority"

To begin Phase 2 (video grids), tell the agent:
> "Execute Instagram migration Phase 2 — create InstagramReel component, swap video grids with manual reel data"
