# Bong NGL — 30-Phase Enhancement Plan

> Created: 2 April 2026 | Last updated: 16 April 2026 | Target: Kill NGL.link

> ⚡ **ACTIVE TRACKER**: `docs/NGL_40_PHASE_PLAN.md` (Phases 32-40 remaining — ShareModal polish, i18n, QA, deploy)
> 📋 **FEATURE TRACKER**: `NGL_ENHANCEMENT_TRACKER.md` (features 1-29 all ✅ done)
> This file = strategic overview. Statuses below updated April 16 2026.

---

## 📊 Current State — What's Done vs What's Missing

### Side-by-Side: DONE ✅ vs NEEDED ❌

| Area | What Exists (✅) | What's Missing / Broken (❌) |
|------|-----------------|------------------------------|
| **Auth** | Secret key login + 6-digit PIN ✅ | ❌ No "remember me" tagline shown to user |
| **UI Readability** | ✅ All text-[10px] fixed (Phase 21) | ❌ Minor: some mobile edge cases |
| **Dice/AI** | ✅ Flash border + spring animation + toast (Phase 23) | — |
| **Connection** | ✅ Auto-retry (3x backoff) + retry button + offline detect (Phase 24) | — |
| **Profile** | ✅ Photo upload (Phase 26), 7 custom themes (Phase 30) | — |
| **Sharing** | ✅ Story card 8 palettes + QR (Phase 28), ShareModal tutorials (Phase 38) | ❌ No 6+6 share templates yet (docs Phase 33) |
| **OG Preview** | ✅ Dynamic OG card per-user (Phase 27) + custom ogTitle/ogDescription (Phase 40) | — |
| **Inbox** | Messages, delete, confetti, reactions ✅ (Phase 31) | ❌ No pagination (Phase 37). ❌ No pinning (Phase 33). Memory leak on rate maps |
| **Sender Hints** | ✅ Full advanced sender intelligence: lang, tz, device, browser, OS, city, ISP, battery, dark mode (Phase 32+40) | — |
| **Safety** | XSS sanitization, rate limiting | ❌ No bad-word filter (Phase 35). ❌ No block/report (Phase 47) |
| **PWA** | Pure web app | ❌ No service worker (Phase 36). ❌ No push notifications (Phase 46) |
| **Sounds** | — | ❌ No sound effects (Phase 29) |
| **Personalization** | ✅ 7 themes, PIN, Bengali toggle, onboarding tutorial (Phase 39) | — |
| **Streaks** | ✅ Streak counter (Phase 42) | — |
| **Security** | ✅ X-NGL-Key header (Phase 25) — key NOT in URL anymore | — |
| **Backend** | ✅ `pinHash`, `photo`, `theme`, `reaction`, `senderLang/Tz/Device/…`, `streakDays`, `phone/OTP`, `ogTitle/ogDescription` columns all exist | ❌ No `pinned` on messages. ❌ No `isPremium` |

---

## 🎯 30 Phases — Detailed Plan

### BATCH 1: Critical UX Fixes (Phases 21-25) — ✅ ALL DONE

These fix **broken UX** that makes the app unusable/annoying. Must be done before any new features.

---

#### Phase 21: Readability Overhaul — ✅ DONE (Apr 2026)
**Problem**: `text-[10px]` used 17× in Dashboard, Send page has microscopic labels. Desktop and mobile both suffer.

| File | Change | Before → After |
|------|--------|----------------|
| `NglDashboard.tsx` | Step labels | `text-[10px]` → `text-xs` (12px) |
| `NglDashboard.tsx` | Timestamps on messages | `text-[10px]` → `text-xs` |
| `NglDashboard.tsx` | Key warning text | `text-[10px]` → `text-xs` |
| `NglDashboard.tsx` | Secret key code | `text-[10px]` mono → `text-xs` mono |
| `NglDashboard.tsx` | Banish text | `text-[10px]` → `text-xs` |
| `NglDashboard.tsx` | Username subtitle | `text-[10px]` → `text-xs` |
| `NglDashboard.tsx` | Prompt text | `text-base` → `text-lg` |
| `NglDashboard.tsx` | @username | `text-sm` → `text-base` |
| `NglDashboard.tsx` | Message text | `text-sm` → `text-base` |
| `NglDashboard.tsx` | Share link text | `text-xs` → `text-sm` |
| `NglDashboard.tsx` | Tab bar text | `text-sm` → `text-base` |
| `NglDashboard.tsx` | Copy/share buttons | `text-sm` → `text-base` |
| `NglSend.tsx` | "bong ngl" subtitle | `text-[10px]` → `text-xs` |
| `NglSend.tsx` | Character counter | `text-[11px]` → `text-xs` |
| `NglCreate.tsx` | Back button | `text-xs` → `text-sm` |
| `NglCreate.tsx` | Switch account link | `text-xs` → `text-sm` |

