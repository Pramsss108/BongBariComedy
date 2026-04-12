# Bong NGL — Enhancement Tracker

> Last updated: 2 April 2026 (v3 — Session 2 "NGL Pro Killer" complete)
> 📋 **Strategy**: Give away FREE everything NGL.link charges $9.99/week for

---

## ✅ What's DONE & Working

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Anonymous messaging (send/receive) | ✅ Working | Send page, inbox, Postgres persistence |
| 2 | Username system (create + login) | ✅ Working | Live availability check, secret key auth |
| 3 | Bengali + English i18n (toggle) | ✅ Working | 50+ translation keys, auto-detect browser language |
| 4 | AI-powered dice prompts (Groq LLM) | ✅ Working | Llama 3.3 70B via Groq, respects BN/EN toggle, static fallback |
| 5 | Custom prompt (edit + save) | ✅ Working | Inline edit on dashboard, 3-200 chars |
| 6 | Copy link + share (WhatsApp, Instagram, Web Share API) | ✅ Working | 3 share text templates per language |
| 7 | Inbox with auto-refresh (10s) | ✅ Working | Newest-first, delete individual msgs, stagger animations |
| 8 | Confetti burst on first message | ✅ Working | 50-piece physics confetti |
| 9 | Premium dark UI (gradient bg, glass cards) | ✅ Working | All 4 pages, mobile + desktop |
| 10 | OG meta preview page | ✅ Working | `/api/ngl/og/:username` for link previews |
| 11 | Banish (delete profile + all messages) | ✅ Working | Username confirmation required, red danger zone |
| 12 | Secret key reveal + copy | ✅ Working | Collapsible section with warning |
| 13 | Desktop-friendly layout | ✅ Working | `max-w-2xl` centering, `sm:grid-cols-2` responsive grids |
| 14 | Floating FAQ help (premium accordion) | ✅ Working | Dark theme, 6 Q&As with emoji icons |
| 15 | Rate limiting (create: 30s, send: 8s) | ✅ Working | IP-based |
| 16 | XSS sanitization on all inputs | ✅ Working | `sanitizeText()` on messages + prompts |
| 17 | Message count tracking | ✅ Working | Badge on INBOX tab with pulse animation |
| 18 | No-scroll full-height pages | ✅ Working | `h-dvh overflow-hidden` + safe area padding |
| 19 | Fake social proof counter | ✅ Working | Random 150-400 "people sent messages" |
| 20 | SEO Head on all pages | ✅ Working | Dynamic titles + descriptions |
| 21 | **Readability overhaul** | ✅ Working | All text-[10px] → text-xs, message text bumped to text-base |
| 22 | **6-digit PIN login** | ✅ Working | Optional PIN at creation, PIN login on new device issues fresh key |
| 23 | **Dice visual feedback** | ✅ Working | Flash border, spring animation, "New prompt!" toast |
| 24 | **Connection error UX** | ✅ Working | Auto-retry (3x backoff), retry button, offline detection |
| 25 | **X-NGL-Key header auth** | ✅ Working | Key in header (not URL), backward compat with ?key= |
| 26 | **🔥 Free Sender Hints** (lang + tz + device) | ✅ Working | Captures Accept-Language, X-Timezone, User-Agent — NGL charges $9.99/wk! |
| 27 | **Message Reactions** (❤️ 😂 🔥 💀 🫣) | ✅ Working | Tap to react, animated picker, per-message emoji |
| 28 | **Custom Themes** (7 gradient presets) | ✅ Working | OG/Pink/Ocean/Forest/Galaxy/Gold/Dark — applies to dash + send page |
| 29 | **Profile Photos** (upload + display) | ✅ Working | Canvas resize to 200×200, max 150KB, shows on dash + send + avatar |

---

## ⚠️ Known Issues

| # | Issue | Severity | Fix Effort |
|---|-------|----------|------------|
| 1 | No `og-ngl.png` image file exists — OG previews show broken image | Medium | Easy — create a gradient card PNG |
| 2 | ~~Secret key in URL query string~~ | ~~Low~~ | ✅ Fixed — moved to `X-NGL-Key` header (Phase 25) |
| 3 | Rate limit maps grow unbounded (no cleanup) — slow memory leak | Low | Easy — add periodic cleanup (every 5 min) |
| 4 | No inbox pagination — fetches all msgs at once (slow at 500 msgs) | Low | Easy — add `limit/offset` params |
| 5 | Message count can drift from actual count on concurrent deletes | Low | Easy — recount on read |

