# Figma → Code: No-Coder Agentic Setup Guide

> **Goal**: You find UI kits on Figma → Agent automatically extracts colors, sizes, layouts → converts to pixel-perfect React code. Zero coding from you.

---

## TL;DR — Which Approach?

| Approach | Cost | Your Work | Agent Work | Best For |
|----------|------|-----------|------------|----------|
| **✅ Figma Token + API (RECOMMENDED)** | Free | 5 min setup, paste token | Everything else | Exact colors, sizes, spacing from any Figma file |
| Locofy.ai | Free tier (limited) | Install plugin, click export | Import & clean up | Full page exports (overkill for mockups) |
| Screenshot + Vision | Free | Take screenshots | Estimate from images | Quick & dirty, less accurate |
| Figma Plugin (inspect) | Free | Install plugin, copy values | Use the values | Manual but precise |

### **Winner: Figma Token + API**
- 100% free, unlimited
- You do ONE setup (5 minutes), then it's automatic forever
- Agent reads any Figma file directly — colors, fonts, spacing, component structure
- No plugins, no installs, no exports

---

## 🚀 STEP 1 — Create Figma Dev Token

### Where are you now?
✅ You're on `figma.com/files/team/...` — the **Recents** page. PERFECT — you're already logged in!

---

### Baby Steps (do exactly this):

**1.1** Look at the **top-left corner** of the page  
**1.2** You'll see your avatar/icon with the name **"Bong Bari"** (or your account name)  
**1.3** **Click on that avatar/name** — a dropdown menu appears  

---

### What you should see now:
A dropdown menu with options like:
- Settings
- Log out
- etc.

**1.4** Click **"Settings"**  

---

### What you should see now:
Your account settings page. There are **tabs at the top**: Account, Notifications, **Security**, etc.

**1.5** Click the **"Security"** tab  

---

### What you should see now:
A page with security settings. **Scroll down** until you find a section called:  
**"Personal access tokens"**

**1.6** Click **"Generate new token"** (blue button or link)  

---

### What you should see now:
A popup/modal asking you to configure the token.

**1.7** In the **name field**, type: `ngl-project`  
**1.8** For **Expiration**: choose **"No expiration"** (or the longest option available)  
**1.9** For **Scopes**: check these boxes:
- ✅ `file_content:read` (under Files) — this is the important one!
- ✅ You can also check `file_dev_resources:read` if available

> 💡 If you don't see scope options, just give it a name and generate — the default scopes are fine for reading files.

**1.10** Click **"Generate token"**  

---

### What you should see now:
A long text that starts with `figd_` — this is your token!  
It looks like: `figd_abc123xyz456...`

**1.11** **Triple-click** on the token to select it all  
**1.12** Press **Ctrl+C** to copy it  
**1.13** Open **Notepad** (press Windows key → type "notepad" → Enter)  
**1.14** Press **Ctrl+V** to paste it in Notepad  
**1.15** Save the Notepad file (Ctrl+S) somewhere safe  

> ⚠️ **CRITICAL**: Figma shows the token ONLY ONCE!  
> If you close the popup before copying, it's gone forever.  
> You'd have to delete it and create a new one.

---

### 🆘 Can't find Settings?
Try typing this directly in your browser address bar:
```
figma.com/settings
```
Then click the **Security** tab and scroll down to "Personal access tokens".

---

### ✅ Step 1 Done!
You now have a token that looks like: `figd_xxxxxxxxxxxxxxxxx`  
Keep Notepad open — you'll paste it to me later.

---

## 🚀 STEP 2 — Find a WhatsApp UI Kit

### Baby Steps:

**2.1** Open a **new tab** in your browser (Ctrl+T)  
**2.2** Type in the address bar:
```
figma.com/community
```
**2.3** Press **Enter**

---

### What you should see:
A page with **"Community"** at the top, with a search bar, and lots of design cards below.

**2.4** Click the **search bar** at the top  
**2.5** Type: `WhatsApp UI Kit dark`  
**2.6** Press **Enter**

---

### What you should see:
Search results showing WhatsApp-related design files.  
Look for one that shows **dark mode** WhatsApp screens (dark green/black backgrounds).

**2.7** Click on the one that looks best (has Status screen, chat screen, etc.)  
**2.8** On the file page, look for a blue button: **"Open in Figma"** or **"Duplicate"**  
**2.9** Click it — this copies the file to YOUR Figma account  

---

### What you should see:
The file opens in the Figma editor — lots of WhatsApp screens visible.

**2.10** Look at your **browser address bar** — it now shows something like:
```
https://www.figma.com/design/AbCdEfGhIjK/WhatsApp-UI-Kit
```

**2.11** Find the part between `/design/` and the next `/`:
```
AbCdEfGhIjK  ← THIS is the File Key
```

