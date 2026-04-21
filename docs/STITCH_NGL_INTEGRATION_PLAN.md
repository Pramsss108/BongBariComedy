# Stitch NGL Integration — Full Migration Plan

**Goal:** Transform the static Stitch HTML preview (`/ngl/stitch-preview`) into a fully functional NGL dashboard by wiring every real endpoint, then design a matching Stitch Inbox page. Once 100% functional and verified, the old `NglDashboard.tsx` will be retired.

**Rules:**
- The real NGL page (`/ngl/at/:username`) is **NEVER touched** until full integration is done and verified.
- Always reference the original `NglDashboard.tsx` for exact logic, state management, and edge cases.
- PRO badge/ribbon → only visible when `isPremium && premiumUntil > Date.now()`. Non-premium users see **"Get PRO"** CTA on the right side instead of the PRO pricing block.
- Every phase is **one commit** — small, testable, reversible.

---

## BATCH 1 — Foundation & Auth Shell (Phases 1–5)

### Phase 1: React Conversion & Route Wiring
- Convert `stitch-preview.html` into a proper React TSX component (`NglStitchDashboard.tsx`)
- Keep **every single Tailwind class, gold gradient, glass-card, glossy-effect** exactly as Stitch generated
- Replace raw HTML tags with JSX (self-closing tags, `className`, `htmlFor`, etc.)
- Import Inter font via CSS instead of inline `<style>` block
- Import Font Awesome via npm (`@fortawesome/react-fontawesome`) or keep CDN link
- Register route `/ngl/stitch-dashboard/:username` in `App.tsx` (parallel to old route)
- **Zero logic** — pure visual port, static text, nothing clickable

### Phase 2: Auth Gate & Session Bootstrap
- On mount, check `localStorage['ngl_session']` for `{ username, secretKeyHash }`
- If no session → redirect to `/ngl` (login/create page)
- If session exists → call `GET /api/ngl/check/:username` to validate user exists
- Show skeleton loader (glass-card shimmer placeholder) while auth resolves
- Wire `Logout` button → clear `localStorage['ngl_session']`, redirect to `/ngl`
- Store `username` in component state, replace hardcoded `@pramsss108` with `@{username}`

### Phase 3: Profile Data Fetch & Display
- Call `GET /api/ngl/u/:username/inbox` on mount (we extract user metadata from response headers/shape)
- Fetch user profile: username, photo, prompt, theme, phone, `isPremium`, `premiumUntil`
- Wire the **P avatar circle** → show actual profile photo if uploaded, else first-letter fallback
- Wire `@pramsss108` text → real `@{username}`
- Wire prompt text (`আমার সম্পর্কে anonymous কিছু বলো 👀`) → real `user.prompt`

### Phase 4: PRO vs Free Conditional Rendering
- **If `isPremium && premiumUntil > now`:**
  - Show PRO ribbon on left (gold gradient, "PRO" text)
  - Show "PRO" + "₹98/mo" on right side (current Stitch design)
  - Show PRO badge shimmer next to username
- **If NOT premium:**
  - Hide PRO ribbon entirely
  - Right side shows **"Get PRO"** CTA button (gold gradient, same `btn-gold` class)
  - Clicking "Get PRO" opens upgrade modal (same logic as original dashboard)
  - No PRO badge next to username
- Add subtle shimmer animation to PRO badge (CSS `@keyframes` — compositor-only, transform+opacity)

### Phase 5: Premium Upgrade Modal
- Port the upgrade modal from original `NglDashboard.tsx` (payment form)
- Requires verified phone to proceed (check `user.phoneVerified`)
- If phone not verified → show "Verify WhatsApp first" toast
- On successful upgrade → refresh user data, show PRO ribbon, toast "Welcome to PRO! 🎉"
- Modal uses same glass-card aesthetic (dark overlay + centered card + gold accent border)

---

## BATCH 2 — Core Interactive Features (Phases 6–10)

### Phase 6: Prompt Edit & Display
- Double-tap or click "Edit" button on prompt card → switch to edit mode
- Show `<textarea>` with current prompt, max 200 chars, char counter
- Save button calls `PUT /api/ngl/u/:username/prompt` with new text
- On success → update UI, exit edit mode, show toast
- Accent bar on prompt card changes color based on current theme

