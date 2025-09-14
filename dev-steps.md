# Development Steps & Smoke Test Checklist (Phase 1)

## Prerequisites
- Node.js 18+ installed
- Windows PowerShell environment (current project scripts assume Windows)

## Install
```
npm install
```

## Run (Backend + Frontend Together)
Option A (concurrently – development):
```
npm run dev:live
```
This starts:
- API / server on port 5000
- Vite client on port 5173

Option B (separate terminals):
```
npm run dev        # server (5000)
npm run client     # frontend (5173)
```

If ports are stuck:
```
npm run predev:live
```

## Primary Local URLs
- http://localhost:5173/ (site root)
- http://localhost:5173/community/feed
- http://localhost:5173/community/submit
- http://localhost:5173/admin/moderation (stub – not protected)

## Device ID Helper
A persistent cookie `bbc_device_id` is generated automatically and refreshed on access. Also stored in `localStorage` fallback. All submit + admin moderation POST stubs now send header:
```
X-Device-Id: <id>
```

## Rate Limiting (Dev Stub)
- Story submissions limited to 5 per 5 minutes per device (in-memory only).
- Returns 429 JSON: `{ message: 'Too many submissions. Please wait a few minutes.' }`.

## Shared Story Form
- Feed bottom form and `/community/submit` both use `StorySubmitForm` component.
- Consistent accessibility & headers.

## Moderation UI Enhancements
- Reject flow uses modal (no browser prompt) with reason (200 char cap).
- Selection count live region.
- Hover elevation on cards.
- Auth guard: unauthenticated users redirected to `/login`.

## Accessibility Additions
- Global skip link (`.skip-link`) style ready—add `<a href="#feedHeading" class="skip-link">Skip to Feed</a>` near top of body/navigation.
- Unified `:focus-visible` outline for keyboard navigation.

## Device Logs (Dev)
- View recent device actions (last 100) at `/api/admin/device-logs`.

## Smoke Test Checklist
1. Feed Load
   - Open `/community/feed` – see audience pick, search input, pagination, and submission form at bottom.
2. Submit Story (inline)
   - Scroll to bottom form, enter text, submit. Should reset and not error.
   - Check DevTools Application > Cookies for `bbc_device_id`.
3. Dedicated Submit Page
   - Visit `/community/submit`.
   - Form shows remaining chars live (role=status region updates).
   - Submit valid story → toast success → redirects to `/community/feed`.
4. Accessibility Quick Pass
   - Tab through `/community/submit` fields (labels associate correctly).
   - While submitting, form has `aria-busy=true`.
5. Moderation UI
   - Open `/admin/moderation`.
   - Select a few items (Selected count updates live).
   - Approve one → toast → disappears & appears in feed (auto-scroll highlight if top).
   - Bulk select + Bulk Approve or Bulk Delete confirm behavior.
   - Edit flow: Edit → modify text → Save & Publish → toast.
   - Export CSV → file `pending_posts.csv` downloads.
6. Theme Toggle
   - On feed page, cycle theme (Light → Dark → Auto) persists on reload.
   - Auto respects system theme (change OS preference, page updates after brief refocus).
7. Device ID Header
   - In Network tab: submit-story or admin publish/reject requests include `X-Device-Id` header.
8. Cross-Tab Sync
   - Open two tabs, change theme in one; other updates after storage event (within ~1s when refocused).

## Notes / Future Enhancements
- Server endpoints currently stubbed – secure moderation & auth gating needed before production.
- Consider server-side logging keyed by `X-Device-Id` once backend updated.
- Add automated accessibility checks (e.g., axe) in future phase.

---
Document version: Phase 1 stabilization

---
## Phase 2 Additions (Moderation Preview, 6h Rate Limit, Reactions)

### 1. 6 Hour Rate Limit
- Replaces old 5-in-5-min logic.
- Keyed by IP + device hash.
- Response on second attempt: HTTP 429 `{ code: 'rate_limited', retryAfterSec, message }`.
- UI: Submit button shows countdown (HH:MM) and toast “একটু বিরতি…”.

### 2. Moderation Preview Flow
Route: `POST /api/moderate-preview`
- Returns:
   - `{ status:'ok' }` → direct publish attempt.
   - `{ status:'review_suggested', reason, flags[] }` → review modal (user can edit or force review submit).
   - `{ status:'severe_block', message }` → blocked dialog, no submit.

### 3. Submission Triage (Final Submit)
Route: `POST /api/submit-story`
- Outcomes:
   - `published` – toast “লাইভ!”.
   - `pending_review` – toast “Review e gelo”.
   - `blocked` – toast “থামুন”.
   - `rate_limited` – handled as above.

### 4. Reactions (Server Backed)
Route: `POST /api/reaction` body `{ postId, type }`
- Types: `heart | laugh | thumbs` (mapped from UI emojis 😂 ❤️ 😮 🔥)
- Dedupe: one per type per device (Upstash or in-memory).
- 409 duplicate → UI rollback + toast.
- Periodic 45s feed sync merges authoritative counts.

### 5. Device Logs
`/api/admin/device-logs` now includes: `submit_published`, `submit_pending_review`, `submit_blocked_severe`, `submit_rate_limited_6h`, `reaction`.

### 6. Testing Quick Script
Clean publish story:
> আজ দুপুরে পরোটায় আলু নেই দেখে মন খারাপ, পরে মা বলল শেষটা আমি আগেই খেয়ে ফেলেছি — হাসি পেয়ে গেল!

Review suggested story:
> আমার বন্ধুটার মাথা কেমন pagol টাইপ কিন্তু ও ছাড়া আড্ডা ফাঁকা লাগে।

Rate limit: Publish one clean, then immediately publish another.

### 7. Environment
- Add `.env` from `.env.example`. Upstash optional; without it counts reset on restart.
- Gemini key optional; improves decision of mild slang.

### 8. Accessibility Updates
- Preview & blocked overlays use `role="dialog"` / `role="alertdialog"`.
- Countdown text in button for rate-limit is plain (no extra ARIA) to avoid verbosity.

### 9. Known Limitations
- Audience pick recalculates client-side only.
- Severe phrase list static; adjust in `server/routes.ts`.
- Reaction emoji 🔥 reuses heart server key for now.

---
## Test Mode (Bypass Rate Limit)

Purpose: Let non-coders rapidly test multiple submissions without 6h wait.

Setup:
1. Ensure `.env` has `TEST_BYPASS_TOKEN=dev-bypass-token` (or chosen string).
2. Restart server.
3. In browser on `/community/feed`, click floating "Enable Test Mode" button (bottom-right) and enter token.
4. Button turns green: "Test Mode ON"; subsequent submissions/reactions send header `X-Test-Bypass: <token>`.

Effects:
- Skips 6h rate limit.
- Auto publishes every submission (unless severe block regex match) — no pending queue.
- Preview endpoint always returns `{ status: 'ok', test: true }`.
- Unlimited reactions (duplicate prevention disabled) so engagement testing is easy.
- Response JSON includes `test: true`.
- Device logs show `submit_published_test` & `reaction_test` events.

Disable: Click the button again (removes token from localStorage).

Security: Do not enable Test Mode in production; omit the env var so header is ignored.

---
