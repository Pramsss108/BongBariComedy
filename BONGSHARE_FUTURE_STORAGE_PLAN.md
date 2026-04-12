# BongShare — Future Storage Infrastructure Plan (Red Team Edition)

> **Current state (March 2026):** filebin.net — works, free, 6-day expiry, CORS-native.  
> **Download:** Streaming ZIP via `client-zip` — 10GB+ with zero RAM usage.  
> **Goal:** Completely free, unlimited scale, zero third-party dependency, full control.

---

## ✅ IMPLEMENTED — Streaming ZIP Download (March 2026)

**How it works (Red Team engineering — zero resource usage):**
```
User clicks "Download as ZIP"
→ Async generator yields { name, input: Response } for each file
→ client-zip creates ZIP stream (STORE mode, no compression = instant)
→ Chrome/Edge: showSaveFilePicker → WritableStream → disk (0 RAM)
→ Firefox/Safari: blob fallback (works ~2GB)

Multi-chunk files: createConcatStream() chains fetch() calls,
only 1 chunk (~80MB) in memory at a time
```

**Key specs:**
| Property | Value |
|----------|-------|
| Library | `client-zip` (3KB, zero deps) |
| Max size (Chrome/Edge) | Unlimited (streams to disk) |
| Max size (Firefox/Safari) | ~2GB (blob buffer) |
| Compression | STORE (none — videos/images don't compress) |
| RAM usage | ~80MB max (one chunk at a time) |
| CPU usage | Near zero (no compression) |
| File order | Sequential, exactly as uploaded |
| Progress | Per-file tracking during ZIP creation |

---

## 🏆 TOP 2 PICKS — Best Free & Unlimited Self-Hosted Storage

### PICK 1: Cloudflare R2 + Workers (RECOMMENDED — $0/month at our scale)

| Property          | Detail |
|-------------------|--------|
| **Storage**       | Cloudflare R2 (S3-compatible object storage) |
| **API Layer**     | Cloudflare Workers (serverless edge functions) |
| **Cost**          | $0 for <10 GB stored + <10M requests/month (free tier forever) |
| **Egress**        | $0 always — R2 has ZERO egress fees (unlike AWS S3) |
| **CORS**          | Fully controlled — our Worker sets all headers |
| **Custom Domain** | `share.bongbari.com` via Cloudflare DNS (free) |
| **Expiry**        | We control it — Worker can auto-delete after N days |
| **Max file size** | 5 GB per file (R2 multipart), infinite via chunking |
| **Availability**  | Global CDN, 300+ edge locations, 99.99% uptime |
| **Red Team Edge** | Zero third-party branding, zero CORS surprises, un-blockable on own domain |

**How it works:**
```
Browser → POST share.bongbari.com/upload/{binId}/{fileName}
         → Cloudflare Worker → R2 bucket (stores raw bytes)

Browser → GET share.bongbari.com/dl/{binId}/{fileName}
         → Cloudflare Worker → R2 → streamed to user
```

**Worker is ~50 lines of code:**
- `PUT /upload/:bin/:file` — stores blob in R2 at key `{bin}/{file}`
- `GET /dl/:bin/:file` — streams from R2, sets `Content-Disposition: attachment`
- `DELETE /cleanup` — cron trigger deletes bins older than 7 days
- CORS headers on every response — we control everything

**Why this is #1:**
- Truly $0 at BongBari's current scale (and cheap at massive scale)
- Zero egress = download 100 TB and pay $0
- Own domain = no third-party CORS drama ever again
- Edge-served globally = fast everywhere
- R2 is S3-compatible = can use any S3 tool as backup

---

### PICK 2: Backblaze B2 + Cloudflare Bandwidth Alliance (FREE egress trick)

| Property          | Detail |
|-------------------|--------|
| **Storage**       | Backblaze B2 (10 GB free forever) |
| **Egress**        | $0 through Cloudflare (Bandwidth Alliance eliminates B2→CF charges) |
| **API Layer**     | Cloudflare Worker proxies B2's S3-compatible API |
| **Cost**          | $0 for <10 GB stored; $0.005/GB/month beyond |
| **Custom Domain** | `share.bongbari.com` via Cloudflare (Worker → B2 origin) |
| **CORS**          | Controlled by Cloudflare Worker (not B2 native) |
| **Red Team Edge** | Both companies are pro-privacy, no data harvesting |

**How it works:**
```
Browser → share.bongbari.com (Cloudflare Worker)
         → Worker fetches from B2 S3 endpoint
         → Cloudflare caches + streams to user
         → Bandwidth Alliance: B2→CF egress = $0
```

**Why this is #2:**
- Slightly more complex than R2 (two services instead of one)
- Still $0 at our scale, but B2 free tier is 10 GB vs R2's 10 GB
- Bandwidth Alliance is a real partnership — not a hack, won't break

---

## 🚫 Approaches We REJECTED

| Approach | Why Rejected |
|----------|-------------|
| **Self-host on Hetzner VPS** | Costs €9.50/month minimum. Disk space limited. Single region. |
| **AWS S3** | Egress costs are insane ($0.09/GB). $9 per 100 GB downloaded. |
| **Google Cloud Storage** | Same egress trap as AWS. |
| **Firebase Storage** | Free tier is 5 GB total with 1 GB/day download limit — useless. |
| **Supabase Storage** | 1 GB free, then paid. Can't scale. |
| **IPFS/Filecoin** | Slow, unreliable for filesharing. No delete = privacy risk. |
| **Keep using filebin.net** | Works now but: (1) they can shutdown, (2) CORS surprises, (3) HTML instead of raw JSON for downloads, (4) 6-day fixed expiry we can't control |

---

## 🔴 Red Team Implementation Plan (When Ready)

### Phase 1: Cloudflare R2 + Worker Setup (30 min)
1. Create R2 bucket: `bongbari-share` (Cloudflare dashboard)
2. Deploy Worker: `share.bongbari.com` with routes:
   - `PUT /u/:bin/:file` — upload chunk/file to R2
   - `GET /d/:bin/:file` — download with `Content-Disposition: attachment`
   - `GET /m/:bin` — return manifest JSON
   - `DELETE /x/:bin` — manual bin deletion (admin only)
3. Add Cron Trigger: daily cleanup bins >7 days old
4. Configure custom domain: `share.bongbari.com` → Worker

### Phase 2: Update gofile-engine.ts (15 min)
1. Add new host type: `'r2'` to `ShareHost`
2. `uploadFilebinChunk` → `uploadR2Chunk`: same XHR pattern, new URL
3. `uploadMultipleToFilebin` → `uploadMultipleToR2`: same logic, new endpoint
4. `buildBongBariBundleUrl` → host = `'r2'`
5. Download URLs: `share.bongbari.com/d/{bin}/{file}` — fully CORS, always works

### Phase 3: Migration (5 min)
1. Existing filebin links keep working (old tokens decode to filebin host)
2. New uploads go to R2
3. Zero downtime, zero breaking changes

---

## 📊 Cost Projection

| Monthly Usage | Cloudflare R2 Cost | Backblaze B2 + CF Cost |
|---------------|-------------------|----------------------|
| 1 GB stored, 50 GB downloaded | **$0** | **$0** |
| 10 GB stored, 500 GB downloaded | **$0** | **$0** |
| 50 GB stored, 2 TB downloaded | **~$0.60** | **~$0.20** |
| 100 GB stored, 10 TB downloaded | **~$1.35** | **~$0.45** |

Both are essentially free at any reasonable BongBari scale. R2 wins on simplicity (one vendor, native integration).

---

*Last updated: March 29, 2026*
*Status: filebin.net is working — migrate to R2 when ready for permanent own-infra*
Safe revert point created. If ANYTHING breaks, revert with:
git reset --hard abaf6d6a