**Effort**: Easy (text size changes only) | **Impact**: Critical — everything becomes readable | **Risk**: Must test mobile doesn't overflow

---

#### Phase 22: PIN Login System (+ Device Auto-Login) — ✅ DONE (Apr 2026)
**Problem**: 64-char hex secret key is impossible to remember or type on phone.

**Solution**: Dual auth — 6-digit PIN (user-chosen) + device cookie (auto-login)

| Component | Change |
|-----------|--------|
| **DB Schema** (`shared/schema.ts`) | Add `pinHash varchar(64)` to `ngl_users` table |
| **Create endpoint** (`ngl.ts`) | Accept optional `pin` (6 digits) at creation. Hash and store. |
| **Login endpoint** (`ngl.ts`) | Accept either `secretKey` OR `pin` for auth |
| **Create page** (`NglCreate.tsx`) | Add optional PIN input (6-digit, numeric keypad). Show: "Choose a 6-digit PIN for easy login" |
| **Login page** (`NglCreate.tsx`) | Replace "paste secret key" with "Enter your 6-digit PIN". Add fallback link: "Use secret key instead" |
| **Dashboard** (`NglDashboard.tsx`) | Show PIN (masked `••••• `) instead of 64-char hex in secret key section. Keep hex as "Advanced: full key" |
| **Auto-login** (`NglDashboard.tsx`) | Current `localStorage('bong_ngl')` already does this — it IS the device auto-login. Just make it clear via i18n. |

**Login Flow After Phase 22:**
1. **Same device**: Auto-login via localStorage (cookie equivalent) — zero friction
2. **New device**: Username + 6-digit PIN → done in 3 seconds
3. **Lost PIN**: Use full secret key (backup) — rare path

**Effort**: Medium (schema change + 2 endpoints + 2 UI changes) | **Impact**: Critical — removes #1 UX blocker

---

#### Phase 23: Dice Visual Feedback — ✅ DONE (Apr 2026)
**Problem**: When user clicks 🎲, the prompt changes silently. User thinks nothing happened.

| Change | Detail |
|--------|--------|
| Flash animation | Prompt card flashes green border + glow for 1s when dice updates |
| Toast notification | Brief toast slides in: "✨ New prompt!" — auto-dismiss 2s |
| Prompt text animation | New prompt text fades in with `scale(0.95) → scale(1)` spring animation |
| Button feedback | 🎲 bounces on click (spring animation), changes to ✨ while loading |
| Sound (optional) | Subtle "pop" sound on prompt change (add in Phase 29 with other sounds) |

**Effort**: Easy (animations only, no backend) | **Impact**: High — makes the feature feel alive

---

#### Phase 24: Connection Error UX — ✅ DONE (Apr 2026)
**Problem**: "Connection error" banner with no way to fix it. User stuck.

| Change | Detail |
|--------|--------|
| Retry button | Add "Tap to retry 🔄" button inside error banner |
| Auto-retry | 3 retries with exponential backoff (2s, 4s, 8s) before showing error |
| Offline detection | Check `navigator.onLine` — show "You're offline 📡" instead of generic error |
| Error dismissal | Error banner auto-dismisses when connection recovers |
| Loading state | Show skeleton cards while loading inbox (not just spinner) |

**Effort**: Easy (client-side only) | **Impact**: High — fixes the most visible bug

---

#### Phase 25: Secret Key → Header (Security Fix) — ✅ DONE (Apr 2026)
**Problem**: `?key=xxx` in URL appears in browser history, server access logs, referrer headers.

