# 🌐 Domain & DNS Master Playbook (No-Coder Friendly)

**Last verified:** April 18, 2026

---

## 📍 Current State (April 18, 2026)

| Thing | Where it lives | IP |
|-------|---------------|-----|
| Frontend (`www.bongbari.com`) | GitHub Pages | (CDN) |
| Backend API code | Oracle Cloud VM | `158.101.175.37` |
| `api.bongbari.com` (DNS) | **Hetzner (OLD/WRONG)** ❌ | `78.47.104.43` |
| Domain DNS controlled by | `dns-parking.com` (registrar default) | — |

**Problem:** The frontend calls `https://api.bongbari.com` → goes to Hetzner (old server, doesn't have payment routes) → 404 errors.

**Fix:** Point `api.bongbari.com` → Oracle VM (`158.101.175.37`).

---

## 🏆 RECOMMENDED FIX (Permanent, Blazing Fast, Free)

### Migrate `bongbari.com` to Cloudflare DNS

**Why:**
- ✅ Free auto HTTPS (SSL certificate — no expiry, no setup)
- ✅ Global CDN (site is fast worldwide)
- ✅ DDoS + bot protection (free)
- ✅ Click-to-edit DNS (any future agent can fix routing in 1 minute)
- ✅ Hides Oracle VM real IP (security layer)

### One-Time Setup (~10 minutes, no coding)

1. **Cloudflare Dashboard** ([dash.cloudflare.com](https://dash.cloudflare.com)) → **"Onboard a domain"** → type `bongbari.com` → **Free plan**
2. Cloudflare gives you **2 nameservers** (like `xxx.ns.cloudflare.com`)
3. Find your registrar (search Gmail for "bongbari.com domain") → log in
4. **Replace the nameservers** at the registrar with Cloudflare's 2 nameservers
5. Wait 5–30 min for propagation
6. Back in Cloudflare → **DNS** → **Records** → edit/create:
   - **Type:** A
   - **Name:** `api`
   - **Content:** `158.101.175.37`
   - **Proxy status:** 🟠 **Proxied** (orange cloud ON — this gives free HTTPS!)
   - **TTL:** Auto
7. Save → done. `https://api.bongbari.com` now works permanently with free SSL.

---

## 🚨 Common Registrars That Use `dns-parking.com` Nameservers

Search Gmail for emails from these:
- **GoDaddy** (godaddy.com)
- **BigRock** (bigrock.in)
- **Hostinger** (hostinger.com)
- **Namecheap** (namecheap.com)
- **ResellerClub**

The email subject usually says "Your domain bongbari.com is registered" or "Domain renewal".

---

## 🛠️ Test Bypass (For Local Dev / Pre-Cloudflare)

If Cloudflare migration not done yet, payment can be tested directly on VM IP:

```powershell
$env:DEV_API_BASE="http://158.101.175.37:5000"
node scripts/dev-pro.cjs grant <username> 30   # Grant 30 days PRO free
node scripts/dev-pro.cjs status <username>
node scripts/dev-pro.cjs revoke <username>
```

Frontend payments **do NOT work** until DNS is fixed because browsers block HTTP API calls from HTTPS pages (mixed content).

---

## 🤖 Instructions for Future Copilot Agents

**Before doing anything with `api.bongbari.com`:**

1. Run `Resolve-DnsName api.bongbari.com -Type A` to confirm where it points
2. If IP is **NOT** `158.101.175.37`, the DNS is wrong → tell user to follow this doc
3. If user has migrated to Cloudflare → log into [dash.cloudflare.com](https://dash.cloudflare.com), edit `api` A record
4. **NEVER edit `CNAME` file** in repo (that's for `www.bongbari.com` GitHub Pages, separate concern)
5. **NEVER blame Oracle VM** until you confirm `curl http://158.101.175.37:5000/api/version` returns 200
6. Backend works perfectly on direct IP — any 404 via `api.bongbari.com` = DNS/proxy issue, NOT code issue

---

## 📊 Architecture (Target State After Cloudflare Migration)

```
User Browser
    ↓ HTTPS
www.bongbari.com (GitHub Pages — frontend)
    ↓ HTTPS API call
api.bongbari.com (Cloudflare proxy — free SSL)
    ↓ HTTP (internal Cloudflare → Oracle)
158.101.175.37:5000 (Oracle VM — Express + Razorpay + Neon DB)
    ↓
Neon Postgres (cloud DB)
```

---

## ⚠️ DO NOT

- ❌ Buy paid Cloudflare plan (free tier is enough)
- ❌ Set up SSL on Oracle VM directly (Cloudflare handles it)
- ❌ Use the `bongbari-downloader` Cloudflare Worker for routing (separate purpose)
- ❌ Touch GitHub Pages CNAME file (that's for the frontend, different domain)
- ❌ Run `dnf install` on Oracle VM (instant OOM crash — see VM_RULES.md)

---

## ✅ Verification After Cloudflare Migration

```powershell
# Should return 200 with VM uptime
(Invoke-WebRequest -Uri 'https://api.bongbari.com/api/version' -UseBasicParsing).Content

# Should grant PRO successfully (no 404)
node scripts/dev-pro.cjs status pramsss108
```

If both work → DNS migration complete. Frontend payments will work for real users.
