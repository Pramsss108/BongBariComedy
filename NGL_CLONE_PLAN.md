# 🎭 Bong NGL — Full NGL.link Clone Plan (Web App)
> "NGL without the app, without the paywall, without the BS"

---

## 📍 Current State vs Target

| What exists now | What we're building |
|----------------|---------------------|
| `AnonymousKhisti` — one global wall, everyone drops anonymous messages | **Personal anonymous message links** — each user gets their own link like NGL |
| No user accounts, no inbox | **Username-based profiles** with PLAY + INBOX tabs |
| Simple text input → feed | **Full NGL flow**: create account → customize prompt → share link → receive messages → view inbox |
| In-memory (RAM) — clears on restart | **Neon Postgres** (permanent) via existing Drizzle ORM |

---

## 💾 Where Is Data Stored?

| Layer | Current (Khisti) | NGL Clone (New) |
|-------|-----------------|-----------------|
| **Messages** | RAM array (`khistiPosts[]`) — gone on restart | **Neon Postgres** (`messages` table) — permanent |
| **User Profiles** | None | **Neon Postgres** (`ngl_users` table) — username, prompt, photo |
| **Photos** | None | **Base64 in Postgres** (< 200KB) or **no photo** (avatar generated) |
| **Rate Limits** | RAM `Map<ip, timestamp>` | Same RAM map (acceptable) |
| **Sessions** | None needed (no login for NGL) | **localStorage** — just username + secret key |

**Why Postgres?** Already set up via `DATABASE_URL` → Neon free tier → Drizzle ORM already configured. No new infra needed.

---

## 📱 Page Map (Every Screen = One Full Viewport, No Scroll)

From your NGL screenshots, here's every screen we need:

| # | Page | Route | What User Sees |
|---|------|-------|----------------|
| 1 | **Landing** | `/ngl` | Big logo + "Get Started!" button + gradient bg |
| 2 | **Create Username** | `/ngl/create` | "Choose a username" → @input → Continue |
| 3 | **Dashboard (PLAY tab)** | `/ngl/@username` | Card preview + "Copy link" + "Share to story" |
| 4 | **Dashboard (INBOX tab)** | `/ngl/@username?tab=inbox` | Message cards grid / "inbox empty" state |
| 5 | **Public Send Page** | `/ngl/q/username` | Sender sees: profile + prompt + textarea + Send |
| 6 | **Sent! Confirmation** | `/ngl/q/username?sent=1` | ✅ Sent! + fake count + "Get your own!" CTA |

**Total: 6 screens, 4 actual page components** (Dashboard has 2 tabs)

---

## 🎨 Design System (Matching NGL Aesthetic)

| Element | NGL Original | Our Clone |
|---------|-------------|-----------|
| **Background** | Pink → Orange gradient (`#f8477a → #f4843e`) | Same gradient |
| **Cards** | White/frosted glass, rounded-2xl | Same |
| **Text** | Bold, black on white cards | Same |
| **Buttons** | Black pill, white text, rounded-full | Same |
| **Font** | System bold sans-serif | Same (Inter/system) |
| **Profile circle** | Gray placeholder with +, or user photo | Same |
| **Tab bar** | "PLAY" / "INBOX" + settings gear | Same |
| **No scroll** | Everything fits in viewport | `h-dvh overflow-hidden` |

---

## 🔄 User Flow (Step by Step)

### Flow A: Creator (তুমি — who wants messages)
```
/ngl → "তোর নাম দাও" → @username → 
  Dashboard PLAY tab:
    - Card preview (তোর photo + prompt)  
    - "Step 1: Copy your link" → copies bongbari.com/ngl/q/username
    - "Step 2: Share on your story" → Share button
  Dashboard INBOX tab:
    - Empty state first: "তোর inbox খালি! Link share করো"
    - After messages come: Cards with anonymous messages
    - Each card shows: emoji + message text + time
```

