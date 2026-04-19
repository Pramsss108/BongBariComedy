# 🧠 BongBari Project — Master Status & Memory (April 2026)

## 📍 WHERE WE ARE RIGHT NOW

### Cloudflare Origin Rule ✅ DEPLOYED
- **Rule**: "API Port 5000" → Hostname equals `api.bongbari.com` → Rewrite port to 5000
- **Status**: Active in Cloudflare
- **Why**: Cloudflare connects to port 80 by default, but our Oracle server runs on port 5000

### Oracle VM ⚠️ TEMPORARILY DOWN
- **IP**: `158.101.175.37`
- **Issue**: VM is unreachable (ping/SSH/HTTP all timeout as of April 18, 2026)
- **Likely cause**: Oracle Free Tier auto-reboot or network blip
- **Action needed**: Wait. It usually comes back within 5-30 minutes
- **When it comes back**: The Origin Rule will automatically route traffic correctly

---

## 🏗️ WHAT WE BUILT (Full Recap)

### The Problem We Started With
- You wanted **Razorpay payments** to work on your NGL (anonymous messaging) feature
- Payments needed the backend (Oracle VM) to be reachable via `https://api.bongbari.com`
- But `api.bongbari.com` DNS was on Hostinger, pointing to the OLD Hetzner server
- The OLD server didn't have payment routes

### What We Did (In Order)
1. **Migrated DNS from Hostinger → Cloudflare** (free, better, future-proof)
2. **Set `api` record to Oracle VM IP** (`158.101.175.37`)
3. **Created Origin Rule** to route port 80 → port 5000 (because Oracle has no nginx)
4. **Built agentic CLI tooling** (`scripts/cf-dns.cjs`) so future agents can fix DNS with one command
5. **Created documentation** for every step

### Architecture (How Everything Connects)
```
User visits www.bongbari.com
    ↓
GitHub Pages (frontend, React/Vite)
    ↓ API calls go to...
https://api.bongbari.com
    ↓
Cloudflare (DNS + proxy + SSL + Origin Rule port 5000)
    ↓
Oracle Cloud VM 158.101.175.37:5000 (Express backend)
    ↓
Neon Postgres (database)
```

---

## 🖥️ YOUR SERVERS

| Server | IP | Purpose | Status |
|--------|----|---------|--------|
| **Oracle VM** | `158.101.175.37` | Main backend (API, payments, NGL) | ⚠️ Down (temporary) |
| **Hetzner VPS** | `78.47.104.43` | Old backend + Cobalt extractor | ✅ Running |
| **GitHub Pages** | `www.bongbari.com` | Frontend website | ✅ Running |
| **Cloudflare** | Proxy | DNS + SSL + caching | ✅ Active |

### Oracle VM Details
- **SSH**: `ssh -i C:\Users\guita\.ssh\oracle_bongbari2 opc@158.101.175.37`
- **RAM**: 503MB (VERY limited — see VM_RULES.md)
- **Node**: v22.19.0
- **Process manager**: PM2 (process name: `bongbari`)
- **App location**: `~/bongbari/`
- **Env file**: `~/bongbari/.env` (has Razorpay keys, DB URL, etc.)

### Hetzner VPS Details
- **SSH**: Different key (check your SSH config)
- **Purpose**: Cobalt video extractor + old backup API
- **Subdomain**: `compute.bongbari.com` → `78.47.104.43`

---

## 💰 RAZORPAY PAYMENT STATUS

### What's Built
- **Live Razorpay keys** configured on Oracle VM
- **Dev-grant endpoint**: `POST /api/ngl/payment/dev-grant` (for testing PRO access)
- **Secret**: `NGL_DEV_GRANT_SECRET=a0ee71782872cdf3c0e3f55d874c53c6`
- **Frontend payment button**: Built into NGL page

### What's Pending
- ⏳ Oracle VM needs to come back online
- ⏳ Then test: `https://api.bongbari.com/api/ngl/payment/dev-grant` should return 200
- ⏳ Then test full Razorpay checkout flow on `www.bongbari.com`

---

## 📱 PLAY STORE / DUNS STATUS

### Current Status
- ✅ Applied for **DUNS number** (needed for Google Play Developer account)
- ⏳ **Waiting** for DUNS approval (can take 5-30 business days)
- ❌ **NOT building mobile app yet** — web app first

### Plan (After DUNS Approved)
1. Get DUNS number
2. Register Google Play Developer account ($25 one-time fee)
3. DUNS bypasses the "20 testers for 14 days" requirement
4. Convert web app → Android app (PWA or React Native)
5. Publish to Play Store