---

## � NGL.link Charges $9.99/Week — We Give It ALL FREE

> **This is our #1 strategy**: Every premium feature NGL charges money for, we give FREE. That's what makes Bong NGL a killer.

| Feature | NGL.link Price | Bong NGL Price | Status |
|---------|---------------|----------------|--------|
| **"Who sent this?" Sender Hints** (language, timezone, device) | **$9.99/week** ($520/year!) | **FREE** | ✅ Phase 26 |
| **Message Reactions** (❤️ 😂 🔥 💀 🫣) | **Pro only** | **FREE** | ✅ Phase 27 |
| **Custom Themes** (7 gradient presets) | **Pro only** | **FREE** | ✅ Phase 28 |
| **Profile Photos** (upload + display) | Standard (app required) | **FREE** (web, no app) | ✅ Phase 29 |
| **Full Inbox Access** (see all messages) | **$9.99/week** (paywall) | **FREE** | ✅ Done |
| **AI Prompts** (smart question generation) | ❌ Doesn't exist | **FREE** | ✅ Done |
| **Delete Messages** (individual/all) | ❌ Can't delete | **FREE** | ✅ Done |
| **Cross-device Login** | ❌ App lock-in | **FREE** (PIN + key) | ✅ Done |
| **Bengali Support** | ❌ English only | **FREE** | ✅ Done |
| **No App Required** | ❌ Forces app install | **FREE** (pure web) | ✅ Done |
| **AI Prompt Enhance** ✨ | ❌ Doesn't exist | **FREE** | ✅ Done |

**NGL.link users pay $520/year for sender hints alone. We give it FREE + 10 more premium features.**

---

## 🔥 Bong NGL vs Real NGL.link — Feature Comparison

| Feature | NGL.link | Bong NGL | Winner |
|---------|----------|----------|--------|
| Anonymous messaging | ✅ | ✅ | Tie |
| Username profiles | ✅ | ✅ | Tie |
| Custom prompts | ✅ | ✅ | Tie |
| Inbox | ✅ | ✅ | Tie |
| Confetti celebration | ✅ | ✅ | Tie |
| OG link previews | ✅ | ✅ | Tie |
| Social proof counter | ✅ | ✅ | Tie |
| **AI-generated prompts (LLM)** | ❌ | ✅ | **Bong NGL** |
| **AI Prompt Enhance** ✨ | ❌ | ✅ | **Bong NGL** |
| **Bengali language support** | ❌ | ✅ | **Bong NGL** |
| **No app required (pure web)** | ❌ (forces app) | ✅ | **Bong NGL** |
| **Free inbox (no paywall)** | ❌ ($9.99/week) | ✅ | **Bong NGL** |
| **Free sender hints** | ❌ ($9.99/week) | ✅ FREE | **Bong NGL** |
| **Delete individual messages** | ❌ | ✅ | **Bong NGL** |
| **Delete entire profile** | ❌ | ✅ | **Bong NGL** |
| **WhatsApp sharing** | ❌ | ✅ | **Bong NGL** |
| **Cross-device login (PIN)** | ❌ | ✅ | **Bong NGL** |
| **Share-to-story card** | ❌ | 🔜 FREE | **Bong NGL** |
| **QR code sharing** | ❌ | 🔜 FREE | **Bong NGL** |
| **Streak counter** | ❌ | 🔜 FREE | **Bong NGL** |
| Profile photos | ✅ | ✅ FREE | **Bong NGL** (free vs paid) |
| Message reactions | ✅ (Pro) | ✅ FREE | **Bong NGL** (free vs paid) |
| Custom themes | ✅ (Pro) | ✅ FREE | **Bong NGL** (free vs paid) |
| Block/Report sender | ✅ | 🔜 | Tie (soon) |
| Instagram DM integration | ✅ | ❌ | NGL.link |
| Push notifications | ✅ (app only) | ❌ | NGL.link |
| Games tab | ✅ | ❌ | NGL.link |