### Flow B: Sender (Friend — who sends anonymous message)
```
Opens bongbari.com/ngl/q/username →
  Sees: Creator's photo + prompt ("send me anonymous messages!") →
  Types message in textarea →
  Hits Send →
  "Sent!" screen:
    ✅ big checkmark
    "👇 342 friends just tapped the button 👇" (fake social proof)
    "Get your own messages!" (big CTA → goes to /ngl)
    "Send another message" (link)
```

### Flow C: Instagram/WhatsApp Share
```
Creator copies link → Pastes in Instagram Story:
  - Story shows: link sticker with bongbari.com/ngl/q/username
  - OG meta tags make beautiful preview card

Creator copies link → Pastes in WhatsApp:
  - Rich preview: Branded card + "Send me anonymous messages!" + thumbnail
  - OG image: Gradient card with profile pic + prompt text
```

---

## 🏆 Our Advantages Over NGL (Why People Switch)

| NGL Problem | Our Solution |
|-------------|-------------|
| **Forces app download** to see inbox | **100% web** — works in browser, no app ever |
| **$9.99/week** to see "who sent" hints | **FREE forever** — no paywalls, no hints scam |
| **English only** | **Bengali first** + English fallback |
| **Slow, buggy app** | **Instant web app** — loads in <1s |
| **Cluttered with ads** | **Zero ads** |
| **Fake bot messages** (NGL sends fake msgs) | **Real messages only** — no fake engagement |

---

## 20 PHASES — Execution Plan

### Phase 1: Database Schema
- Add `ngl_users` table to `shared/schema.ts` (Drizzle + Neon Postgres)
- Fields: `id`, `username` (unique), `prompt`, `photoBase64`, `secretKey`, `createdAt`
- Add `ngl_messages` table  
- Fields: `id`, `recipientUsername`, `text`, `emoji`, `createdAt`
- Run `drizzle-kit push` to create tables

### Phase 2: Backend API — User Creation
- `POST /api/ngl/create` — create username + generate secret key
- Input: `{ username, prompt? }` → Output: `{ username, secretKey }`
- Validate: 3-20 chars, alphanumeric + underscore only, unique
- Store secretKey as SHA-256 hash in DB
- Return raw secretKey once (user saves to localStorage)

### Phase 3: Backend API — Public Profile
- `GET /api/ngl/u/:username` — return public profile (prompt, photo, existence)
- No secretKey returned, no messages returned
- 404 if username doesn't exist

### Phase 4: Backend API — Send Message
- `POST /api/ngl/u/:username/send` — send anonymous message
- Input: `{ text }` — max 500 chars
- Rate limit: 1 message per IP per 8 seconds
- XSS sanitize text, assign random emoji
- No sender info stored (truly anonymous)

### Phase 5: Backend API — Inbox (Protected)
- `GET /api/ngl/u/:username/inbox?key=xxx` — get all messages
- Requires secretKey to authenticate (no login system needed)
- Returns messages newest-first with count

### Phase 6: Backend API — Photo Upload
- `PUT /api/ngl/u/:username/photo?key=xxx` — upload profile photo
- Base64, max 200KB, stored in Postgres
- Or `DELETE` to remove photo

### Phase 7: Backend API — Update Prompt
- `PUT /api/ngl/u/:username/prompt?key=xxx` — change the prompt text
- Predefined prompt options + custom text
- Random prompt dice endpoint: `GET /api/ngl/prompts/random`

### Phase 8: Landing Page (`/ngl`)
- Full viewport, no scroll, NGL gradient background (pink → orange)
- Big "🎭" or custom logo centered
- "Get Started!" big pill button → goes to `/ngl/create`
- Footer: tiny "by Bong Bari" + terms/privacy links
- Mobile: fills entire screen perfectly
- Desktop: centered card with gradient, max-width 480px

### Phase 9: Create Username Page (`/ngl/create`)
- Full viewport, gradient bg, centered card
- "Choose a username" heading (bold)
- Input: `@ ________` with live validation
- "Continue" pill button (disabled until valid)
- Real-time availability check (debounced API call)
- On success → save `{username, secretKey}` to localStorage → redirect to dashboard

