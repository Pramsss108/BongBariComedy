# 🧠 Client-Side IP Cloaking — How It Works (Plain English)

> **For non-coders.** No jargon. If you can understand a relay race, you can understand this.

---

## 🤔 The Problem First

When your server tries to download a YouTube or Instagram video, the request looks like this:

```
Your Server (Oracle VM, Frankfurt)
IP: 79.76.110.66  ← DATACENTER IP
         │
         ▼
  YouTube / Instagram
  "This is a data center."
  "This is a bot."
  ❌ BLOCKED.
```

Datacenters are flagged. YouTube, Instagram, and every major platform **auto-block** any request
that comes from a known hosting provider IP. No matter how clever your code is, the IP address
gives you away instantly.

---

## 💡 The Insight: Use the Visitor's IP Instead

Every person visiting your website already has a **residential IP** — the same kind YouTube and
Instagram expect from real users. Their ISP gave it to them. It looks completely normal.

Instead of your server doing the work, **the visitor's browser does it.**

```
Visitor's Phone/Laptop
IP: 103.x.x.x  ← Home/Mobile IP → Completely normal
         │
         ▼
  YouTube / Instagram / Piped Mirror
  "This is a real user browsing."
  ✅ ALLOWED.
```

The visitor fetches the video info. Your server never touches the platform at all.
**You "cloak" your operations behind millions of real residential IPs.**

---