**Score: Bong NGL wins 18 features, NGL.link wins 3. Tie on 6.**

---

## 🚀 Enhancement Roadmap — 15 Phases Left (Lean & Killer)

> **Strategy**: Only build features that (a) competitors charge for, or (b) make sharing go viral. Cut the bekar stuff.

| Phase | Feature | Why It's Premium | Effort |
|-------|---------|-----------------|--------|
| ~~26~~ | ~~🔥 Free Sender Hints~~ | ✅ DONE | ✅ |
| ~~27~~ | ~~Message Reactions~~ | ✅ DONE | ✅ |
| ~~28~~ | ~~Custom Themes~~ | ✅ DONE | ✅ |
| ~~29~~ | ~~Profile Photos~~ | ✅ DONE | ✅ |
| 30 | **Dynamic OG Card** (server-generated gradient image per user) | Better IG/WA previews than NGL | Medium |
| 31 | **Share-to-Story Card** (downloadable PNG for IG/WA stories) | Viral mechanic — no competitor has this | Medium |
| 32 | **QR Code Sharing** (generate + download QR of share link) | College/school sharing — instant | Easy |
| 33 | **🔥 Streak Counter** (consecutive days with messages) | Engagement hook — keeps users sharing daily | Easy |
| 34 | **Landing Page Live Stats** ("🔥 X messages sent anonymously!") | Social proof — builds trust + FOMO | Easy |
| 35 | **Block Words Filter** (auto-reject slurs/hate speech) | Safety — responsible platform | Easy |
| 36 | **Report/Block System** (report msg + block sender IP) | Safety — NGL has it, we need it | Medium |
| 37 | **Sound Effects** (new msg chime, dice pop, send whoosh, mute toggle) | Delight — makes app feel alive | Easy |
| 38 | **Message Pinning** (⭐ pin top 3 favorites) | Engagement — power user love | Easy |
| 39 | **PWA Support** (Add to Home Screen, manifest, app icon) | App-like install without app store | Medium |
| 40 | **Inbox Pagination** (infinite scroll, 20 msgs/page) | Performance — handles 500+ msgs | Easy |

---

## ❌ CUT Features (Bekar — Not Worth Building)