| Change | Detail |
|--------|--------|
| Client | Move `?key=` to `X-NGL-Key` header in all fetch calls |
| Server | Accept key from header `req.headers['x-ngl-key']` OR query param (backward compat) |
| Migration | Keep `?key=` working for 30 days, then remove |

**Effort**: Easy (find-replace in 4 fetch calls + 4 endpoint handlers) | **Impact**: Medium — security improvement

---

### BATCH 2: Visual Polish (Phases 26-30) — ✅ ALL DONE except Phase 29 (Sounds)

Make the app **beautiful** and **share-worthy**.

---

#### Phase 26: Profile Photos — ✅ DONE (Apr 2026)
Add `photo` column (base64, max 100KB compressed) to `ngl_users`. Camera/gallery upload on dashboard. Show photo in:
- Dashboard profile card
- Send page profile header
- OG preview card

**Files**: `schema.ts`, `ngl.ts` (2 new endpoints: PUT + DELETE photo), `NglDashboard.tsx` (upload UI), `NglSend.tsx` (display)

---

#### Phase 27: Dynamic OG Card — ✅ DONE (Apr 2026)
Server-side canvas (Sharp/Canvas library) generates per-user gradient image with username + prompt text. Replaces static broken `og-ngl.png`.

**Files**: `ngl.ts` (modify `/og/:username`), add `sharp` or `@napi-rs/canvas` dep

---

#### Phase 28: Share-to-Story Card — ✅ DONE (Apr 2026) — 8 palettes + QR
"Download Card 📸" button on dashboard generates a styled PNG image (gradient bg, username, prompt, QR code). Users save and post directly to IG/WA stories.

**Files**: `NglDashboard.tsx` (canvas-to-PNG generation), QR library

---

#### Phase 29: Sound Effects — ❌ NOT DONE
- Notification sound when new message arrives (inbox auto-refresh detects new count)
- Subtle "pop" on dice roll
- "Whoosh" on message send
- Mute toggle in settings

**Files**: `NglDashboard.tsx`, `NglSend.tsx`, add sound assets to `client/public/`

---

#### Phase 30: Custom Themes — ✅ DONE (Apr 2026) — 7 gradients: OG/Pink/Ocean/Forest/Galaxy/Gold/Dark
Let users pick their card color gradient from 7 presets. Stored in `ngl_users.theme` column. Applied on send page and profile card.

**Files**: `schema.ts`, `ngl.ts`, `NglDashboard.tsx` (theme picker), `NglSend.tsx` (apply theme)

---

### BATCH 3: Engagement Features (Phases 31-35) — PARTIAL

Make users **come back** and **share more**.

---

#### Phase 31: Message Reactions — ✅ DONE (Apr 2026)
Inbox owner can react to messages with emoji (❤️ 😂 🔥 💀 🫣). Reaction stored in DB. Sender never sees it — just for the receiver's satisfaction.

**Files**: `schema.ts` (add `reaction` column to `ngl_messages`), `ngl.ts` (PUT reaction endpoint), `NglDashboard.tsx` (reaction picker on each card)

---

#### Phase 32: Free Sender Hints — ✅ DONE (Apr 2026) — UPGRADED: includes browser, OS, city, ISP, battery, dark mode, referrer, screen res, local time
Show sender's browser language + general timezone region on each message. Not identity — just metadata. Free engagement hook (NGL charges $10/week for this).

**Files**: `ngl.ts` (capture `Accept-Language` + timezone header on send), `schema.ts` (add `senderLang`, `senderTz` to `ngl_messages`), `NglDashboard.tsx` (display hints)

---

#### Phase 33: Message Pinning — ❌ NOT DONE
Pin favorite messages to top of inbox. Max 3 pinned. Pinned messages have gold border + ⭐ indicator.

**Files**: `schema.ts` (add `pinned boolean` to `ngl_messages`), `ngl.ts` (PUT pin endpoint), `NglDashboard.tsx` (pin toggle + sorted display)

---

#### Phase 34: Landing Page Stats — ❌ NOT DONE (fake client-side counter exists, real API counter not built)
Live counter on landing page: "🔥 X messages sent anonymously!" Fetches from `/api/ngl/stats` endpoint (already exists). Animated counter with spring.

**Files**: `NglLanding.tsx` (add stats display + fetch)

---

