# Tools We Can Build — Client Residential IP Stack
> Every tool here uses the user's own browser IP. Zero proxy pool. Zero per-request cost. Permanently unblockable.

---

## How Each Tool Works

All tools follow the same pattern:
```
User visits page → Browser makes API call from user's residential IP → Result displayed
```
No VPS routing needed. No proxy pool. No keys exposed. Just the browser doing what browsers do.

---

## 1. GoFile Uploader ✅ Already Built
**What:** Upload any file up to 10GB. Link generated instantly.
**How:** Browser → `api.gofile.io/servers` → `store-eu-par-X.gofile.io/uploadFile`
**Bypass:** GoFile's public upload API is 100% CORS-open, designed for browsers.

---

## 2. Instagram Post Downloader
**What:** Paste any public Instagram post URL → get image/video download link.
**How:** Browser → `https://api.instagram.com/oembed?url=POST_URL`
→ Returns thumbnail, title, author. Video URLs extracted from embed HTML.
**Bypass:** Instagram oEmbed is a legally public API. No login needed. CORS open.
**Limit:** Only public posts. Private = needs different approach.

---

## 3. YouTube Metadata + Thumbnail Fetcher
**What:** Paste any YouTube URL → get title, thumbnail (all resolutions), duration, channel.
**How:** Browser → `https://www.youtube.com/oembed?url=VIDEO_URL&format=json`
→ Returns title, author, thumbnail. No API key needed.
**Bypass:** YouTube oEmbed is a W3C-standard endpoint. Open to all browsers forever.
**Bonus:** Combine with `https://i.ytimg.com/vi/VIDEO_ID/maxresdefault.jpg` for 4K thumbnail.

---

## 4. TikTok Video Info Fetcher
**What:** Paste TikTok URL → get video title, thumbnail, author.
**How:** Browser → `https://www.tiktok.com/oembed?url=TIKTOK_URL`
**Bypass:** TikTok oEmbed endpoint is CORS-open. Extracted from TikTok's own embed widget.

---

## 5. Twitter/X Post Fetcher
**What:** Paste any public tweet URL → get full text, images, video thumbnails.
**How:** Browser → `https://publish.twitter.com/oembed?url=TWEET_URL`
OR use the mirror: `https://api.fxtwitter.com/status/TWEET_ID`
**Bypass:** fxtwitter.com is a community-run open API. Full CORS, no auth.

---

## 6. Facebook Video Thumbnail
**What:** Paste any public Facebook video URL → get thumbnail and title.
**How:** Browser → `https://www.facebook.com/plugins/video/oembed.json?url=VIDEO_URL`
**Bypass:** Facebook oEmbed is CORS-open for public content. No account needed.

---

## 7. Link Metadata / OG Extractor
**What:** Paste any URL → get OpenGraph title, description, image, site name.
**How:** Browser → CORS proxy (e.g. `allorigins.win/raw?url=TARGET`) → parse `<meta og:>` tags
**Bypass:** The user's residential IP fetches from `allorigins.win` which is a free CORS proxy.
Rate limits are per-IP. Each user has their own residential IP = infinite capacity.

---

## 8. URL Unshortener / Redirect Tracer
**What:** Paste any shortened URL (bit.ly, t.co, etc.) → trace the full redirect chain.
**How:** Browser → `https://api.unshorten.me/?requestedURL=BIT_LY`
OR use the custom VPS approach: hit our own VPS `/api/unshorten?url=` which follows redirects server-side.
**Bypass:** No bot detection on redirect following. Runs from user's IP.

---

## 9. Image Downloader (Any CDN)
**What:** Paste any direct image URL → download button, even from restricted CDNs.
**How:** Browser fetches via `fetch(imageUrl, { mode: 'cors' })` → `createObjectURL(blob)` → download.
If CORS blocked: VPS proxy fetches and streams back.
**Bypass:** Most image CDNs (Imgur, Cloudinary, WhatsApp CDN) are CORS-open.

---

## 10. Imgur Mass Downloader
**What:** Paste an Imgur album URL → download all images as a ZIP.
**How:** Browser → `https://api.imgur.com/3/album/ALBUM_ID/images` (client_id in URL = not secret)
→ Build ZIP client-side using JSZip WASM
**Bypass:** Imgur's public API allows anonymous access with a public client_id.

---

## 11. File Format Converter (Client-Side WASM)
**What:** Convert images (HEIC→JPG, PNG→WebP, RAW→JPEG) entirely in the browser.
**How:** Browser loads `libheif.wasm` / `sharp-wasm` → converts in worker thread → download result.
**Bypass:** 100% client-side. No server, no IP, no rate limits. Infinite scale.

---

## 12. Video Metadata Reader (ffprobe.wasm)
**What:** Drag a video file → see codec, bitrate, resolution, duration, audio tracks.
**How:** Browser loads `ffprobe.wasm` → reads local file → shows metadata.
**Bypass:** Reads local file. Zero network request. Instant.

---

## 13. Catbox.moe Uploader (Permanent Hosting)
**What:** Upload files to catbox.moe (permanent, no expiry, 200MB limit).
**How:** Browser → `https://catbox.moe/user/api.php` (POST multipart from browser)
**Bypass:** catbox.moe CORS allows browser uploads. Residential IP = no limits.
**Why:** Backup for GoFile. GoFile files expire after inactivity. catbox.moe = permanent.

---

## 14. QR Code Generator
**What:** Generate QR codes for any text/URL. Download as PNG/SVG.
**How:** Client-side only using `qrcode` npm lib. Zero server.
**Bypass:** Nothing to bypass. Pure browser compute.

---

## 15. Pastebin / Text Share (Paste.ee client-side)
**What:** Share code/text snippets with a short link.
**How:** Browser → `https://api.paste.ee/v1/pastes` (free tier, client key in JS)
OR use our own GoFile trick: upload `.txt` file → cloaked link.
**Bypass:** paste.ee allows browser-side API calls. Or use the GoFile text trick we already have.

---

## Summary Table

| # | Tool | Client-Side? | Cost | Rate Limit Risk |
|---|---|---|---|---|
| 1 | GoFile Upload | ✅ Browser XHR | $0 | None (per-user IP) |
| 2 | Instagram Fetcher | ✅ oEmbed | $0 | None |
| 3 | YouTube Metadata | ✅ oEmbed | $0 | None |
| 4 | TikTok Info | ✅ oEmbed | $0 | None |
| 5 | Twitter/X Fetcher | ✅ fxtwitter | $0 | None |
| 6 | Facebook Video | ✅ oEmbed | $0 | None |
| 7 | OG Link Scraper | ✅ AllOrigins | $0 | Low |
| 8 | URL Unshortener | ✅ / VPS | $0 | None |
| 9 | Image Downloader | ✅ Fetch API | $0 | None |
| 10 | Imgur Album ZIP | ✅ Public API | $0 | Low |
| 11 | Format Converter | ✅ WASM | $0 | None |
| 12 | Video Metadata | ✅ Local WASM | $0 | None |
| 13 | Catbox Upload | ✅ Browser XHR | $0 | None |
| 14 | QR Generator | ✅ Pure client | $0 | None |
| 15 | Text/Paste Share | ✅ GoFile trick | $0 | None |

**Total infrastructure cost for all 15 tools: $0 per request.**
Every tool scales to infinite users automatically because each user brings their own IP.