| Old Phase | Feature | Why It's Cut |
|-----------|---------|-------------|
| 41 | Anonymous Polls | Different product — we're anonymous messaging, not SurveyMonkey |
| 42 | Streak Counter | ✅ Moved to Phase 33 (kept — it's good) |
| 43 | AI Reply Suggestions | Can't reply to anonymous msgs — makes no sense |
| 44 | Scheduled Prompts | Overengineered — nobody schedules prompts on anon apps |
| 45 | Analytics Dashboard | Overkill — users want messages, not Excel charts |
| 46 | Web Push Notifications | Complex infra (VAPID keys, service worker) — low ROI for anon app |
| 47 | Report/Block | ✅ Moved to Phase 36 (kept — it's important for safety) |
| 48 | Multi-Language Hindi | Scope creep — Bengali + English is enough for now |
| 49 | Message Search | Overkill — small inboxes don't need search |
| 50 | Export Data (GDPR) | Can add later if legally required — not a user-facing feature |
| — | Onboarding Tutorial | App is 3 screens — it's obvious how to use it |
| — | Rate Limit Cleanup | Backend housekeeping — will add inline when needed, not a "phase" |

---

## 📊 API Endpoints (16 total)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/api/ngl/create` | — | Create profile |
| `POST` | `/api/ngl/login` | — | Re-login with secret key |
| `GET` | `/api/ngl/check/:username` | — | Check availability |
| `GET` | `/api/ngl/u/:username` | — | Get public profile (incl. theme + photo) |
| `POST` | `/api/ngl/u/:username/send` | — | Send anonymous message (captures sender hints) |
| `GET` | `/api/ngl/u/:username/inbox` | `X-NGL-Key` | Read inbox (msgs include hints + reactions) |
| `DELETE` | `/api/ngl/u/:username/message/:id` | `X-NGL-Key` | Delete single message |
| `PUT` | `/api/ngl/u/:username/prompt` | `X-NGL-Key` | Update prompt |
| `PUT` | `/api/ngl/u/:username/pin` | `X-NGL-Key` | Set/update PIN |
| `POST` | `/api/ngl/prompts/enhance` | — | AI enhance prompt |
| `GET` | `/api/ngl/prompts/random` | — | AI prompt (`?lang=bn\|en`) |
| `DELETE` | `/api/ngl/u/:username` | `X-NGL-Key` | Delete profile + all data |
| `GET` | `/api/ngl/stats` | — | Total users/messages |
| `GET` | `/api/ngl/og/:username` | — | OG meta preview page |
| `PUT` | `/api/ngl/u/:username/message/:id/react` | `X-NGL-Key` | Set/remove reaction on message |
| `PUT` | `/api/ngl/u/:username/theme` | `X-NGL-Key` | Set custom theme |
| `PUT` | `/api/ngl/u/:username/photo` | `X-NGL-Key` | Upload profile photo (base64) |
| `DELETE` | `/api/ngl/u/:username/photo` | `X-NGL-Key` | Remove profile photo |

---

## 📁 File Map

| File | Purpose |
|------|---------|
| `server/routes/ngl.ts` | All 12 API endpoints |
| `client/src/pages/NglLanding.tsx` | Landing page (`/ngl`) |
| `client/src/pages/NglCreate.tsx` | Create/Login (`/ngl/create`) |
| `client/src/pages/NglSend.tsx` | Send message (`/ngl/q/:username`) |
| `client/src/pages/NglDashboard.tsx` | Dashboard (`/ngl/at/:username`) |
| `client/src/components/NglLang.tsx` | i18n + FloatingHelp FAQ |
| `shared/schema.ts` | `ngl_users` + `ngl_messages` tables |

---

## 🗓️ Execution Batches (4 sessions to finish)

> Old plan had 7 sessions with bekar features. New plan: **4 focused sessions**, only premium-killer features.

### ✅ Session 1 — DONE: Critical UX Fixes (Phases 21-25)
- Readability overhaul, PIN login, dice feedback, connection error UX, X-NGL-Key header
- **+ Hotfixes**: Enhance button ✨, silent retry, visibility fixes, i18n cleanup

### ✅ Session 2 — DONE: "NGL Pro Killer" (Phases 26-29)
> **Gave away FREE what NGL charges $9.99/week for**
- Phase 26: ✅ Free Sender Hints (language + timezone + device) — captures Accept-Language, X-Timezone, User-Agent
- Phase 27: ✅ Message Reactions (❤️ 😂 🔥 💀 🫣) — animated picker, per-message reactions
- Phase 28: ✅ Custom Themes (7 gradient presets) — OG/Pink/Ocean/Forest/Galaxy/Gold/Dark, applies to dashboard + send page
- Phase 29: ✅ Profile Photos (upload + display) — canvas resize 200×200, max 150KB, shows everywhere

### 🔜 Session 3 — "Go Viral" (Phases 30-34)
> **Make sharing irresistible + engagement hooks**
- Phase 30: Dynamic OG Card (server-generated per-user image)
- Phase 31: Share-to-Story Card (downloadable PNG)
- Phase 32: QR Code Sharing
- Phase 33: 🔥 Streak Counter (consecutive days)
- Phase 34: Landing Page Live Stats

### 🔜 Session 4 — "Safety & Polish" (Phases 35-40)
> **Trust, safety, and app-level features**
- Phase 35: Block Words Filter (auto-reject slurs)
- Phase 36: Report/Block System
- Phase 37: Sound Effects (chime, pop, whoosh)
- Phase 38: Message Pinning (⭐ top 3)
- Phase 39: PWA Support (Add to Home Screen)
- Phase 40: Inbox Pagination (infinite scroll)

### Summary:
```
Session 1: ✅ DONE — Phases 21-25 + hotfixes (UX fixes + PIN + security)
Session 2: ✅ DONE — Phases 26-29 (hints + reactions + themes + photos)
Session 3: Phases 30-34 (5) — Go Viral (OG card + story card + QR + streak + stats)
Session 4: Phases 35-40 (6) — Safety & Polish (filter + report + sounds + pin + PWA + pagination)
```
**2 sessions left. 11 phases. Zero bekar. Say "Do Session 3" to start.**