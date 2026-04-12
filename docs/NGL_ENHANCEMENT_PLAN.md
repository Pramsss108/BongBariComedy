# Bong NGL — Enhancement Plan
> Last updated: April 2026 | Keep it SIMPLE. NGL wins because it's dead simple. No bloat.

---

## 🧪 How to Test (Sender + Receiver Flow)

### Quick Test — localhost
1. **Start servers**: `npm run dev:live` (opens `http://localhost:5173`)
2. **Create account** (you = receiver):
   - Go to `http://localhost:5173/ngl`
   - Pick username (e.g. `testbhai`) → set PIN → done
   - You land on dashboard at `/ngl/at/testbhai`
3. **Copy your send link**: Dashboard PLAY tab → copy link button → gives you `http://localhost:5173/ngl/q/testbhai`
4. **Open send link as a sender** (simulate a friend):
   - Open an **Incognito / Private window** (this is key — different session = different person)
   - Paste `http://localhost:5173/ngl/q/testbhai`
   - You see the send page with your prompt
   - Type a message → hit Send → you see the sent receipt with your message
5. **Check inbox as receiver**:
   - Go back to your normal browser window (dashboard)
   - Switch to INBOX tab → your message appears with emoji badge
   - Tap the message → see sender hints (timezone, device, language)

### Quick Test — live site
Same steps but use `https://www.bongbari.com` instead of localhost.
- Create: `www.bongbari.com/ngl`
- Send link: `www.bongbari.com/ngl/q/YOUR_USERNAME`
- Use phone for sender, laptop for receiver (or Incognito on same device)

### Pro Tip: Test with Terminal (API only)
```powershell
# Send a message via API (no browser needed)
Invoke-RestMethod -Uri "http://localhost:5000/api/ngl/u/testbhai/send" -Method POST -ContentType "application/json" -Body '{"text":"test message from terminal!"}'

# Check it arrived
Invoke-RestMethod -Uri "http://localhost:5000/api/ngl/u/testbhai" -Method GET
```

---

## What's Done (23 features)

| Feature | Status |
|---------|--------|
| Account create + PIN login | ✅ |
| Anonymous messaging (send/receive/delete) | ✅ |
| 7 premium themes | ✅ |
| Profile photo upload | ✅ |
| Story card generator (8 palettes + QR) | ✅ |
| Emoji reactions (5 emojis) | ✅ |
| Daily streak counter | ✅ |
| AI prompt generator (Groq) | ✅ |
| 20 bilingual prompts pool | ✅ |
| Bengali ↔ English toggle | ✅ |
| 8-slide onboarding tutorial | ✅ |
| Sender hints stored in DB | ✅ |
| Dynamic OG cards for sharing | ✅ |
| Account deletion ("banish") | ✅ |
| Rate limiting | ✅ |
| Sent message receipt | ✅ |
| Mobile-responsive | ✅ |
| WhatsApp OTP backend | ⚠️ No UI yet |

---

## 🔥 Next Up — Only What Matters

### 1. "Who Sent This?" — Reveal Sender Hints
**What**: Tap a message → see hints: "🌍 India (IST) · 📱 iPhone · 🗣️ Bengali"
**Why**: This is THE reason NGL went viral. Data already in DB — just show it.
**Effort**: Small.
**Tell Copilot**: "Show sender hints (language, timezone, device) on each inbox message with a reveal button"

### 2. WhatsApp OTP — Add the UI
**What**: Phone verification modal so users can recover accounts.
**Why**: Backend is built. Users lose secret keys. This saves them.
**Effort**: Medium.
**Tell Copilot**: "Add WhatsApp OTP verification modal in NglDashboard settings section"

### 3. New Message Badge
**What**: When a new message arrives, show a red dot / count badge on INBOX tab.
**Why**: Users shouldn't need to manually tap INBOX to check.
**Effort**: Small.
**Tell Copilot**: "Add a new-message notification badge on the INBOX tab that updates automatically"

### 4. Share to Instagram Story
**What**: One-tap button to share story card directly to IG.
**Why**: Instagram Stories = how NGL goes viral.
**Effort**: Small.
**Tell Copilot**: "Add a 'Share to Instagram Story' button on the story card preview modal"

### 5. Block / Report Abusive Sender
**What**: If a message is abusive, block that sender's fingerprint.
**Why**: Safety is non-negotiable. Without this, trolls ruin the experience.
**Effort**: Medium.
**Tell Copilot**: "Add block sender feature — block by IP fingerprint when user reports a message"