**2.12** **Select that part** and copy it (Ctrl+C)  
**2.13** Paste it in your Notepad below the token (Ctrl+V)  

> 💡 **Can't find a good WhatsApp kit?** Try these searches:
> - `WhatsApp Status 2025`
> - `WhatsApp Android dark mode`
> - `WhatsApp redesign`
> - `messenger UI kit` (sometimes includes WA)

---

### ✅ Step 2 Done!
Your Notepad should now have:
```
Token: figd_xxxxxxxxxxxxxxxxx
File Key: AbCdEfGhIjK
```

---

## 🚀 STEP 3 — Give to Agent (Paste in Chat)

### Baby Steps:

**3.1** Come back to **VS Code** (Alt+Tab or click VS Code in taskbar)  
**3.2** Click in the **Copilot chat** box at the bottom  
**3.3** Type this (replace with YOUR values from Notepad):

```
Figma Token: figd_paste_your_token_here
File Key: paste_your_file_key_here
```

**3.4** Press **Enter** to send  

---

### What happens next:
- I read the file automatically
- I extract all colors, sizes, fonts
- I update our tutorial mockups to match the real WhatsApp
- You just refresh `localhost:5173` and check

**You're done. Sit back. ✅**

---

### ⚠️ Troubleshooting

| Problem | Fix |
|---------|-----|
| "Can't find Personal access tokens" | Go to `figma.com/settings` → scroll to bottom |
| "Generate token button is grayed out" | Make sure you typed a name like `ngl-project` first |
| "Token disappeared" | You refreshed the page. Create a new token (same steps) |
| "Can't find /design/ in URL" | The URL might say `/file/` instead — that's the same thing. Copy the part after `/file/` |
| "Open in Figma button not showing" | Click "Duplicate to your drafts" instead — same thing |
| "Community search shows nothing" | Try simpler search: just `WhatsApp` or `messenger` |

---

## What Happens Next (Fully Automatic)

Once you give me the token + file key, I will:

1. **Fetch the file structure** — list all pages and frames
2. **Find the screens we need** — Status tab, text editor, send screen, etc.
3. **Extract exact values**:
   - Background colors (hex + opacity)
   - Font sizes, weights, families
   - Border radius, padding, margins
   - Icon sizes and positions
   - Component hierarchy (what's inside what)
4. **Convert to React/Tailwind** — update our ShareModal.tsx mockups
5. **Show you the result** — refresh localhost:5173 and check

**You do nothing after Step 3. Just watch and approve.**

---

## 📱 Also Useful: Instagram & Facebook UI Kits

Search these on Figma Community too:
- **"Instagram Story UI Kit 2025"** — for IG tutorial accuracy
- **"Facebook Story UI Kit"** — for FB tutorial accuracy
- **"iOS UI Kit"** — for accurate phone frame, status bar, keyboard

Same process: Open → Copy URL → Give me the file key.

---

## ❌ Why NOT These Alternatives

### Locofy.ai
- ❌ Requires Figma plugin install (can break)
- ❌ Free tier: only 5 exports/month
- ❌ Generates generic React — we'd need to rewrite for our Tailwind setup
- ❌ Overkill — we don't need full page export, just measurements
- ✅ Good for: building entire pages from scratch (not our case)

### Anima / Zeplin
- ❌ Paid after trial
- ❌ Requires team plan for API access
- ❌ Same overkill problem as Locofy

### Manual Screenshots
- ❌ Colors are approximate (depends on monitor calibration)
- ❌ Sizes are guessed from pixel counting
- ❌ No font/spacing information
- ✅ Good for: quick reference when no Figma file exists

### Builder.io (Figma to Code)
- ❌ Free tier very limited
- ❌ Generates its own component format
- ❌ Paid for React output

---

## 🔄 Ongoing Workflow (After Setup)

Every time you want to match a real app's UI:

```
You: "Make WA Status screen match this Figma file"
     [paste file key]
     
Agent: reads Figma → extracts → updates code → done
```

Or for new UI kits:
```
You: "Found a better IG kit"
     [paste new file URL]
     
Agent: reads new file → updates mockups → done
```

**Your Figma token stays the same forever** (unless you revoke it).

---

## 🔒 Security Note

- Your Figma token only has **read access** to your files
- It cannot edit, delete, or share your Figma files
- Agent uses it solely for `GET` requests to Figma API
- Token is stored in your local `.env` only — never committed to git
- You can revoke it anytime at figma.com/developers

---

## Quick Reference

| What | Where |
|------|-------|
| Create token | https://www.figma.com/developers/api |
| Find UI kits | https://www.figma.com/community |
| Token format | `figd_xxxxxxxxxxxxxxxxx` |
| File key | URL after `/design/` → `https://www.figma.com/design/[FILE_KEY]/...` |
| Give to agent | Paste both in chat, done |

---

*Created for BongBari NGL project — vibe coder friendly, zero coding required.*
