# 🔥 Bong NGL — Master Status & Strategy
> **For non-coders. Easy English. Last updated: 16 April 2026.**
> One file to rule them all. All phases. All ideas. All strategy.

---

## 📖 HOW TO READ THIS FILE

- ✅ = **DONE** — already working on the live site
- ⏳ = **HALF DONE** — backend built, needs a UI (button/screen)
- ❌ = **NOT DONE** — hasn't been built yet
- 💎 = **PREMIUM** — suggested to put behind a payment wall

---

## ✅ PART 1 — WHAT'S ALREADY DONE (Easy English)

> Think of this as your scorecard. Everything below is live and working.

### The Foundation (Core App)
- ✅ **Users can create their own link** — pick a username like `bongbari.com/ngl/q/yourname`
- ✅ **Anonymous messages** — anyone can send a message to that link without revealing who they are
- ✅ **Inbox** — the link owner sees all messages in a private dashboard
- ✅ **Delete messages** — delete any message you don't like (NGL.link can't do this!)
- ✅ **Delete entire account** ("Banish") — removes everything permanently

### Login & Security
- ✅ **Secret key login** — a 64-character key (like a super-strong password), stored on the device
- ✅ **6-digit PIN** — easy short PIN so you can log in on a new phone quickly
- ✅ **Auto-login** — same device remembers you, no login needed
- ✅ **Key moved to hidden header** — the secret key is NOT visible in the URL anymore (more secure)

### Look & Feel
- ✅ **7 colour themes** — OG Pink, Ocean, Forest, Galaxy, Gold, Dark, and the default gradient
- ✅ **Profile photo** — upload your photo, shown on your send page and dashboard
- ✅ **All text readable** — fixed tiny fonts everywhere (the old 10px text was unreadable)
- ✅ **Works on phone AND desktop** — fully responsive

### AI & Prompts
- ✅ **AI dice** 🎲 — shake the dice to get a new AI-generated question prompt (uses Llama 3.3 70B, the same AI model behind ChatGPT competitors)
- ✅ **Dice visual feedback** — when the dice changes the prompt, it flashes green + shows a "New prompt!" toast so you know it worked
- ✅ **Bengali + English toggle** — all text switches language, including AI-generated prompts
- ✅ **AI Prompt Enhance** ✨ — you write a basic prompt, AI makes it better
- ✅ **20 built-in prompt templates** — fallback prompts if AI is down

### Sharing
- ✅ **Story card generator** — makes a beautiful card you can screenshot and post to Instagram/WhatsApp stories (8 colour palettes!)
- ✅ **QR code** — on every story card, so people can scan directly
- ✅ **Share to WhatsApp** — one-tap share with a pre-written message
- ✅ **Share to Instagram** — step-by-step animated tutorial (8 slides!) showing exactly how to add the link to your IG story
- ✅ **Share to Facebook** — same tutorial for FB
- ✅ **Tutorial remembers where you left off** — if you close midway through the IG tutorial, it resumes from where you stopped

### Sender Hints (The Big One — NGL charges $9.99/week for this, we give FREE)
- ✅ **"Who sent this?" hints** — each message shows: what country they're from, what timezone, what device (iPhone/Android), what browser, what language their phone is set to
- ✅ **Advanced intelligence** — also shows: city/region, internet provider (ISP), screen size, connection type (WiFi/4G), battery level (!), dark mode on/off, time they sent it, how they found your link

### Engagement
- ✅ **Message reactions** — react to messages with ❤️ 😂 🔥 💀 🫣 (NGL charges for this, we give FREE)
- ✅ **Streak counter** 🔥 — shows how many days in a row you received at least 1 message
- ✅ **Confetti** 🎉 — confetti bursts when you get your first-ever message
- ✅ **Message count badge** — live count of messages on the INBOX tab

### Connection & Errors
- ✅ **Connection error retry** — if internet drops, it auto-retries 3 times (2s, 4s, 8s gaps) then shows a "Tap to retry" button
- ✅ **Offline detection** — shows "You're offline 📡" instead of a confusing error