#### Phase 35: Block Words Filter — ❌ NOT DONE
Server-side bad word filter on incoming messages. Configurable word list. Auto-rejects messages containing slurs/hate speech. Shows sender a soft error: "This message couldn't be delivered."

**Files**: `ngl.ts` (add filter in `/send` endpoint), create `server/ngl-blocked-words.ts` word list

> ⚠️ Note: Phase 35 in schema.ts refers to "WhatsApp OTP" (separate feature, ✅ DONE on backend, ⚠️ UI pending)

---

### BATCH 4: Platform Features (Phases 36-40) — PARTIAL (38, 39, 40 DONE)

Make it feel like a **real app**, not just a webpage.

---

#### Phase 36: PWA Support — ❌ NOT DONE
Service worker + `manifest.json` for "Add to Home Screen". Custom app icon, splash screen, theme color matching NGL gradient.

**Files**: `client/public/manifest.json`, `client/public/sw.js`, `client/index.html` (manifest link)

---

#### Phase 37: Inbox Pagination — ❌ NOT DONE (known issue — fetches all messages, slow at 500+)
Replace "fetch all messages" with paginated API: `GET /inbox?key=x&page=1&limit=20`. Infinite scroll on frontend. Skeleton loading for new pages.

**Files**: `ngl.ts` (modify inbox endpoint), `NglDashboard.tsx` (infinite scroll + pagination state)

---

#### Phase 38: QR Code Sharing — ✅ DONE (Apr 2026) — QR included in Story Card generator (8 palettes)
Generate QR code of the share link. Displayed on dashboard, downloadable as PNG. Great for in-person sharing at college/school.

**Files**: `NglDashboard.tsx` (add QR section), add `qrcode` npm package

---

#### Phase 39: Onboarding Tutorial — ✅ DONE (Apr 2026) — 8-slide IG/WA/FB share tutorial in ShareModal
First-time user sees a 3-step animated tutorial overlay after creating account:
1. "This is your link — share it!" (highlight link)
2. "Messages appear here" (highlight inbox tab)
3. "Roll the dice for AI prompts!" (highlight dice button)

**Files**: `NglDashboard.tsx` (add tutorial overlay component + `localStorage('ngl_onboarded')` flag)

---

#### Phase 40: Advanced Sender Intelligence + OG Meta — ✅ DONE (Apr 2026)
- Custom `ogTitle` + `ogDescription` per user (DB + UI) ✅
- Advanced sender data: browser, OS, city, region, country, ISP, screen res, connection type, battery, dark mode, referrer, local time ✅

> ⚠️ Rate limit cleanup + inbox pagination are still pending (see Phase 37 + Known Issues in tracker)

**Files**: `ngl.ts`, `schema.ts`, `NglDashboard.tsx`

---

### BATCH 5: Competitive Edge (Phases 41-45) — PARTIAL (Phase 42 DONE)

Features that **no competitor has**.

---

#### Phase 41: Anonymous Polls — ❌ NOT DONE
Profile owner can create a poll (2-4 options) that anonymous visitors vote on. Results visible on dashboard. Example: "Rate my vibe? 🔥 / 💀 / 😂 / 🫣"

**Files**: New `ngl_polls` table, 3 new endpoints, small UI addition to Dashboard + Send page

---

#### Phase 42: Streak Counter — ✅ DONE (Apr 2026)
Track how many consecutive days the user received at least 1 message. Show "🔥 5-day streak!" on profile. Motivates daily sharing.

**Files**: `schema.ts` (`streakDays` + `lastMessageDay` columns exist), `ngl.ts` (update on message receive), `NglDashboard.tsx` (display)

---

#### Phase 43: AI Reply Suggestions — ❌ NOT DONE
When viewing a message in inbox, show 3 AI-generated reply suggestions (via Groq). User can copy a reply and use it in real life. "Here's what you could say back..."

**Files**: `ngl.ts` (new endpoint `/suggest-replies`), `NglDashboard.tsx` (reply suggestions UI on each message card)

---

#### Phase 44: Scheduled Prompts — ❌ NOT DONE
User can schedule prompt changes: "Change my prompt to 'X' at 9 PM". Server cron job applies scheduled changes.

**Files**: New `ngl_scheduled_prompts` table, 2 endpoints, cron job in server startup, Dashboard scheduling UI

---

