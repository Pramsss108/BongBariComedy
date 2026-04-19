# 🚀 Backend Reliability Plan: Oracle + Hetzner (April 2026)

## ❓ The Problem
- Oracle Cloud Free Tier VM **randomly goes offline** with no warning
- Our LIVE web app (`www.bongbari.com`) depends on it for ALL API calls
- When Oracle dies → payments, NGL, auth, everything breaks
- This is **unacceptable** for a production web app

## 🎯 The Solution: Dual-Backend with Hetzner as Primary

### Why Hetzner as Primary?
- **PAID server** = reliable uptime, no random shutdowns
- **Already running** at `78.47.104.43` with Node.js & our API
- **More RAM** than Oracle (Hetzner CX11 = 2GB vs Oracle = 503MB)
- **Already has Cobalt** + other services running fine

### Why Keep Oracle as Backup?
- **Free** = no cost for backup
- Good for testing, staging, or overflow
- Can be secondary API if it comes back

---

## 📋 MIGRATION STEPS (Baby Steps)

### Phase 1: Get Hetzner SSH Key Set Up (YOU DO THIS)

**Step 1:** Open PowerShell and run:
```powershell
ssh-keygen -t ed25519 -f C:\Users\guita\.ssh\hetzner_bongbari -C "bongbari-hetzner"
```
Press Enter twice (no passphrase needed).

**Step 2:** Copy the key to Hetzner (needs your Hetzner root password):
```powershell
type C:\Users\guita\.ssh\hetzner_bongbari.pub | ssh root@78.47.104.43 "mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"
```
Enter your Hetzner password when asked.

**Step 3:** Test key-based login (no password):
```powershell
ssh -i C:\Users\guita\.ssh\hetzner_bongbari root@78.47.104.43 "echo SUCCESS; hostname; free -m"
```

### Phase 2: Deploy Latest Backend to Hetzner (AGENT DOES THIS)

Once SSH key works, tell Copilot: "deploy backend to Hetzner"

The agent will:
1. Build server bundle (`node build-server.mjs`)
2. SCP bundle + server-package.json to Hetzner
3. Install minimal deps on Hetzner
4. Copy `.env` secrets (DB, Razorpay, etc.)
5. Start with PM2
6. Test `http://78.47.104.43:5000/api/version`

### Phase 3: Switch Cloudflare (AGENT DOES THIS)

Agent will update Cloudflare DNS:
- Change `api` A record from `158.101.175.37` → `78.47.104.43`
- The Origin Rule "API Port 5000" already exists — works for both servers
- Test `https://api.bongbari.com/api/version`

### Phase 4: Update GitHub Actions Deploy (AGENT DOES THIS)

Update `.github/workflows/deploy.yml`:
- Add Hetzner as PRIMARY deploy target
- Keep Oracle as SECONDARY (if alive)
- Use SSH key from GitHub Secrets

---

## 🏗️ Final Architecture (After Migration)

```
User visits www.bongbari.com
    ↓
GitHub Pages (frontend)
    ↓ API calls
https://api.bongbari.com
    ↓
Cloudflare (DNS + SSL + Origin Rule port 5000)
    ↓
Hetzner VPS 78.47.104.43:5000  ← PRIMARY (paid, reliable)
    ↓
Neon Postgres (database)

Oracle VM 158.101.175.37:5000  ← BACKUP (free, unreliable)
```

---

## ⚠️ Hetzner Resource Check (Before Migration)

Before deploying, the agent will verify:
- [ ] RAM: at least 512MB free after existing services
- [ ] Disk: at least 500MB free
- [ ] Node.js version (needs v18+ for our code)
- [ ] Port 5000 not conflicting with existing services
- [ ] PM2 installed or can be installed

### Hetzner Currently Runs:
- Cobalt Docker on port 9000
- Rust Proxy Verifier on port 9876
- BongBari old API on port 5000 (will be REPLACED with latest)

---

## 🔒 Important Notes

1. **Database is remote** (Neon Postgres) — no data migration needed
2. **Same `.env` secrets** work on both servers
3. **Frontend doesn't change** — GitHub Pages stays the same
4. **Only DNS changes** — one Cloudflare record edit
5. **Rollback is easy** — just change DNS back to Oracle IP if needed

---

## 📱 DUNS / Play Store Status (Separate Track)

- ✅ Applied for DUNS number
- ⏳ Waiting for approval (5-30 business days)
- Plan: Web app FIRST → Play Store app LATER
- DUNS bypasses the "20 testers for 14 days" requirement
- No action needed now — focus on web app reliability

---

## ⏰ Timeline

| Step | Who | When |
|------|-----|------|
| Set up Hetzner SSH key | You | 5 minutes |
| Deploy backend to Hetzner | Agent | 10 minutes |
| Switch Cloudflare DNS | Agent | 2 minutes |
| Update GitHub Actions | Agent | 5 minutes |
| Test everything | Agent | 5 minutes |
| **Total** | | **~30 minutes** |

---

## 🆘 EMERGENCY: If Site Is Down RIGHT NOW

While Oracle is down, the web app frontend still loads (GitHub Pages).
API calls will fail (show errors/loading). This is temporary.

**Quick fix options:**
1. Wait for Oracle reboot (OCI CLI sent SOFTRESET — takes 10-20 min)
2. OR do Phase 1 above (Hetzner SSH key) and tell agent to migrate

---

*Created: April 18, 2026*
*Priority: HIGH — production reliability*