### Phone Verification (OTP)
- ✅ **WhatsApp OTP backend** — the server side is built: sends a 6-digit code to your WhatsApp number to verify your phone
- ⏳ **WhatsApp OTP UI** — the button and screen to trigger it from inside the app is NOT done yet

### Custom Link Previews
- ✅ **Custom OG title & description** — you can set exactly what text appears when someone shares your link on WhatsApp/Facebook/iMessage
- ✅ **Dynamic OG card** — each user's link preview is unique (your username + your prompt shows in the preview image)

### Analytics & Tracking (Behind the scenes)
- ✅ **Google Analytics events** — every button tap (share, dice, reaction, etc.) is tracked so we can see what users actually use
- ✅ **Error tracking** — JS errors are auto-reported to GA4
- ✅ **Performance tracking** — tracks how fast the dashboard loads

### Accessibility & Polish (The boring-but-important stuff)
- ✅ **Keyboard navigation** — full Tab+Enter support for accessibility
- ✅ **Touch targets 44px minimum** — all buttons are big enough to tap on small phones
- ✅ **Scrolls on short phone screens** — modal doesn't get cut off on landscape phones
- ✅ **Share cards 2×2 grid on tiny phones** — looks good on 320px wide screens

---

## ❌ PART 2 — WHAT'S NOT DONE YET (All Phases)

> These are grouped by priority. The most important ones are at the top.

---

### 🟡 GROUP A — Small / Quick Wins (Should do next)

| # | What | Why it matters | Effort |
|---|------|----------------|--------|
| A1 | **Bengali 100% coverage** — some new buttons still show English when you switch to Bengali | Every user should see their full language | Small |
| A2 | **Error messages in Bengali** — when something goes wrong, error text is English only | Feels broken for Bengali speakers | Small |
| A3 | **Shimmer/skeleton loaders** — inbox shows blank space while loading instead of a "loading..." animation | Makes the app feel faster and more polished | Small |
| A4 | **6 more share text templates** (currently 3 BN + 3 EN, need 6+6) | More variety = messages feel fresh each time user shares | Small |
| A5 | **WhatsApp OTP UI** — button and modal so users can verify their phone from the dashboard | Without this the backend OTP system is invisible to users | Small |

---

### 🟠 GROUP B — Medium Features (High value)

| # | What | Why it matters | Effort |
|---|------|----------------|--------|
| B1 | **Bad word filter / profanity block** — auto-reject messages with slurs/hate speech before they reach inbox | Safety. Trolls ruin the product. | Medium |
| B2 | **Block sender** — if a message is abusive, block that sender's device fingerprint | Users need a way to protect themselves | Medium |
| B3 | **Message pinning** — pin up to 3 favourite messages to the top of inbox ⭐ | Simple premium feel. NGL doesn't have it. | Medium |
| B4 | **Inbox pagination** — currently loads ALL messages at once (will be very slow if you have 500+ messages) | Performance: absolutely necessary before going viral | Medium |
| B5 | **Rate limit cleanup** — a small memory leak in the server (rate limit tables grow forever, never get cleaned up) | Server health on Oracle VM (only 503MB RAM!) | Small |
| B6 | **Typecheck zero errors** — run `npm run check` and fix all TypeScript warnings | Code quality + prevents future bugs | Medium |
| B7 | **Bundle size audit** — check if the website loads too much JS at once | Site speed = more users staying | Medium |

---

### 🔴 GROUP C — Platform Features (Bigger but powerful)