#### Phase 45: Analytics Dashboard — ❌ NOT DONE
Simple stats panel for the user: messages per day chart, busiest hour, most used emoji by senders, total message count over time.

**Files**: `ngl.ts` (analytics endpoint aggregating message data), `NglDashboard.tsx` (new STATS tab with charts)

---

### BATCH 6: Scale & Polish (Phases 46-50) — ❌ ALL PENDING

Final polish for a **production-grade product**.

---

#### Phase 46: Web Push Notifications — ❌ NOT DONE
Push notification when new message arrives. Uses browser Push API + VAPID keys. Permission prompt on first inbox visit.

**Files**: Service worker update, `ngl.ts` (web-push send on new message), `NglDashboard.tsx` (permission request)

---

#### Phase 47: Report/Block System — ❌ NOT DONE
"Report this message" button on each inbox card. After 3+ reports from different users, auto-flag the sender IP. Block list per user.

**Files**: New `ngl_reports` table, `ngl.ts` (report endpoint + IP blocking logic), `NglDashboard.tsx` (report button)

---

#### Phase 48: Multi-Language Expansion (Hindi/Hinglish) — ❌ NOT DONE
Add Hindi, Hinglish support alongside Bengali/English. Auto-detect Hindi users.

**Files**: `NglLang.tsx` (add `hi` translations), update all pages

---

#### Phase 49: Message Search — ❌ NOT DONE
Search inbox messages by keyword. Client-side filtering for small inboxes, server-side for large ones.

**Files**: `NglDashboard.tsx` (search bar + filter), `ngl.ts` (optional server search endpoint)

---

#### Phase 50: Export Data (GDPR Compliance) — ❌ NOT DONE
"Download my data" button — exports all messages as JSON/CSV. Also useful as a memory keepsake.

**Files**: `ngl.ts` (export endpoint), `NglDashboard.tsx` (download button)

---

## ⚡ Execution Batches — How Many Phases Per Session?

Based on Claude Opus capacity and code complexity:

| Batch | Phases | Count | Type | Estimated Complexity | Can Do At Once? |
|-------|--------|-------|------|---------------------|-----------------|
| **Batch 1** | 21-25 | 5 phases | Bug fixes + UX | Low-Medium per phase | **YES — all 5 at once** (mostly text/CSS changes + 1 DB migration) |
| **Batch 2** | 26-30 | 5 phases | Visual features | Medium per phase | **3 at once** (26+27+28), then (29+30) |
| **Batch 3** | 31-35 | 5 phases | Engagement | Medium per phase | **3 at once** (31+32+33), then (34+35) |
| **Batch 4** | 36-40 | 5 phases | Platform | Medium-High per phase | **2-3 at once** (36+37+38), then (39+40) |
| **Batch 5** | 41-45 | 5 phases | Competitive | High per phase (new tables, new endpoints, new UI) | **2 at once** (41+42), (43+44), (45) |
| **Batch 6** | 46-50 | 5 phases | Scale/Polish | Medium-High per phase | **2-3 at once** (46+47), (48+49+50) |

### Recommended Execution Order:

```
Session 1: Batch 1 — Phases 21-25 (ALL 5) ← readability + PIN + dice + error + security
Session 2: Batch 2a — Phases 26-28 (3) ← photos + OG card + story card
Session 3: Batch 2b + 3a — Phases 29-30 + 31-33 (5) ← sounds + themes + reactions + hints + pins
Session 4: Batch 3b + 4a — Phases 34-35 + 36-38 (5) ← stats + filter + PWA + pagination + QR
Session 5: Batch 4b + 5a — Phases 39-40 + 41-42 (4) ← onboarding + cleanup + polls + streaks
Session 6: Batch 5b — Phases 43-45 (3) ← AI replies + scheduling + analytics
Session 7: Batch 6 — Phases 46-50 (5) ← push + report + Hindi + search + export
```

**Total: 7 sessions to complete all 30 phases (21-50)**

---

## 📁 Files That Need Changes Per Phase