### What To Do NOW (While Waiting for DUNS)
- Focus on **web app** at `www.bongbari.com`
- Get all features working perfectly on web
- Fix payments, NGL, all API routes
- Web app works on ALL phones already (no app needed)

---

## 🌐 DNS & DOMAIN SETUP

### Cloudflare DNS Records
| Type | Name | Points To | Proxy | Purpose |
|------|------|-----------|-------|---------|
| A | `api` | `158.101.175.37` | 🟠 Proxied | Backend API (Oracle) |
| A | `compute` | `78.47.104.43` | 🟠 Proxied | Hetzner (Cobalt) |
| A | `bongbari.com` | `185.199.1xx.153` (x4) | 🟠 Proxied | GitHub Pages |
| CNAME | `www` | `pramsss108.github.io` | 🟠 Proxied | GitHub Pages |

### Cloudflare Rules
| Rule | Match | Action |
|------|-------|--------|
| API Port 5000 | Hostname = `api.bongbari.com` | Rewrite port → 5000 |

### Nameservers (at Hostinger registrar)
- `hadlee.ns.cloudflare.com`
- `newt.ns.cloudflare.com`

---

## 📋 AGENTIC TOOLING (For Future Copilot Sessions)

### DNS Management (one-command fixes)
```powershell
# List all DNS records
npm run dns:list

# Fix api to point to Oracle
npm run dns:fix-api

# Update any subdomain
npm run dns:update -- api 158.101.175.37

# Delete a record
npm run dns:delete -- old-subdomain
```
**Requires**: `CLOUDFLARE_API_TOKEN` in `server/.env` (not yet created — see Phase 4 below)

### Phase 4 Still Pending: Create Cloudflare API Token
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use template: "Edit zone DNS"
4. Scope to: `bongbari.com` only
5. Copy token → add to `server/.env`:
   ```
   CLOUDFLARE_API_TOKEN=your_token_here
   CLOUDFLARE_ZONE=bongbari.com
   ```
6. Then `npm run dns:list` will work!

---

## 🔧 WHEN ORACLE VM COMES BACK — DO THIS

### Step 1: Verify VM is alive
```powershell
ssh -i C:\Users\guita\.ssh\oracle_bongbari2 opc@158.101.175.37 "pm2 list"
```

### Step 2: If PM2 shows app stopped, restart it
```powershell
ssh -i C:\Users\guita\.ssh\oracle_bongbari2 opc@158.101.175.37 "cd ~/bongbari && pm2 restart bongbari"
```

### Step 3: Test API through Cloudflare
```powershell
curl https://api.bongbari.com/api/version
```
Should show: `nodeVersion: v22.19.0`

### Step 4: Test payment endpoint
```powershell
curl -X POST https://api.bongbari.com/api/ngl/payment/dev-grant \
  -H "Content-Type: application/json" \
  -H "X-Dev-Grant: a0ee71782872cdf3c0e3f55d874c53c6" \
  -d '{"username":"pramsss108","plan":"monthly","days":30}'
```
Should show: `{"success":true,...}`

---

## 📂 KEY FILES IN THE REPO

| File | Purpose |
|------|---------|
| `scripts/cf-dns.cjs` | Agentic Cloudflare DNS CLI |
| `docs/FIX_CLOUDFLARE_PORT.md` | Baby-step guide for Origin Rule |
| `docs/HOSTINGER_TO_CLOUDFLARE.md` | Full DNS migration guide |
| `docs/HOW_TO_FIX_DNS.md` | Bengali quick guide |
| `docs/DOMAIN_DNS_PLAYBOOK.md` | Master architecture reference |
| `build-server.mjs` | VM-safe esbuild bundle config |
| `server/.env` | Backend secrets (local copy) |
| `copilot-instructions.md` | Rules for ALL Copilot agents |

---

## 🚨 IMPORTANT RULES (DON'T FORGET)

1. **NEVER change the CNAME file** — `www.bongbari.com` is the canonical domain
2. **NEVER run `npm ci` on Oracle VM** — it will OOM crash (503MB RAM)
3. **Use `server-package.json`** for VM deploys, NOT full `package.json`
4. **Oracle VM Node.js capped at 256MB** via `NODE_OPTIONS`
5. **Render is BANNED** — don't use it
6. **Always use `npm run deploy:safe`** to push to production
7. **Test locally first** before pushing

---

*Last updated: April 18, 2026*
*Status: Waiting for Oracle VM to come back online + DUNS number approval*