### Phase 7: AI Shuffle & Enhance
- Wire "AI Shuffle" button (dice icon) → `GET /api/ngl/prompts/random`
- Returns random prompt (AI-generated via Groq or static pool fallback)
- Auto-fills prompt card, user can accept or discard
- Wire "Enhance" button (not in current Stitch HTML, add as small sparkle icon)
- Calls `POST /api/ngl/prompts/enhance` → polishes grammar in 5 random styles
- Both buttons get loading spinner states (gold shimmer pulse)

### Phase 8: Copy Link & Share Flow
- Wire "COPY" button on shareable link card
- Copies `bongbari.com/ngl/q/{username}` to clipboard
- Show checkmark + "Copied!" feedback for 2s, then revert
- Link text updates dynamically with actual username

### Phase 9: Share Cards — WhatsApp, IG Story, Story Card, More
- **WhatsApp** → `window.open()` with WhatsApp share URL (pre-filled text + link)
- **IG Story** → generate story image (canvas-based, same as original), trigger download/share
- **Story Card** → open Story Card Generator overlay (Phase 19–20)
- **More** → Web Share API (`navigator.share()`) with fallback to copy-link
- Each card keeps its glass-card + bottom-glow color effect from Stitch

### Phase 10: WhatsApp Phone Verification (OTP Flow)
- Wire "Start" button on WhatsApp Verify card
- Click → expand card inline to show phone input (country code + number)
- Submit → `POST /api/ngl/otp/send` (60s cooldown enforced)
- Show 6-digit OTP input field (auto-focus, auto-advance)
- Submit OTP → `POST /api/ngl/otp/verify` (max 5 attempts)
- On success → update card to show "✓ Verified" with green accent
- On failure → shake animation, show remaining attempts
- Reset option → `POST /api/ngl/otp/reset` (requires confirmation)

---

## BATCH 3 — Inbox Page (Stitch Design) (Phases 11–15)