## 🏗️ Full Architecture — Visual Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VISITOR'S BROWSER                               │
│                    (their home/mobile IP address)                       │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │  clientExtractor.ts  (runs in browser, uses visitor's IP)    │       │
│  │                                                              │       │
│  │  Step 1: Fetch mirror list from Cloudflare Worker            │       │
│  │  Step 2: Try Piped mirror 1 → get video streams             │       │
│  │  Step 3: If fail → try Piped mirror 2                       │       │
│  │  Step 4: If fail → try Invidious mirror 1                   │       │
│  │  Step 5: Report result to Cloudflare D1                     │       │
│  │  Step 6: Download direct from CDN (googlevideo.com)         │       │
│  └──────────────────────────────────────────────────────────────┘       │
│           │                    │                         │               │
└───────────┼────────────────────┼─────────────────────────┼───────────────┘
            │                    │                         │
            ▼                    ▼                         ▼
  ┌─────────────────┐  ┌─────────────────┐    ┌────────────────────────┐
  │  Cloudflare     │  │  Piped Mirror   │    │  googlevideo.com CDN   │
  │  Worker + D1   │  │  (Public API)   │    │  (Direct video file)   │
  │                 │  │                 │    │                        │
  │  - Mirror list  │  │  pipedapi.      │    │  The actual MP4/WebM   │
  │  - Health stats │  │  kavin.rocks    │    │  streamed directly     │
  │  - Country data │  │                 │    │  to visitor's device   │
  │  - 100K req/day │  │  Returns full   │    │  (zero server load)    │
  │  - FREE         │  │  stream URLs    │    │                        │
  └─────────────────┘  └─────────────────┘    └────────────────────────┘
            │
            │  (only if all client mirrors fail)
            ▼
  ┌─────────────────────────────────────────────────────┐
  │           Oracle VM (79.76.110.66)                  │
  │           YOUR SERVER — Last Resort Only            │
  │                                                     │
  │  Phase 1: Hetzner Cobalt (78.47.104.43)            │
  │  Phase 2: yt-dlp + IPv6 rotation                   │
  │  Phase 3: Proxy pool fallback                      │
  └─────────────────────────────────────────────────────┘
```

---

## 📊 Which Platforms — What Works, What Doesn't

```
┌───────────────────┬─────────────────────────────┬──────────────────────────┐
│ Platform          │ Client-Side Extraction       │ How                      │
├───────────────────┼─────────────────────────────┼──────────────────────────┤
│ ✅ YouTube        │ YES — PRIMARY PATH           │ Piped API / Invidious    │
│                   │ Zero server needed           │ (open APIs, no CORS)     │
├───────────────────┼─────────────────────────────┼──────────────────────────┤
│ ✅ YouTube Shorts │ YES — same as above          │ Same Piped/Invidious     │
├───────────────────┼─────────────────────────────┼──────────────────────────┤
│ ⚠️ Instagram      │ PARTIAL — embed preview only │ oEmbed API (public,      │
│                   │ Full download needs server   │ no auth needed)          │
├───────────────────┼─────────────────────────────┼──────────────────────────┤
│ ⚠️ Facebook       │ PARTIAL — embed preview only │ oEmbed API works for     │
│                   │ Full download needs server   │ public posts             │
├───────────────────┼─────────────────────────────┼──────────────────────────┤
│ ✅ Twitter/X      │ YES — can add                │ Public nitter mirrors    │
│                   │ (not built yet)              │ (same pattern as Piped)  │
├───────────────────┼─────────────────────────────┼──────────────────────────┤
│ ✅ TikTok         │ YES — can add                │ SyktokAPI / public       │
│                   │ (not built yet)              │ mirror APIs              │
├───────────────────┼─────────────────────────────┼──────────────────────────┤
│ ✅ Reddit         │ YES — can add                │ Public JSON API          │
│                   │ (not built yet)              │ (add .json to any URL)   │
└───────────────────┴─────────────────────────────┴──────────────────────────┘
```

---

## 🔑 Why Instagram Is Different (The CORS Problem Explained Simply)

### What is CORS?

Imagine you're in a library. The rule is: **you can only read books from your own shelf.**
If you try to grab a book from someone else's shelf, the librarian stops you.

CORS is that librarian — browsers enforce it by default.

```
Your Website (bongbari.com)
         │
         │  "Give me this Instagram video"
         ▼
  Instagram CDN (fbcdn.net)
         │
         │  "Your website is not instagram.com"
         │  "Request blocked by CORS policy"
         ▼
  ❌ Browser refuses to show you the data
```

### Why YouTube works but Instagram doesn't

**Piped and Invidious are PURPOSE-BUILT public mirror APIs.** They specifically set
`Access-Control-Allow-Origin: *` in their response headers — meaning any website can
read their data. **They invited browsers in.**

Instagram's CDN (`fbcdn.net`) does NOT set those headers. The browser won't fetch it
directly from your JavaScript code.

```
YOUTUBE PATH:
Your Browser → pipedapi.kavin.rocks/streams/VIDEO_ID
                       ↓
               Returns: { videoUrl: "https://googlevideo.com/..." }
               Header:  Access-Control-Allow-Origin: *  ✅ CORS OPEN
                       ↓
Your Browser → googlevideo.com/...  (direct download, also CORS-open)
✅ Works completely in browser, no server needed

──────────────────────────────────────────────────

INSTAGRAM PATH:
Your Browser → fbcdn.net/video/...
               Header:  NO Access-Control-Allow-Origin  ❌ CORS BLOCKED
Your Browser → Blocked by browser security policy
❌ Cannot do this from JavaScript
→ Must go through server proxy
```

### The Instagram Solution (Server as CORS Proxy)

For Instagram, the server acts as a CORS bridge — but it only needs to fetch a
**tiny redirect URL** (not stream the whole video):

```
Browser → Your Server → Instagram → Get redirect CDN URL
                                          ↓
                     Return: fbcdn.net/video/abc.mp4
                                          ↓
Browser → fbcdn.net/video/abc.mp4  (direct, browser handles it)
```

The server only fetches ~1KB of metadata. The actual video file streams
**directly to the visitor's device** from Instagram's CDN. Zero bandwidth cost on your VM.

---

## 🌍 The Crowd Intelligence Layer

Every time someone uses the downloader, their browser silently reports:
- Which mirror worked
- How fast it was (latency)
- Which country they're in
- Did it succeed or fail

This data goes to the Cloudflare Worker → D1 database.

```
Visitor 1 (India)    → Piped mirror 1 worked in 234ms  ──┐
Visitor 2 (Germany)  → Piped mirror 2 worked in 89ms   ──┤
Visitor 3 (India)    → Piped mirror 1 timed out        ──┤──→ D1 Database
Visitor 4 (USA)      → Invidious worked in 312ms       ──┤
Visitor 5 (India)    → Piped mirror 3 worked in 190ms  ──┘
                                                            │
                                                            ▼
                                                    Mirror Health Table:
                                              ┌──────────────────────────────┐
                                              │ Mirror         IN    DE   US │
                                              │ piped.kavin    72%   91%  68% │
                                              │ piped.admin    45%   88%  77% │
                                              │ inv.nadeko     89%   65%  81% │
                                              └──────────────────────────────┘
                                                            │
                                                   Next Indian visitor
                                                   gets inv.nadeko FIRST
                                                   (89% success rate for IN)
```

The system gets **smarter with every visitor.** No manual maintenance needed.

---

## 🛠️ How to Reuse This for Any Other Tool

The architecture is completely generic. The client-side extractor is just:
1. A list of public APIs that don't block browsers
2. A loop that tries each one until one works
3. A reporting system so the list stays healthy

### Add Twitter/X support (example):

```
// In clientExtractor.ts — add Nitter mirrors
const NITTER_MIRRORS = [
  'https://nitter.net',
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
];

async function tryNitter(mirror, tweetId) {
  const res = await fetch(`${mirror}/${tweetId}/video/1`);
  // Returns video URL
}
```

### Add TikTok support (example):

```
// TikTok has a public oEmbed endpoint — no auth needed
async function tryTikTokOEmbed(videoUrl) {
  const res = await fetch(
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`
  );
  // Returns: thumbnail, title, embed HTML
}
```

### Pattern — works for ANY platform that has a public mirror:

```
┌─────────────────────────────────────────────────────────┐
│  1. Find public mirror API (Piped, Invidious, Nitter...) │
│  2. Check if it allows CORS (Access-Control-Allow-Origin)│
│  3. Add to mirror list in clientExtractor.ts             │
│  4. Write a tryXxx() function with the API format        │
│  5. Add to the mirror rotation loop                      │
│  DONE — no proxy, no server cost, auto-fallback          │
└─────────────────────────────────────────────────────────┘
```

---

## 💰 Cost Comparison

```
Old Way (Server Proxy Everything):
┌─────────────────────────────────────────────┐
│  Every video download = Server bandwidth    │
│  1000 users × 50MB average = 50GB/day       │
│  Oracle free tier: 10TB/month ← OK but...  │
│  Server RAM under load = risk of OOM crash  │
│  Proxy pool needed = $$$ per month          │
│  Datacenter IP = gets blocked constantly    │
└─────────────────────────────────────────────┘

New Way (Client-First Cloaking):
┌─────────────────────────────────────────────┐
│  YouTube: Server handles 0 bytes of video   │
│  All video bytes: visitor ↔ CDN directly    │
│  Server only: tiny metadata (2KB) if needed │
│  Proxy pool: NOT NEEDED for YouTube         │
│  Cloudflare D1: FREE (5GB included)         │
│  Blocked IPs: NOT YOUR PROBLEM anymore      │
│  More visitors = more residential IPs = 💪  │
└─────────────────────────────────────────────┘
```

---

## 🔄 Full Request Flow — Step by Step

```
USER TYPES: https://youtube.com/watch?v=abc123
                        │
                        ▼
            [Browser detects: YouTube URL]
                        │
                        ▼
            [Fetch mirror health list]
            GET bongbari-extractor.workers.dev/mirrors
            ← Returns: [piped.kavin.rocks #1, inv.nadeko #2, ...]
                        │
                        ▼
            [Try Mirror #1 — pipedapi.kavin.rocks]
            GET pipedapi.kavin.rocks/streams/abc123
                        │
                  ┌─────┴─────┐
                  │ Success?  │
                  └─────┬─────┘
              ✅ YES    │    ❌ NO
                  ┌─────┘         └─────────────────────────┐
                  ▼                                         ▼
       [Got stream URLs:                        [Try Mirror #2 — inv.nadeko]
        720p, 1080p, audio]                     GET inv.nadeko/api/v1/videos/abc123
                  │                                         │
                  ▼                                   (same check)
       [Show to user:                                       │
        "720p HD, 1080p HD, MP3"]              ✅ Success OR ❌ All fail → Server
                  │
                  ▼
       USER CLICKS "Download 720p"
                  │
                  ▼
       [Browser opens direct CDN link]
       googlevideo.com/videoplayback?... 
                  │
                  ▼
       📥 VIDEO DOWNLOADS DIRECTLY TO DEVICE
       (Your server: did nothing. Used 0 bandwidth.)
                  │
                  ▼
       [Report result back silently]
       POST bongbari-extractor.workers.dev/report
       { mirror: "piped.kavin.rocks", success: true, ms: 234, country: "IN" }
```

---

## 🔐 Privacy — What Is and Isn't Stored

```
✅ What IS stored (in Cloudflare D1):
   - Anonymous browser hash (not your IP, not your name)
   - Which country you're roughly in (from timezone)
   - Which mirror worked, how fast
   - Did the extraction succeed or fail

❌ What is NOT stored:
   - Your IP address
   - Which video you downloaded
   - Your name, email, or any identity
   - What you searched for
```

The hash is generated from your screen size, browser language, and timezone — things
that millions of people share. It cannot be traced back to you.

---

## 📋 Summary Card (Stick This on Your Wall)

```
┌───────────────────────────────────────────────────────────────┐
│           CLIENT-SIDE IP CLOAKING — ONE PAGE SUMMARY         │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  WHAT IT IS:  Using your visitors' home IPs to fetch         │
│               video data instead of your server IP           │
│                                                               │
│  WHY IT WORKS: Home IPs are trusted. Datacenter IPs aren't.  │
│                                                               │
│  YOUTUBE:    ✅ 100% client-side. Server does NOTHING.       │
│  INSTAGRAM:  ⚠️  Metadata via server, file from CDN direct   │
│  FACEBOOK:   ⚠️  Same as Instagram                          │
│  TWITTER:    🔧 Can add (Nitter mirrors exist)               │
│  TIKTOK:     🔧 Can add (oEmbed API available)               │
│                                                               │
│  SERVER COST: Near zero for YouTube (no video traffic)       │
│  PROXY POOL:  Not needed for YouTube any more                │
│  BLOCKED IPs: Not your problem — visitor's IP is used        │
│                                                               │
│  DATABASE:    Cloudflare D1 — auto-connected, free           │
│  DEPLOYS IN:  4 wrangler commands                            │
│                                                               │
│  SCALES WITH: More visitors = more residential IPs = better  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```
