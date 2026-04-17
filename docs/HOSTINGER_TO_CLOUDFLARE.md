# 🚀 Hostinger → Cloudflare Migration (No-Coder Master Guide)

**One-time setup. Forever-easy after that. Built for Bong Bari agentic vibe.**

---

## 🎯 Why Migrate (TL;DR)

You bought `bongbari.com` from **Hostinger**. Their DNS works but:
- ❌ No free auto-HTTPS for `api.bongbari.com`
- ❌ No CDN (slow worldwide loading)
- ❌ Weak DNS API (agents can't auto-update records)
- ❌ Manual hPanel clicks for every change

**Cloudflare gives you all of that — FREE.** And after setup, **Copilot can change DNS with one command** instead of you clicking through hPanel.

---

## 📋 Your One-Time Tasks (~15 min total)

### Phase 1 — Add bongbari.com to Cloudflare (5 min)

1. Open **[dash.cloudflare.com](https://dash.cloudflare.com)** (you're already logged in)
2. Click **"Onboard a domain"** (the blue button on Domains page)
3. Type: `bongbari.com` → Continue
4. Choose **Free** plan → Continue
5. Cloudflare scans your existing DNS — **just click Continue** (it imports everything automatically)
6. Cloudflare shows **2 nameservers**, like:
   ```
   aaron.ns.cloudflare.com
   lily.ns.cloudflare.com
   ```
7. **Copy these 2 nameservers** — keep this tab open!

---

### Phase 2 — Change Nameservers in Hostinger (5 min)

1. Open **[hpanel.hostinger.com](https://hpanel.hostinger.com)** → log in
2. Top menu: **Domains** → click `bongbari.com`
3. Left menu: **DNS / Nameservers**
4. Click **"Change nameservers"** (or "Use custom nameservers")
5. Select **"Use custom nameservers"**
6. Paste the 2 Cloudflare nameservers from Phase 1:
   - Nameserver 1: `aaron.ns.cloudflare.com` (or whatever yours was)
   - Nameserver 2: `lily.ns.cloudflare.com`
7. **Save**

---

### Phase 3 — Wait for Cloudflare to Activate (5–30 min)

- Go back to Cloudflare tab
- It will eventually say **"Status: Active"** (you'll get an email too)
- Don't worry, your site stays online during the switch

---

### Phase 4 — Create Cloudflare API Token (3 min, ONE TIME)

This makes future DNS changes **fully agentic** — no more clicking.

1. In Cloudflare → top-right profile icon → **My Profile** → **API Tokens**
   (or directly: [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens))
2. Click **"Create Token"**
3. Find **"Edit zone DNS"** template → click **"Use template"**
4. Settings:
   - **Permissions:** Zone → DNS → Edit (already filled)
   - **Zone Resources:** Include → Specific zone → **`bongbari.com`**
5. Click **Continue to summary** → **Create Token**
6. **COPY the token** (you only see it once!)
7. Open the file **`server/.env`** in VS Code, add these 2 lines at the bottom:
   ```
   CLOUDFLARE_API_TOKEN=paste_your_token_here
   CLOUDFLARE_ZONE=bongbari.com
   ```
8. Save

---

### Phase 5 — Run ONE Command and You're Done Forever ✨

Open VS Code terminal:
```powershell
npm run dns:fix-api
```

That's it. This single command:
- ✅ Points `api.bongbari.com` → Oracle VM (`158.101.175.37`)
- ✅ Turns ON Cloudflare proxy (free auto-HTTPS, CDN, DDoS protection)
- ✅ Propagates worldwide in ~30 seconds

Verify:
```powershell
npm run dns:list
```

Then visit **www.bongbari.com** — payment will work. 🎉

---

## 🤖 Future Agentic Commands (For You + Future Copilot Agents)

After the one-time setup, **any future agent can do this without touching any web panel**:

| Command | What It Does |
|---|---|
| `npm run dns:list` | Show all DNS records |
| `npm run dns:update api 1.2.3.4` | Point any subdomain to any IP |
| `npm run dns:fix-api` | Reset `api.bongbari.com` → Oracle VM (shortcut) |
| `npm run dns:delete oldsubdomain` | Remove a record |

**Examples:**
- Move backend to a new VM? → `npm run dns:update api NEW_IP_HERE`
- Add a staging API? → `npm run dns:update staging 1.2.3.4`
- Set up a new subdomain? → `npm run dns:update blog 5.6.7.8`

**No clicks. No web panels. Pure agentic vibe coding.**

---

## ⚠️ Things You DO NOT Need to Touch After Migration

- ❌ Hostinger hPanel (only used for billing/renewal — DNS is now Cloudflare's job)
- ❌ Oracle VM nginx / SSL setup (Cloudflare handles HTTPS automatically)
- ❌ GitHub Pages CNAME file (separate concern, already working)

---

## 🆘 If Something Breaks

| Problem | Fix |
|---|---|
| `npm run dns:list` says "Zone not found" | Cloudflare not yet active — wait more, check Cloudflare email |
| `CLOUDFLARE_API_TOKEN missing` | Check `server/.env` — token must be on its own line, no quotes |
| `https://api.bongbari.com/api/version` still 404 | Run `npm run dns:fix-api` again, wait 30s, hard refresh |
| Frontend payment still broken | Run `node scripts/dev-pro.cjs status pramsss108` — if works = DNS OK, frontend cache is stale |

---

## 🎓 What Future Copilot Agents Should Know

(They will read this from `/memories/repo/dns-routing.md` automatically.)

- Domain `bongbari.com` is on Cloudflare DNS (after this migration)
- Cloudflare API token in `server/.env` as `CLOUDFLARE_API_TOKEN`
- Use `npm run dns:*` commands for ALL DNS changes — never tell user to click panels
- Backend is Oracle VM `158.101.175.37` (working, payments deployed)
- `api.bongbari.com` MUST resolve to `158.101.175.37` with proxy ON for HTTPS
- Frontend is GitHub Pages (`www.bongbari.com`) — separate, don't touch CNAME

---

## ✅ Success Checklist

After all 5 phases:
- [ ] Cloudflare shows "Status: Active" for bongbari.com
- [ ] `npm run dns:list` shows your records
- [ ] `npm run dns:fix-api` returns ✅
- [ ] `https://api.bongbari.com/api/version` returns 200
- [ ] Frontend `www.bongbari.com` payment button works
- [ ] You never have to log into Hostinger again (except for renewal once a year)

**Welcome to blazing-fast, free-HTTPS, agent-controlled DNS. 🔥**