### Phase 11: Design Inbox Page via Stitch
- Use `mcp_stitch_edit_screens` or `generate_screen_from_text` to create Inbox screen
- **Design brief:** Same dark glassmorphism aesthetic (dashboard-bg #121212, glass-cards, gold accents)
- **Layout:** Top nav (same as Home — Back, Home/Inbox tabs, user menu), message list below
- **Inbox tab active** (gold highlight), Home tab inactive (gray)
- **Message card design:** Glass card, blurred text (tap to reveal), timestamp, sender hint pills, reaction row, pin/block/delete actions
- **Empty state:** Centered illustration + "No messages yet — share your link!" CTA
- Download raw Stitch HTML → convert to React TSX (same Phase 1 approach)

### Phase 12: Inbox Data Fetch & Message List
- Call `GET /api/ngl/u/:username/inbox` with pagination params
- Sort: pinned messages first (descending), then newest first
- Render each message as a glass-card with:
  - Blurred text overlay (CSS `filter: blur(6px)` → remove on tap)
  - Timestamp (relative: "2m ago", "3h ago", "Yesterday")
  - Pin indicator (gold pin icon if pinned)
- Store revealed message IDs in `localStorage` (persist across refreshes)
- Show message count badge on Inbox tab

### Phase 13: Message Interactions — Reveal, React, Pin
- **Tap to reveal** → remove blur, store in localStorage set
- **Reactions** → 5 emoji buttons below message (like ❤️, insight 💡, boost 🚀, focus 🎯, star ⭐)
  - Call `PUT /api/ngl/u/:username/message/:id/react` with reaction type
  - Active reaction highlighted with gold glow
  - Tap same reaction to remove
- **Pin** → gold pin icon, calls `PUT /api/ngl/u/:username/message/:id/pin`
  - Max 3 pinned — show toast if limit reached
  - Pinned messages float to top with subtle gold border

### Phase 14: Message Actions — Block & Delete
- **Block sender** → `POST /api/ngl/u/:username/message/:id/block`
  - Confirmation modal: "Block this sender? They won't know."
  - On confirm → message fades out, sender fingerprint blocked
  - Toast: "Sender blocked silently"
- **Delete message** → `DELETE /api/ngl/u/:username/message/:id`
  - Confirmation: "Delete this message permanently?"
  - On confirm → slide-out animation, removed from list
  - Toast: "Message deleted"
- Both actions use glass-card modals with gold/red accent buttons

### Phase 15: Sender Hints (Intel Pills)
- Below each message, show sender hint pills (small glass badges)
- **Free users see 4 hints:** Country flag + name, device type (📱/💻), language, timezone
- **PRO users see all 17 hints:** + browser, OS, ISP, screen size, battery %, dark mode, local time, referrer, connection type, geolocation (city/region)
- If free user → show blurred extra hints with lock icon + "PRO" label
- Tapping locked hints → show PRO FOMO card (upsell CTA)
- Hints styled as tiny glass pills with subtle colored borders

---

## BATCH 4 — Advanced Features (Phases 16–20)

### Phase 16: Theme Picker
- Port theme picker from original dashboard
- 10 themes: 7 free + 3 PRO-locked
- **Free themes:** Default Dark, Midnight Blue, Forest Green, Sunset Orange, Ocean Teal, Lavender, Slate
- **PRO themes:** Champagne Gold (current Stitch), Neon Cyber, Rose Quartz
- Theme picker opens as bottom sheet (mobile) or side panel (desktop)
- Selecting a PRO theme without premium → shows PRO upsell
- Save: `PUT /api/ngl/u/:username/theme`
- Theme affects: accent colors, card borders, prompt bar, share button glows

### Phase 17: Profile Photo Upload
- Tap avatar circle → file picker (max 150KB, image only)
- Preview in circle before confirming
- Upload: `PUT /api/ngl/u/:username/photo` (base64 body)
- Remove: `DELETE /api/ngl/u/:username/photo`
- Show upload progress indicator (gold ring animation around avatar)
- Fallback: first letter of username in avatar circle

### Phase 18: Language Toggle (Bengali ↔ English)
- Wire the "EN" pill in top nav → toggle between `en` and `bn`
- All static text has bilingual map (same as original dashboard)
- Affects: prompt placeholder, UI labels, toasts, modal text, share text
- Store preference in `localStorage['ngl_lang']`
- Dropdown shows: "EN 🇬🇧" / "বাং 🇧🇩"

### Phase 19: Story Card Generator — Canvas
- Wire "Story Card" share button → opens full-screen overlay
- Canvas (1080×1920) with:
  - Background gradient (matches current theme)
  - Avatar (centered, rounded)
  - Username + PRO badge (if applicable)
  - Prompt text (styled)
  - Message count stat
  - QR code (pointing to share link)
  - "bongbari.com" watermark
- 8 color palette options (thumbnails at bottom)
- Real-time preview updates as user changes options

### Phase 20: Story Card Generator — Export & Share
- "Download" button → export canvas as PNG (1080×1920)
- "Share" button → Web Share API with image blob
  - Fallback: download + "Open Instagram/WhatsApp to share"
- Customize screen: edit display text, toggle QR visibility
- OG meta customization: `PUT /api/ngl/u/:username/og` (title, description)
- Loading state during export (gold progress bar)

---

## BATCH 5 — Real-Time, Data, & Hardening (Phases 21–25)

### Phase 21: Real-Time Inbox Updates
- Auto-refresh inbox every 10 seconds (when tab is visible)
- Use `document.visibilityState` to pause when hidden
- New message detection → show toast "New message!" with soft ping sound
- Sound toggle button (mute/unmute) stored in `localStorage['ngl_sound']`
- Respect `prefers-reduced-motion` — skip animations if set

### Phase 22: Pull-to-Refresh (Mobile)
- iOS-style pull-down gesture on inbox list
- Show gold spinner indicator while refreshing
- Haptic feedback on pull threshold (if `navigator.vibrate` available)
- Desktop: show "Refresh" button instead
- Debounce: minimum 2s between refreshes

### Phase 23: Search & Filter (Inbox)
- Show search bar only when inbox has ≥4 messages
- Client-side text filter (case-insensitive substring match on message content)
- Filter updates list in real-time as user types
- Clear button (X) to reset filter
- Show "No results" empty state if filter matches nothing
- Search bar: glass-card style with gold focus ring

### Phase 24: Data Export (JSON)
- "Export" option in inbox menu → downloads full inbox as JSON
- File: `ngl-inbox-{username}-{date}.json`
- Contains: all messages, timestamps, sender hints, reactions, pin status
- Triggered via `Blob` + `URL.createObjectURL` + anchor click
- Toast: "Inbox exported! Check your downloads."

### Phase 25: Offline Mode & Error Handling
- Detect `navigator.onLine` status
- Offline → show red banner at top: "You're offline — showing cached data"
- Cache last-known inbox in `localStorage` for offline viewing
- API errors → auto-retry with exponential backoff (2s → 4s → 8s, max 3 retries)
- Network recovery → auto-refresh inbox, remove offline banner
- All error toasts use glass-card style with red accent

---

## BATCH 6 — Polish & Cutover (Phases 26–30)

### Phase 26: Streak & Stats Display
- Show streak badge next to username (🔥 X days)
- Streak = consecutive days with at least 1 message received
- Display total message count on profile card
- Stats fetched with profile data, updated on each inbox refresh
- Streak badge: small gold-bordered pill, subtle pulse animation on milestone days

### Phase 27: Delete Account (Banish)
- Wire the floating red trash icon (bottom-right in Stitch design)
- Click → 2-step confirmation modal:
  1. "Are you sure? This deletes everything."
  2. "Type your username to confirm:" (input must match exactly)
- Calls `DELETE /api/ngl/u/:username`
- On success → clear all localStorage, redirect to `/ngl`, toast "Account deleted"
- Modal: dark glass overlay, red accent border, gold "Cancel" / red "Delete" buttons

### Phase 28: GA4 Analytics Integration
- Track page views (Home tab, Inbox tab)
- Track events: prompt edit, share click, message reveal, theme change, OTP verify
- Performance monitoring: log if page load > 500ms
- User properties: isPremium, theme, language, messageCount
- All via `gtag()` — no extra SDK

### Phase 29: Navigation — Home ↔ Inbox Tab Switching
- Wire Home/Inbox tab buttons in top nav
- **Home tab** (gold active) → shows current Stitch dashboard content
- **Inbox tab** (gray → gold when active) → shows inbox message list
- Tab switch is client-side state (no route change needed, or use sub-routes)
- Preserve scroll position when switching tabs
- Message count badge on Inbox tab (red dot or number)
- Smooth crossfade transition between tabs (opacity only, compositor-safe)

### Phase 30: Final QA & Cutover Readiness
- Full end-to-end test checklist:
  - [ ] Create account → lands on Stitch dashboard
  - [ ] Profile photo upload/remove works
  - [ ] Prompt edit, shuffle, enhance all functional
  - [ ] Copy link + all 4 share buttons work
  - [ ] WhatsApp OTP send/verify/reset flow complete
  - [ ] PRO upgrade modal + post-upgrade badge appears
  - [ ] Free users see "Get PRO" CTA (no ribbon)
  - [ ] Inbox: messages load, blur-reveal, reactions, pin, block, delete
  - [ ] Sender hints: 4 free, 17 PRO, FOMO card for locked hints
  - [ ] Theme picker: 7 free + 3 PRO themes apply correctly
  - [ ] Story Card: canvas render, palette switch, download, share
  - [ ] Language toggle (EN ↔ বাং) updates all text
  - [ ] Search, export, pull-to-refresh, auto-refresh all functional
  - [ ] Offline mode shows cached data + red banner
  - [ ] Delete account 2-step flow works
  - [ ] GA4 events firing correctly
  - [ ] Mobile responsive: all cards stack, touch targets ≥44px
  - [ ] No console errors, no mixed-content warnings
  - [ ] Performance: 60 FPS scrolling, <1s initial load
- Once all checks pass → swap routes:
  - `/ngl/at/:username` → `NglStitchDashboard.tsx` (new)
  - Old `NglDashboard.tsx` → archived to `NglDashboard.legacy.tsx`
- Deploy via `npm run deploy:safe`

---

## Endpoint Integration Reference

| # | Endpoint | Method | Auth | Integrates In |
|---|----------|--------|------|---------------|
| 1 | `/api/ngl/create` | POST | No | Login page (existing) |
| 2 | `/api/ngl/login` | POST | No | Login page (existing) |
| 3 | `/api/ngl/check/:username` | GET | No | Phase 2 (auth gate) |
| 4 | `/api/ngl/u/:username/inbox` | GET | Yes | Phase 12 (inbox) |
| 5 | `/api/ngl/u/:username/send` | POST | No | Public Q page (existing) |
| 6 | `/api/ngl/u/:username/prompt` | PUT | Yes | Phase 6 (prompt edit) |
| 7 | `/api/ngl/u/:username/theme` | PUT | Yes | Phase 16 (theme picker) |
| 8 | `/api/ngl/u/:username/photo` | PUT | Yes | Phase 17 (photo upload) |
| 9 | `/api/ngl/u/:username/photo` | DELETE | Yes | Phase 17 (photo remove) |
| 10 | `/api/ngl/u/:username/og` | PUT | Yes | Phase 20 (OG customize) |
| 11 | `/api/ngl/u/:username/message/:id` | DELETE | Yes | Phase 14 (delete msg) |
| 12 | `/api/ngl/u/:username/message/:id/pin` | PUT | Yes | Phase 13 (pin/unpin) |
| 13 | `/api/ngl/u/:username/message/:id/block` | POST | Yes | Phase 14 (block sender) |
| 14 | `/api/ngl/u/:username/message/:id/react` | PUT | Yes | Phase 13 (reactions) |
| 15 | `/api/ngl/prompts/random` | GET | No | Phase 7 (AI shuffle) |
| 16 | `/api/ngl/prompts/enhance` | POST | Yes | Phase 7 (enhance) |
| 17 | `/api/ngl/otp/send` | POST | Yes | Phase 10 (OTP send) |
| 18 | `/api/ngl/otp/verify` | POST | Yes | Phase 10 (OTP verify) |
| 19 | `/api/ngl/otp/reset` | POST | Yes | Phase 10 (OTP reset) |
| 20 | `/api/ngl/u/:username` | DELETE | Yes | Phase 27 (delete acct) |
| 21 | `/api/ngl/stats` | GET | No | Phase 26 (public stats) |
| 22 | `/api/ngl/og/:username` | GET | No | Phase 20 (OG page) |
| 23 | `/api/ngl/og/:username/image` | GET | No | Phase 20 (OG image) |

---

## PRO vs Free — Visual Diff

```
┌─────────────────────────────────────────────┐
│  PRO USER (isPremium && premiumUntil > now)  │
├─────────────────────────────────────────────┤
│  ┌──────┐   ┌──┐                            │
│  │ PRO  │   │P │  @username  PRO✦    PRO    │
│  │ribbon│   └──┘                    ₹98/mo  │
│  └──────┘                                   │
│  • All 17 sender hints visible              │
│  • 3 PRO themes unlocked                    │
│  • PRO badge shimmer on username            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  FREE USER (!isPremium)                     │
├─────────────────────────────────────────────┤
│             ┌──┐                            │
│             │P │  @username      ┌────────┐ │
│             └──┘                 │Get PRO │ │
│                                  └────────┘ │
│  • 4 basic sender hints only                │
│  • 7 free themes, PRO themes locked         │
│  • No PRO badge, no ribbon                  │
│  • FOMO card in inbox for hint upsell       │
└─────────────────────────────────────────────┘
```

---

## Design System (Locked from Stitch)

These values are **LOCKED** — extracted from the Stitch HTML. Do NOT change them.

| Token | Value | Usage |
|-------|-------|-------|
| `dashboard-bg` | `#121212` | Page background |
| `body-bg` | `#0f0f0f` | Body background |
| `card-bg` | `rgba(255,255,255,0.05)` | Glass card fill |
| `card-border` | `rgba(255,255,255,0.1)` | Glass card border |
| `gold-primary` | `#D4AF37` | Accent text, icons |
| `gold-gradient` | `135deg, #F9D423 → #D4AF37` | Buttons, ribbons |
| `btn-gold-bg` | `180deg, #F8DB82 → #CFA144` | CTA buttons |
| `btn-gold-shadow` | `rgba(212,175,55,0.3)` | Button glow |
| `glass-blur` | `blur(20px)` | Card backdrop |
| `glass-shine` | `135deg, rgba(255,255,255,0.1) → 0` | Card glossy overlay |
| `font-family` | `'Inter', sans-serif` | All text |
| `border-radius-card` | `1.5rem` (24px) | Standard cards |
| `border-radius-pill` | `9999px` (full) | Buttons, tabs |
| `border-radius-large` | `2.5rem` (40px) | Prompt card |
| `green-glow` | `rgba(34,197,94,0.25)` | WhatsApp card |
| `pink-glow` | `rgba(236,72,153,0.25)` | IG Story card |
| `purple-glow` | `rgba(168,85,247,0.25)` | Story Card card |
| `blue-glow` | `rgba(59,130,246,0.25)` | More card |

---

## Execution Rules

1. **One phase = one commit.** Message format: `feat(stitch-ngl): Phase X — description`
2. **Always reference original** `NglDashboard.tsx` for exact logic before implementing.
3. **Never invent new endpoints** — use only the 23 listed above.
4. **Never touch** `/ngl/at/:username` route or `NglDashboard.tsx` until Phase 30 cutover.
5. **Performance:** Only animate `transform` and `opacity`. No `filter` in animations. `once: true` on all `whileInView`.
6. **Mobile first:** All cards must stack vertically on `<768px`. Touch targets ≥ 44px.
7. **Sound/haptics:** Off by default, user toggles on. Respect `prefers-reduced-motion`.
8. **Test after each phase:** `npm run check` must pass. Manual verification at `localhost:5173`.