### Phase 10: Dashboard — PLAY Tab (`/ngl/@username`)
- Top: "PLAY" / "INBOX" tab switcher + ⚙️ settings icon
- Center: Card preview (frosted glass) showing:
  - Profile photo circle (or placeholder)
  - Prompt text ("send me anonymous messages!")
  - Small edit icon / dice for random prompt
- Below card: "Step 1: Copy your link" → `bongbari.com/ngl/q/username` + copy button
- Below: "Step 2: Share link on your story" → "Share!" gradient button
- Everything fits in single viewport, no scroll
- Card tap → edit prompt inline

### Phase 11: Dashboard — INBOX Tab
- Same top bar (PLAY / INBOX tabs)
- If empty: "Your inbox is empty" (red text) + "Share your link to get questions!" + placeholder cards grid (blurred/gray)
- If has messages: Grid/list of message cards
  - Each card: emoji + message text + time ago
  - Tap to expand? (optional, keep simple)
- Bottom: "Get messages!" CTA button → copies share link
- Auto-refresh every 10 seconds
- Animated counter showing new messages

### Phase 12: Public Send Page (`/ngl/q/:username`)
- NGL gradient background
- White rounded card at center:
  - Top: `@username` + profile photo
  - Below: Prompt text bold ("send me anonymous messages!")
  - Textarea with placeholder (changes based on prompt)
  - Small 🔒 "anonymous q&a" badge
- "Send!" button at bottom
- Fits in one viewport, no scroll
- Keyboard-friendly on mobile (textarea stays above keyboard)

### Phase 13: Sent! Confirmation Screen
- After send → show on same page (no navigate)
- Big ✅ checkmark (animated bounce-in)
- "Sent!" text
- "👇 [random 150-400] friends just tapped the button 👇" (fake social proof)
- "Get your own messages!" → big black pill button → `/ngl`
- "Send another message" → underlined link → resets form
- Same gradient background

### Phase 14: OG Meta Tags (Beautiful Share Previews)
- Dynamic OG tags for `/ngl/q/:username`:
  - `og:title`: "Send @username anonymous messages!"
  - `og:description`: "Tap to send an anonymous message 👀"
  - `og:image`: Server-generated gradient card image (or static template)
- WhatsApp preview: Shows branded card with prompt
- Instagram story link sticker: Clean branded text
- Twitter card support too

### Phase 15: Share Functionality
- "Copy link" button → copies `https://www.bongbari.com/ngl/q/username`
- "Share to WhatsApp" → `https://wa.me/?text=...` with pre-filled Bengali text
- "Share to Instagram" → Copy text + instruction "Paste as story link sticker"
- Web Share API (`navigator.share`) on mobile for native sheet
- Share text templates (Bengali):
  - "আমাকে anonymous message পাঠাও 👀 {link}"
  - "সত্যি কথা বলো, আমি জানবো না কে বলেছে 🔥 {link}"

### Phase 16: Prompt System (Random + Custom)
- Default prompts (rotate with dice 🎲):
  - "send me anonymous messages!"
  - "say your mind without getting caught."
  - "আমার সম্পর্কে anonymous কিছু বলো 👀"
  - "তোর crush কে? বলে ফেল, জানা যাবে না 🤫"
  - "3 words — describe me"
  - "tell me a secret"
  - "আমাকে একটা খিস্তি দে 🔥"
- Custom prompt: user can type their own
- Dice button shuffles to next random prompt

### Phase 17: Mobile-First Responsive Design
- All pages: `h-dvh` (dynamic viewport height for mobile browsers)
- No scroll anywhere — everything fits in one screen
- Touch targets: minimum 44px height
- Textarea: adjusts when mobile keyboard opens
- Cards: full width on mobile, max-480px centered on desktop
- Gradient: covers full screen always
- Font sizes: 16px minimum (prevents iOS zoom)
- Safe area padding for notched phones