| Phase | Files Modified | New Files |
|-------|---------------|-----------|
| 21 | `NglDashboard.tsx`, `NglSend.tsx`, `NglCreate.tsx` | — |
| 22 | `schema.ts`, `ngl.ts`, `NglCreate.tsx`, `NglDashboard.tsx`, `NglLang.tsx` | — |
| 23 | `NglDashboard.tsx` | — |
| 24 | `NglDashboard.tsx` | — |
| 25 | `NglDashboard.tsx`, `ngl.ts` | — |
| 26 | `schema.ts`, `ngl.ts`, `NglDashboard.tsx`, `NglSend.tsx` | — |
| 27 | `ngl.ts`, `package.json` | — |
| 28 | `NglDashboard.tsx`, `package.json` | — |
| 29 | `NglDashboard.tsx`, `NglSend.tsx` | `client/public/sounds/*.mp3` |
| 30 | `schema.ts`, `ngl.ts`, `NglDashboard.tsx`, `NglSend.tsx` | — |
| 31 | `schema.ts`, `ngl.ts`, `NglDashboard.tsx` | — |
| 32 | `schema.ts`, `ngl.ts`, `NglDashboard.tsx` | — |
| 33 | `schema.ts`, `ngl.ts`, `NglDashboard.tsx` | — |
| 34 | `NglLanding.tsx` | — |
| 35 | `ngl.ts` | `server/ngl-blocked-words.ts` |
| 36 | `client/index.html` | `client/public/manifest.json`, `client/public/sw.js` |
| 37 | `ngl.ts`, `NglDashboard.tsx` | — |
| 38 | `NglDashboard.tsx`, `package.json` | — |
| 39 | `NglDashboard.tsx` | — |
| 40 | `ngl.ts` | — |
| 41 | `schema.ts`, `ngl.ts`, `NglDashboard.tsx`, `NglSend.tsx` | — |
| 42 | `schema.ts`, `ngl.ts`, `NglDashboard.tsx` | — |
| 43 | `ngl.ts`, `NglDashboard.tsx` | — |
| 44 | `schema.ts`, `ngl.ts`, `NglDashboard.tsx` | — |
| 45 | `ngl.ts`, `NglDashboard.tsx` | — |
| 46 | `ngl.ts`, `NglDashboard.tsx`, `client/public/sw.js` | — |
| 47 | `schema.ts`, `ngl.ts`, `NglDashboard.tsx` | — |
| 48 | `NglLang.tsx` | — |
| 49 | `ngl.ts`, `NglDashboard.tsx` | — |
| 50 | `ngl.ts`, `NglDashboard.tsx` | — |

---

## 🏆 After All 50 Phases — Bong NGL vs NGL.link Final Score

| Feature Category | NGL.link | Bong NGL (Phase 50) |
|-----------------|----------|-------------------|
| Core messaging | ✅ | ✅ |
| AI-powered prompts | ❌ | ✅ |
| Multi-language (BN/EN/HI) | ❌ | ✅ |
| Free inbox (no paywall) | ❌ | ✅ |
| No app required | ❌ | ✅ |
| Profile photos | ✅ | ✅ |
| Dynamic OG cards | ❌ | ✅ |
| Story download cards | ❌ | ✅ |
| PIN login (easy re-auth) | ❌ | ✅ |
| Device auto-login | ✅ | ✅ |
| Message reactions | ❌ | ✅ |
| Free sender hints | ❌ ($10/week scam) | ✅ (free) |
| Message pinning | ❌ | ✅ |
| Anonymous polls | ❌ | ✅ |
| Streaks | ❌ | ✅ |
| AI reply suggestions | ❌ | ✅ |
| QR code sharing | ❌ | ✅ |
| Sound effects | ❌ | ✅ |
| Custom themes | ❌ | ✅ |
| PWA install | ❌ | ✅ |
| Block words filter | ❗ Basic | ✅ |
| Report system | ✅ | ✅ |
| Push notifications | ✅ (app only) | ✅ (web) |
| Data export | ❌ | ✅ |
| Analytics dashboard | ❌ | ✅ |
| Search messages | ❌ | ✅ |
| Onboarding tutorial | ❌ | ✅ |
| Games tab | ✅ | ❌ |
| Instagram DM integration | ✅ | ❌ |

**Final Score: Bong NGL wins 25+ features. NGL.link: 2 unique features (games + IG DM).**

---

## 💬 Ready to Start?

Say: **"Do Batch 1 — Phases 21-25"** and all 5 critical UX fixes will be implemented in one session.