| # | What | Why it matters | Effort |
|---|------|----------------|--------|
| C1 | **PWA (Add to Home Screen)** — users can install the app on their phone like a real app | Feels like a real product. No App Store needed. | Medium |
| C2 | **Web Push Notifications** — phone notifies you when a new message arrives, even when browser is closed | The #1 reason people check the app. Without this, they forget. | High |
| C3 | **Sound effects** — subtle notification ping for new messages, "pop" on dice, "whoosh" on send | Makes the app feel alive | Small |
| C4 | **Anonymous polls** — you create a poll (e.g. "Rate my vibe? 🔥💀😂🫣"), people vote anonymously | VIRAL. Nobody else has this. | High |
| C5 | **AI reply suggestions** — when you read a message, AI suggests 3 things you could reply in real life | Makes every message feel actionable | Medium |
| C6 | **Landing page live stats** — "🔥 12,847 anonymous messages sent!" counter on the home page | Social proof = more signups | Small |
| C7 | **Hindi / Hinglish language** — add a 3rd language toggle | Massive audience expansion (Hindi speakers = 600M people) | Medium |
| C8 | **Message search** — search your inbox by keyword | Quality of life for power users | Medium |
| C9 | **Report/Block system** — "Report this message" button → auto-flag repeat bad actors | Platform safety at scale | High |
| C10 | **Data export** — "Download all my messages" as a file | Trust + GDPR compliance if we ever expand to EU | Medium |
| C11 | **Scheduled prompt changes** — "Change my prompt to X at 9 PM tonight" | Creators can plan their content | High |
| C12 | **Analytics for users** — simple stats: messages per day, busiest hour, which emoji reactions most | Makes users feel like influencers | High |
| C13 | **Cross-browser + device testing** — manually verify everything works on iPhone Safari, Android Chrome, etc. | Bugs we don't know about yet | Manual |
| C14 | **Integration tests** — automated tests that run before every deploy | Catch bugs before users see them | Medium |
| C15 | **Production deploy & verify checklist** | Ship it properly | Small |

---

## 💎 PART 3 — PREMIUM STRATEGY (Psychologist Brain Edition)

> **One plan. One price. Six features. That's it.**

---

### 🧠 How a Psychologist Thinks About This

People don't pay for features. People pay for **feelings**.

There are only 3 feelings that make people open their wallet for an app like this:

1. **Curiosity** → "WHO sent that message?! I NEED to know more."
2. **Status** → "I want my profile to look different / special / verified."
3. **Peace of mind** → "I want bad messages gone before I even see them."

Everything else — scheduled prompts, data export, creator analytics — sounds cool in a doc but nobody actually upgrades for those. That's the trap.

**The only pricing plan:**
- 💎 **Bong PRO** — **₹98/month** or **₹683/year** (2 months free)
- No second tier. No confusion. One upgrade button.

---

### 💎 THE 6 PRO FEATURES (Each one is a feeling, not a feature)

---

#### 1. 🔍 Deep Sender Reveal — *"I NEED to know who this is"*
**Free users see**: India · IST · iPhone
**PRO users see**: Kolkata, West Bengal · Airtel Broadband · iPhone 14 Pro · Chrome 124 · Sent at 11:43 PM · Dark mode ON · WiFi · Screen: 390×844

This is the #1 reason people will upgrade. The basic hint is already FREE (which already beats NGL). The PRO reveal goes deeper. The curiosity gap between "India" and "Kolkata, Airtel" is what makes people pay.

**What's technically possible (honest)**:
- ✅ City (e.g. Kolkata) — from IP geolocation, ~75% accurate
- ✅ State (e.g. West Bengal) — ~90% accurate
- ✅ ISP name (e.g. Airtel, Jio, BSNL) — ~95% accurate
- ✅ Device, browser, OS, screen size — 100% accurate (from User-Agent)
- ✅ Exact send time, dark mode, WiFi vs mobile data — 100% accurate
- ❌ Street address — NOT possible from IP. IP is assigned to a cluster of hundreds of users, not one house.
- ❌ Exact house/pincode — NOT possible without ISP cooperation (which requires a court order)

So the reveal is: **city + ISP + device + behaviour data**. That's already enough for someone to think "only my cousin in Kolkata uses Airtel on an iPhone..." — the psychology does the rest.

**The FOMO trick**: Show a blurred/locked card on each message: *"📍 Kolkata + 5 more details — Unlock with PRO"*. They see it on EVERY message. The itch builds. They upgrade.

NGL charges ₹830/week for basic hints. We give basic FREE. We charge ₹98/month for the deep version. Easy sell.

---

