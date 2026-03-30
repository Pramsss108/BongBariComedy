# Client-Side IP Extraction — Technical Design
> BongBari Residential IP Bypass System

## Problem
Oracle VM (Frankfurt datacenter) and Hetzner VPS (Germany datacenter) IPs are flagged by YouTube BotGuard, Instagram, and Facebook bot detection. Downloads fail with 403/422 errors because these platforms block known datacenter ASNs.

## Solution
Move metadata extraction to the **visitor's browser**. When a user clicks "Download," their browser (residential IP) makes the extraction request directly. The server only handles routing logic and CDN redirect.

## How It Works

### Flow: Normal (Hetzner succeeds)
```
1. Client → POST /api/downloader/info { url }
2. Oracle → GET :9000/api/json { url }  (Hetzner Cobalt)
3. Hetzner → YouTube API → extracts stream URL
4. Oracle → 302 redirect client to CDN
5. Client → downloads directly from Google CDN
```

### Flow: Fallback (Hetzner blocked → client extraction)
```
1. Client → POST /api/downloader/info { url }
2. Oracle → GET :9000/api/json { url }  (Hetzner Cobalt → 403!)
3. Oracle → responds { mode: "client_extract", targets: [...] }
4. Client JS → fetches noembed.com/embed?url=... (residential IP)
5. Client JS → fetches Piped API mirror (residential IP)
6. Client → POST /api/downloader/resolve { extractedData }
7. Oracle → validates + resolves final CDN link
8. Oracle → 302 redirect client to CDN
```

## Client-Side Extraction Targets

### Tier 1: CORS-Safe Public APIs (no proxy needed)
```javascript
// YouTube oEmbed — returns title, thumbnail, author
const oembed = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`);

// Piped API mirrors — returns full stream URLs
const PIPED_MIRRORS = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de', 
  'https://pipedapi.in.projectsegfau.lt',
];
const videoId = extractYouTubeId(url);
const data = await fetch(`${mirror}/streams/${videoId}`);
```

### Tier 2: Invidious Mirrors
```javascript
const INVIDIOUS_MIRRORS = [
  'https://inv.nadeko.net',
  'https://invidious.fdn.fr',
  'https://invidious.privacyredirect.com',
];
const data = await fetch(`${mirror}/api/v1/videos/${videoId}`);
// Returns: title, description, adaptiveFormats[], formatStreams[]
```

### Tier 3: Instagram/Facebook (harder)
```javascript
// Instagram: Use noembed for basic metadata
const igData = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(igUrl)}`);

// Facebook: Limited public API, mostly needs server-side
// Fallback: Use Cobalt with proxy rotation on Hetzner
```

## Server-Side API Changes

### New endpoint: `/api/downloader/resolve`
```typescript
// Receives client-extracted metadata, validates it, and returns CDN link
app.post('/api/downloader/resolve', rateLimit({ windowMs: 60000, max: 30 }), async (req, res) => {
  const { videoId, extractedStreams, source } = req.body;
  
  // Validate: ensure videoId matches expected format
  // Validate: extracted stream URLs point to known CDNs only (googlevideo.com, etc.)
  // Pick best format based on user's requested quality
  // Return 302 redirect to CDN
});
```

### Modified `/api/downloader/info` response
```typescript
// When server extraction fails, return client_extract signal
if (hetznerFailed && !serverCanResolve) {
  return res.json({
    mode: 'client_extract',
    videoId: extractedId,
    targets: [
      { type: 'piped', mirrors: PIPED_MIRRORS },
      { type: 'invidious', mirrors: INVIDIOUS_MIRRORS },
      { type: 'oembed', url: `https://noembed.com/embed?url=${url}` },
    ],
    resolveEndpoint: '/api/downloader/resolve',
  });
}
```

## Client-Side Service (React)

### `client/src/lib/clientExtractor.ts`
```typescript
interface ExtractionResult {
  videoId: string;
  title: string;
  thumbnail: string;
  streams: Array<{ url: string; quality: string; mimeType: string }>;
  source: 'piped' | 'invidious' | 'oembed';
}

export async function extractFromClient(
  videoUrl: string,
  targets: Target[]
): Promise<ExtractionResult | null> {
  // Try each target in order (Piped → Invidious → oEmbed)
  for (const target of targets) {
    try {
      const result = await tryExtract(target, videoUrl);
      if (result?.streams?.length) return result;
    } catch { continue; }
  }
  return null; // All failed
}

async function tryPipedMirror(mirror: string, videoId: string): Promise<ExtractionResult | null> {
  const resp = await fetch(`${mirror}/streams/${videoId}`, { 
    signal: AbortSignal.timeout(10000) 
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return {
    videoId,
    title: data.title,
    thumbnail: data.thumbnailUrl,
    streams: [...data.audioStreams, ...data.videoStreams].map(s => ({
      url: s.url,
      quality: s.quality,
      mimeType: s.mimeType,
    })),
    source: 'piped',
  };
}
```

## Security Considerations

### What We Validate Server-Side
1. **URL allowlist**: Only accept CDN URLs from `googlevideo.com`, `fbcdn.net`, `cdninstagram.com`
2. **VideoId format**: Must match `^[a-zA-Z0-9_-]{11}$` for YouTube
3. **Rate limiting**: 30 resolve requests/minute per IP
4. **No arbitrary URLs**: Server never fetches user-supplied URLs blindly

### User Consent
- The downloader UI shows: "Using your connection for faster extraction"
- This is functionally identical to the user visiting YouTube/Piped directly
- No visitor IPs are stored, shared, or reused for other purposes
- The user initiates every request themselves

## Implementation Phases

### Phase 1 (MVP) — oEmbed + Piped metadata
- Client fetches title/thumbnail from noembed.com
- Client tries 3 Piped mirrors for stream URLs
- Server validates and redirects to CDN

### Phase 2 — Invidious + format selection
- Add Invidious mirror rotation
- Client-side quality picker based on available streams
- Smart caching of working mirrors

### Phase 3 — Advanced browser extraction
- WebCrypto-based PO-Token generation in browser
- Direct YouTube player API extraction
- Service Worker caching for repeat downloads

## Mirror Health Monitoring
```typescript
// Server maintains a health map of public mirrors
// Updated via background check every 30 minutes
const MIRROR_HEALTH: Map<string, { alive: boolean; latencyMs: number; lastCheck: Date }> = new Map();

// /api/downloader/mirrors endpoint returns healthy mirrors to client
app.get('/api/downloader/mirrors', (req, res) => {
  const healthy = [...MIRROR_HEALTH.entries()]
    .filter(([, h]) => h.alive)
    .sort((a, b) => a[1].latencyMs - b[1].latencyMs)
    .map(([url]) => url);
  res.json({ piped: healthy.filter(u => u.includes('piped')), invidious: healthy.filter(u => !u.includes('piped')) });
});
```

---

> This system ensures downloads work even when ALL datacenter IPs are blocked.
> The user's own residential IP does the heavy lifting, making blocks impossible
> without blocking all residential internet users (which platforms won't do).