### Phase 18: Desktop Adaptation
- Same layout but centered in viewport
- Max card width: 480px (phone-sim look on desktop)
- Gradient covers full screen
- Optional: subtle pattern/noise on gradient
- Tab bar stays same width as card
- Works in any browser, no download

### Phase 19: Animations & Polish
- Page transitions: fade + slide up
- "Sent!" checkmark: bounce-in animation
- Message cards in inbox: staggered fade-in
- Copy button: "Copied!" toast with checkmark
- Tab switch: smooth underline slide
- New message indicator: pulse animation on INBOX tab
- Confetti on first message received (optional)
- Loading states: skeleton shimmer

### Phase 20: Viral Mechanics & Growth
- "Get your own messages!" CTA on every sent confirmation (viral loop)
- Fake social proof counter: "X friends just tapped" (random 150-400)
- Quick access: save dashboard as PWA home screen icon
- Auto-reminder: if inbox empty after 1 hour, show "share your link" nudge
- Bengali language toggle (EN ↔ BN)
- WhatsApp pre-filled message with emojis
- OG image that looks great in story screenshots

---

## 📊 API Endpoint Summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/api/ngl/create` | None | Create username |
| `GET` | `/api/ngl/u/:username` | None | Public profile |
| `POST` | `/api/ngl/u/:username/send` | None | Send anonymous message |
| `GET` | `/api/ngl/u/:username/inbox` | `?key=xxx` | View inbox (owner only) |
| `PUT` | `/api/ngl/u/:username/prompt` | `?key=xxx` | Update prompt |
| `PUT` | `/api/ngl/u/:username/photo` | `?key=xxx` | Upload photo |
| `DELETE` | `/api/ngl/u/:username/message/:id` | `?key=xxx` | Delete a message |
| `GET` | `/api/ngl/prompts/random` | None | Get random prompt |
| `GET` | `/api/ngl/check/:username` | None | Check username availability |

---

## 🗄️ Database Tables (Drizzle + Neon Postgres)

### `ngl_users`
```
id              SERIAL PRIMARY KEY
username        VARCHAR(20) UNIQUE NOT NULL
prompt          VARCHAR(200) DEFAULT 'send me anonymous messages!'
photo_base64    TEXT NULL (< 200KB)
secret_key_hash VARCHAR(64) NOT NULL (SHA-256)
created_at      TIMESTAMP DEFAULT NOW()
message_count   INTEGER DEFAULT 0
```

### `ngl_messages`
```
id                  SERIAL PRIMARY KEY
recipient_username  VARCHAR(20) NOT NULL → FK ngl_users.username
text                VARCHAR(500) NOT NULL
emoji               VARCHAR(4) NOT NULL
created_at          TIMESTAMP DEFAULT NOW()
```

---

## 📱 Screen-by-Screen Mobile Layout (h-dvh, zero scroll)

### Screen 1: Landing (`/ngl`)
```
┌─────────────────────┐
│                     │
│                     │
│       🎭            │
│   BONG NGL          │
│                     │
│   ┌─────────────┐   │
│   │ Get Started! │   │
│   └─────────────┘   │
│                     │
│  Terms · Privacy    │
└─────────────────────┘
  gradient: pink→orange
```

### Screen 2: Create (`/ngl/create`)
```
┌─────────────────────┐
│  ‹ back             │
│                     │
│  Choose a           │
│  username            │
│                     │
│  ┌─@ ─────────────┐ │
│  │  username       │ │
│  └────────────────┘ │
│  ✓ available        │
│                     │
│  ┌─────────────┐    │
│  │  Continue    │    │
│  └─────────────┘    │
│                     │
└─────────────────────┘
```

### Screen 3: Dashboard PLAY
```
┌─────────────────────┐
│  PLAY  INBOX    ⚙️  │
│─────────────────────│
│  ┌─────────────────┐│
│  │  (profile pic)  ││
│  │                 ││
│  │  send me anon   ││
│  │  messages!      ││
│  │           🔄 🎲 ││
│  └─────────────────┘│
│                     │
│  Step 1: Copy link  │
│  ┌ 🔗 copy link ─┐ │
│                     │
│  Step 2: Share      │
│  ┌── Share! ──────┐ │
│                     │
└─────────────────────┘
```