### 6. Profanity Filter
**What**: Auto-block offensive messages in Bengali + English before delivery.
**Why**: Keep the platform clean without manual moderation.
**Effort**: Medium.
**Tell Copilot**: "Add a profanity filter to NGL message sending — block offensive content in Bengali and English"

### 7. Pin Messages
**What**: Pin 1-3 favorite messages to top of inbox.
**Why**: Simple, premium feel. Highlights the best messages.
**Effort**: Small.
**Tell Copilot**: "Add message pinning to NGL inbox — pin up to 3 messages to the top"

---

## 🏗️ Under the Hood (Dev Only)

| Item | Why | Effort |
|------|-----|--------|
| Rate-limiters to Redis/Upstash | Server restart resets limits — exploitable | Small |
| Message pagination | Loading ALL messages will break at 1000+ | Medium |
| E2E tests (create → send → inbox) | Zero test coverage for NGL | Medium |

---

## ❌ Intentionally NOT Building (Kills Simplicity)

| Feature | Why NOT |
|---------|---------|
| Leaderboard / rankings | Exposes users, creates pressure, NGL doesn't have it |
| Referral tracking | Over-engineered, NGL grows by sharing links naturally |
| Message search/filter | Over-engineering for now — keep inbox simple |
| Custom emoji picker (20+) | 5 reactions is enough — more = clutter |
| Message reply threads | Ruins anonymity feel, makes it a chat app |
| Bio + social links on profile | NGL is about mystery, not a profile page |
| Scheduled messages | Nobody needs this in an anonymous Q&A |
| Analytics dashboard per user | Over-engineering, adds complexity |
| Message export | Niche feature, almost nobody will use |
| Admin panel | Build only when we have 1000+ users |

**Rule**: If NGL (the real app) doesn't have it, we probably don't need it either. The magic is simplicity.

---

## How to Use This Plan

1. Pick an item from "Next Up"
2. Copy the **"Tell Copilot"** line → paste as your prompt
3. Copilot builds → you test (see testing section above)
4. `npm run deploy:safe` to ship

---

## 20 Bilingual Prompts (Reference)

| # | Bengali | English |
|---|---------|---------|
| 1 | আমার সম্পর্কে anonymous কিছু বলো 👀 | send me anonymous messages! 👀 |
| 2 | আমাকে ৩ শব্দে বর্ণনা করো ✨ | describe me in 3 words ✨ |
| 3 | আমার সম্পর্কে তোর honest opinion কি? 🤔 | what's your honest opinion about me? 🤔 |
| 4 | আমার সাথে তোর সবচেয়ে ভালো memory কি? 💭 | what is your best memory with me? 💭 |
| 5 | আমাকে প্রথম দেখেই কি মনে হয়েছিল? 👋 | what did you think when you first met me? 👋 |
| 6 | তুই কখনো আমার কাছে কি লুকিয়ে রেখেছিস? 🤫 | are you hiding something from me? 🤫 |
| 7 | আমাকে একটা dare দে! 🔥 | give me a dare! 🔥 |
| 8 | আমার সবচেয়ে annoying habit কি? 😅 | what is my most annoying habit? 😅 |
| 9 | তুই আমার জায়গায় থাকলে কি করতিস? 🤷 | what would you do if you were me? 🤷 |
| 10 | আমাকে নিয়ে একটা confession করো 💬 | confess something about me 💬 |
| 11 | তুই কি আমাকে trust করিস? 🔒 | do you trust me? 🔒 |
| 12 | Never have I ever... আমাকে catch করো 🙈 | never have I ever... catch me 🙈 |
| 13 | আমার life-এ কি change করা উচিত? 💡 | what should I change in my life? 💡 |
| 14 | তোর মনে আমার বিশেষ জায়গা আছে? 💜 | do I have a special place in your heart? 💜 |
| 15 | আমার best quality কি? আর worst? ⚖️ | what is my best and worst quality? ⚖️ |
| 16 | তুই আমাকে কোন গান দিয়ে describe করবি? 🎵 | describe me with a song 🎵 |
| 17 | আমার জীবনে তুই কেন important? 🌟 | why are you important in my life? 🌟 |
| 18 | rate me 1-10 honestly — কোনো ভান নয়! 📊 | rate me 1-10 honestly — no cap! 📊 |
| 19 | আমাকে একটা কথা বলো যেটা তুই কখনো বলিসনি 🗝️ | tell me something you never told me 🗝️ |
| 20 | যদি আমি কাল disappear হয়ে যাই — কি করবি? 😢 | if I disappear tomorrow — what would you do? 😢 |