#### 2. ✅ Verified PRO Badge — *"I want to look legit"*
PRO profiles get a small **✓ PRO** badge on their send page (what senders see).

That's it. No complex feature. Just a badge.

**Why people pay for this**: Status. When college students share their link and their send page shows ✓, they feel validated. Their friends see it and want it too. This is pure vanity — and vanity sells.

Also practical: senders trust a verified profile more → they send more messages → the user gets more value → they keep paying.

---

#### 3. 🛡️ Auto-Shield (AI troll filter) — *"I want to feel safe"*
**Free**: Trolls get through. You see the bad message and manually delete it.
**PRO**: AI scans every incoming message before it lands in your inbox. Obvious abuse, slurs, and targeted harassment are auto-blocked. You never even see it.

**Why people pay for this**: Peace of mind. Once a user gets even ONE abusive message, they feel unsafe. PRO removes that anxiety permanently. This is especially powerful for girls and public accounts.

The basic bad-word filter (which we'll build as a free feature) catches obvious slurs. PRO's AI Shield catches nuanced harassment, passive-aggressive attacks, and targeted insults. Different level.

---

#### 4. 📌 Pin + Archive — *"I want to keep my favourites forever"*
**Free**: Messages are just a list. No way to save the ones that matter.
**PRO**: Pin up to 10 messages to the top of inbox (free users: 0 pinning). Also: Archive section — save important messages forever even if you refresh/clear inbox.

**Why people pay for this**: Emotional ownership. When someone gets a beautiful anonymous compliment, they want to keep it. "My best friend probably wrote this and I'll never know but I want to see this every day." That's worth ₹98.

---

#### 5. 🎨 3 Exclusive PRO Themes — *"I want to look different from everyone else"*
Free users get 7 themes. PRO users get 3 EXTRA exclusive themes that nobody else can use:
- **Neon** — Electric blue + purple glow, dark bg
- **Rose Gold** — Warm pink-gold gradient, premium feel
- **Midnight** — Pure black + deep indigo, ultra minimal

These themes show on your send page — the page SENDERS see. So it's a status symbol that other people notice.

**Why people pay for this**: Aesthetic identity. Same reason people buy iPhone cases. "My page looks better than yours."

---

#### 6. 🔔 Instant Ping (Real-time notification) — *"I can't wait, I need to know NOW"*
**Free**: Inbox auto-refreshes every 10 seconds. You might miss a message for 10 seconds.
**PRO**: The moment a message arrives → your phone vibrates. Instant. Even if the browser is in the background.

**Why people pay for this**: Reward loop. Getting an anonymous message is exciting. Making that excitement instant = dopamine hit every time. Users who get many messages will pay just to feel that ping immediately instead of checking every 10 seconds.

(This needs PWA + Web Push to work — build those first.)

---

### 💡 THE FOMO SYSTEM — How We Make Free Users Upgrade

> Don't beg people to upgrade. Make them **feel the gap** themselves.

| What they see for FREE | What triggers the upgrade |
|------------------------|--------------------------|
| "India · IST · iPhone" on each message | Blurred card below: "📍 Mumbai + 4 more details — PRO" |
| Plain send page (no badge) | Friend's send page has ✓ PRO badge — they ask "how do I get that?" |
| Troll message lands in inbox | Toast: "🛡️ PRO users auto-block this type of message" |
| Want to save a compliment | Pin button shows but tapping it shows: "Pin messages with PRO ✨" |
| 10-second delay between checking | After 5 minutes of checking manually: "Get instant pings with PRO" |

---

### 📊 WILL ₹98 WORK?

Yes. Here's why:

- ₹98/month = ₹3.27/day = the cost of one biscuit packet. Nobody thinks twice.
- ₹683/year = ₹57/month (if paying yearly) = 2 months free. Impulse purchase.
- NGL charges ₹830/WEEK for worse features. We're literally 8× cheaper.
- Target user: college student, 18-24, has UPI, has seen NGL, curious about senders.
- If 100 users pay ₹98/month = ₹9,800/month. Real money. Covers Oracle VM + Razorpay fees easily.

---

### ❌ WHAT WE ARE NOT CHARGING FOR

These are FREE. Always. Non-negotiable.
- Basic anonymous messaging (create, send, receive, delete)
- Basic sender hints (country, timezone, device type)
- All 7 themes
- Story card + QR code
- Bengali toggle
- Streak counter
- 5 emoji reactions
- IG/WA/FB share tutorials

**Rule**: If removing it would make the app feel broken → it stays free.

---

## 🗺️ PART 4 — WHAT TO BUILD NEXT (Prioritised)

> In order of: impact + effort. Start from top.

### 🎯 SESSION NEXT (Quick wins, max impact)

1. **A3: Shimmer loaders** — inbox looks polished while loading
2. **A1+A2: Bengali 100% + error messages in Bengali**
3. **A5: WhatsApp OTP UI** — users can verify phone
4. **B1: Bad word filter** — basic free safety (catches slurs)
5. **B4: Inbox pagination** — performance before viral moment

### 🚀 SESSION AFTER — Build the PRO features in order

6. **PRO #1: Deep Sender Reveal** — show locked city+ISP on each message card (biggest conversion driver)
7. **PRO #2: Verified ✓ PRO Badge** — shows on send page (status symbol, easiest to build)
8. **PRO #3: Pin + Archive** — pin up to 10 messages
9. **PRO #4: 3 Exclusive Themes** — Neon, Rose Gold, Midnight (PRO-only)
10. **C1: PWA install** — required before push notifications
11. **PRO #5: Instant Ping** — Web Push Notifications (PRO-only)
12. **PRO #6: AI Auto-Shield** — AI troll filter for PRO inbox

### 🏆 THEN — Razorpay wiring

13. Razorpay backend (create-order + verify endpoints)
14. PRO upgrade button + checkout modal in NglDashboard
15. `isPremium` flag in DB, gate all PRO features behind it

---

## 📁 PART 5 — WHICH FILE DOES WHAT

> For when Copilot needs to know where to work.

| What you want to change | Which file |
|------------------------|------------|
| Server API (new endpoint) | `server/routes/ngl.ts` |
| Database columns | `shared/schema.ts` |
| Dashboard screen | `client/src/pages/NglDashboard.tsx` |
| The send page (what senders see) | `client/src/pages/NglSend.tsx` |
| Create account / login page | `client/src/pages/NglCreate.tsx` |
| Landing page (first page at /ngl) | `client/src/pages/NglLanding.tsx` |
| Share modal (IG/WA/FB tutorials) | `client/src/components/ShareModal.tsx` |
| Bengali + English text strings | `client/src/lib/NglLang.tsx` |
| Payment routes | `server/routes/nglPayment.ts` (to be created) |

---

## 🔢 PART 6 — FULL PHASE STATUS (All 50 phases at a glance)

| Phase | Name | Status |
|-------|------|--------|
| 21 | Readability overhaul (text sizes) | ✅ DONE |
| 22 | 6-digit PIN login | ✅ DONE |
| 23 | Dice visual feedback | ✅ DONE |
| 24 | Connection error UX | ✅ DONE |
| 25 | Secret key → HTTP header | ✅ DONE |
| 26 | Profile photos | ✅ DONE |
| 27 | Dynamic OG card | ✅ DONE |
| 28 | Story card + QR (8 palettes) | ✅ DONE |
| 29 | Sound effects | ❌ NOT DONE |
| 30 | 7 custom themes | ✅ DONE |
| 31 | Message reactions | ✅ DONE |
| 32 | Free sender hints (basic + advanced) | ✅ DONE |
| 33 | Message pinning | ✅ DONE |
| 34 | Live landing stats counter | ❌ NOT DONE |
| 35 | WhatsApp OTP backend | ✅ DONE (⏳ no UI yet) |
| 36 | PWA install ("Add to Home Screen") | ❌ NOT DONE |
| 37 | Inbox pagination | ✅ DONE |
| 38 | Share tutorial (IG/WA/FB) | ✅ DONE (8 slides each) |
| 39 | Onboarding tutorial | ✅ DONE |
| 40 | Custom OG meta + advanced sender DB | ✅ DONE |
| 41 | Anonymous polls | ❌ NOT DONE |
| 42 | Streak counter | ✅ DONE |
| 43 | AI reply suggestions | ❌ NOT DONE |
| 44 | Scheduled prompts | ❌ NOT DONE |
| 45 | Analytics dashboard per user | ❌ NOT DONE |
| 46 | Web push notifications | ❌ NOT DONE |
| 47 | Report/block system | ❌ NOT DONE |
| 48 | Hindi/Hinglish language | ❌ NOT DONE |
| 49 | Message search | ❌ NOT DONE |
| 50 | Data export (PDF/CSV) | ❌ NOT DONE |
| 51 | Bengali 100% translation coverage | ✅ DONE |
| 52 | Error messages bilingual | ✅ DONE |
| 53 | Shimmer/skeleton loaders | ✅ DONE |
| 54 | Share templates 6+6 | ✅ DONE |
| 55 | TypeScript zero errors check | ✅ DONE |
| 56 | Bundle size audit | ✅ DONE |
| 57 | Bad word / profanity filter | ✅ DONE |
| 58 | AI abuse shield (PRO) | ❌ NOT DONE |
| 59 | Razorpay payment integration | ❌ NOT DONE (live mode activated in dashboard) |
| 60 | Creator analytics dashboard (CREATOR tier) | ❌ NOT DONE |

---

## 📊 SUMMARY SCORECARD

| Category | Done | Not Done |
|----------|------|---------|
| Core app | 10/10 | 0 |
| Login & security | 4/4 | 0 |
| Look & feel | 5/5 | 0 |
| AI & prompts | 5/5 | 0 |
| Sharing (IG/WA/FB) | 6/6 | 0 |
| Sender hints | 2/2 | 0 |
| Engagement (reactions, streaks) | 3/3 | 0 |
| Platform (PWA, push, pagination) | 2/4 | 2 |
| Premium / monetisation | 0/5 | 5 |
| Safety (filter, block, report) | 2/3 | 1 |
| Language (Bengali 100%, Hindi) | 1/2 | 1 |
| QA (tests, bundle, typecheck) | 3/4 | 1 |

**TOTAL: ~46 things done ✅ | ~14 things to go ❌**

### Group A + B (April 2026 — this session)
- ✅ **A1/A2** Bengali coverage + bilingual error messages (`dash.wrongKeyError`, `dash.connectionError`, `dash.retrying`, `dash.networkError`, `dash.serverError`, `dash.genericError`)
- ✅ **A3** Shimmer/skeleton inbox loader (`InboxShimmer` in `NglLang.tsx`)
- ✅ **A4** Share templates expanded to 6 BN + 6 EN (12 total)
- ✅ **A5** WhatsApp OTP UI wired in `NglDashboard.tsx` (phone input + OTP verify + cooldown)
- ✅ **B1** Bad-word/profanity filter (`server/lib/ngl-blocked-words.ts`) — soft-drops blocked messages
- ✅ **B2** Block-sender by SHA-256 fingerprint (IP + UA) — per-user blocklist in `ngl_blocked_fingerprints`
- ✅ **B3** Message pinning — max 3 pins/user, sorted to top of inbox
- ✅ **B4** Inbox pagination (`?limit` & `?offset`, `hasMore`, Load-More button)
- ✅ **B5** Rate-limit map cleanup (prevents OOM on 503MB Oracle VM)
- ✅ **B6** TypeScript zero errors (`npm run check` clean)
- ✅ **B7** Bundle audit — `NglDashboard` chunk 185.61 kB (gzip 43 kB, under 200 kB budget)

---

*This file = the single master reference. Update it after every session.*
*Other NGL docs: `NGL_30_PHASE_PLAN.md` (phase details) · `docs/NGL_40_PHASE_PLAN.md` (ShareModal phases 10-40) · `NGL_ENHANCEMENT_TRACKER.md` (feature log 1-29)*