### Screen 4: Dashboard INBOX
```
┌─────────────────────┐
│  PLAY  INBOX    ⚙️  │
│─────────────────────│
│                     │
│  Your inbox is      │
│  empty              │
│  Share your link!   │
│                     │
│  ┌──┐ ┌──┐ ┌──┐    │
│  │░░│ │░░│ │░░│    │
│  └──┘ └──┘ └──┘    │
│  ┌──┐ ┌──┐ ┌──┐    │
│  │░░│ │░░│ │░░│    │
│  └──┘ └──┘ └──┘    │
│                     │
│  ┌─ Get messages! ┐ │
└─────────────────────┘
```

### Screen 5: Send Message (`/ngl/q/username`)
```
┌─────────────────────┐
│  ‹                  │
│                     │
│  ┌─────────────────┐│
│  │ (pic) @username ││
│  │                 ││
│  │ send me anon    ││
│  │ messages!       ││
│  │                 ││
│  │ ┌─────────────┐ ││
│  │ │ Type here...│ ││
│  │ └─────────────┘ ││
│  │       🔒 anon  ││
│  └─────────────────┘│
│                     │
│  ┌──── Send! ────┐  │
│                     │
└─────────────────────┘
  gradient: pink→orange
```

### Screen 6: Sent!
```
┌─────────────────────┐
│  ‹                  │
│                     │
│                     │
│       ✅            │
│      Sent!          │
│                     │
│ 👇 278 friends just │
│ tapped the button 👇│
│                     │
│ ┌─────────────────┐ │
│ │ Get your own    │ │
│ │ messages!       │ │
│ └─────────────────┘ │
│                     │
│  Send another msg   │
│                     │
└─────────────────────┘
  gradient: pink→orange
```

---

## 🔁 Viral Loop Diagram

```
Creator makes account → Gets link → Shares on Story/WhatsApp
    ↓
50 friends see it → 15 open link → 8 send messages
    ↓
Creator checks inbox → Screenshots responses → Posts on Story
    ↓
Friends see screenshots → "I want this too!" → "Get your own messages!" CTA
    ↓
5 new creators → Each shares to their 50 friends → EXPONENTIAL
```

---

## ⚡ Build Order (What Comes After What)

```
Phase 1 (DB Schema) → Phase 2-7 (All APIs) → Phase 8 (Landing) → 
Phase 9 (Create) → Phase 12 (Send Page) → Phase 13 (Sent!) → 
Phase 10 (PLAY tab) → Phase 11 (INBOX tab) → Phase 14 (OG tags) → 
Phase 15-16 (Share + Prompts) → Phase 17-18 (Mobile + Desktop) → 
Phase 19 (Animations) → Phase 20 (Viral)
```

**Estimated files to create/edit:**
- `shared/schema.ts` — add 2 tables
- `server/routes/ngl.ts` — all API endpoints (~200 lines)
- `server/routes.ts` — register ngl routes
- `client/src/pages/NglLanding.tsx` — landing page
- `client/src/pages/NglCreate.tsx` — create username
- `client/src/pages/NglDashboard.tsx` — PLAY + INBOX tabs
- `client/src/pages/NglSend.tsx` — public send page + sent confirmation
- `client/src/App.tsx` — add 4 routes
- `client/src/pages/free-tools.tsx` — add tool card
- `client/index.html` — OG meta tags for NGL routes

---

## ✅ What Stays, What Goes

| Feature | Status |
|---------|--------|
| Anonymous খিস্তি (`/tools/khisti`) | **STAYS** — it's the global anonymous wall, separate product |
| Bong Board (deleted) | **GONE** — replaced by this NGL clone |
| FreeToolsCTA (deleted) | **GONE** — not needed |
| New: Bong NGL (`/ngl/*`) | **NEW** — full NGL clone, our main viral tool |
