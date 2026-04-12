# 📱 Bong NGL — WhatsApp OTP Full Integration Plan
> Last updated: April 8, 2026

---

## 🔴 AUTH Template Status (NOT Dismissed)

### The Problem
| Detail | Value |
|--------|-------|
| API Error | Code `10`, Subcode `2388185` |
| Message | "Application does not have permission for this action" |
| Root Cause | Meta backend sync bug — WABA shows "Verified" but Security Centre says "More Information" needed |
| UI Workaround | User CAN see the AUTH template creation form in Meta UI, but templates created there don't appear in the API (0 AUTH templates found) |
| Escalation | Submitted to Meta Engineering for manual database sync |

### What We Tested (April 7, 2026)
```
✅ API token works       — can send messages, list templates, delete templates
✅ UTILITY templates     — 4 approved, sending works perfectly
❌ AUTH template CREATE   — Code 10/2388185 (permission denied)
❌ AUTH template exists   — 0 AUTH templates in account (even after UI attempt)
❌ Sending "hkvjhvjhv"   — template does not exist (132001)
❌ Sending "verify_code_1" — template does not exist (132001)
```

### When AUTH Gets Unblocked (Future)
Once Meta resolves the sync bug, we will:
1. Create AUTH template `bong_ngl_otp` via API (or user creates via UI)
2. Add it as **#1 priority** in the cascade (before UTILITY templates)
3. Users will see: `"123456 is your verification code. For your security, do not share this code."` + **[Copy code]** button
4. **No other code changes needed** — just add template name to the array in `whatsapp.ts`

---

## 🟢 Current Working System

### How OTP Delivery Works NOW
```
User enters phone → Backend generates 6-digit OTP → WhatsApp sends via UTILITY template
```

**What the user receives on WhatsApp:**
```
Hi! Your Bong Bari request is ready.

Reference: 342585

Thank you for choosing Bong Bari.
```

### ⚠️ IMPORTANT: What Users Need to Know
The OTP arrives as a **"Reference" number**, NOT as a "verification code" labeled message.
The frontend UI MUST tell users:
> **"Enter the Reference number you received on WhatsApp"**

This is critical UX — if the UI says "Enter your OTP" but WhatsApp says "Reference: 342585", users will be confused.

---

## 📋 Phase-wise Integration Plan

### Phase A: Frontend OTP Flow During Account Creation
**Where:** `NglCreate.tsx` (after account is created, before dashboard)
**When:** User has entered a phone number + tapped "Create Account"

#### A.1 — Update phone hint text
- **File:** `NglLang.tsx`
- **Change:** Replace "⏳ WhatsApp OTP verify শীঘ্রই আসছে!" with actual working text
- **New text (bn):** `"📱 নম্বর দিলে WhatsApp-এ Reference code পাঠাবো — verify করো!"`
- **New text (en):** `"📱 We'll send a Reference code to your WhatsApp — verify your number!"`

#### A.2 — Add OTP verification step to create flow
- **File:** `NglCreate.tsx`
- **Current steps:** `form` → `photo`
- **New steps:** `form` → `otp` → `photo`
- **OTP screen shows:**
  - Masked phone number (+91 87778•••••)
  - "We sent a Reference number to your WhatsApp" (bilingual)
  - 6-digit input boxes (like BongShare already has)
  - "Verify" button
  - "Resend" button (greyed out with 60s countdown timer)
  - "Skip for now" link (phone verification stays optional)

#### A.3 — Wire up API calls
```
[Send OTP]   → POST /api/ngl/otp/send   { username, phone, key }
[Verify OTP] → POST /api/ngl/otp/verify  { username, otp, key }
```
- On success → move to `photo` step
- On "Skip" → move to `photo` step (phoneVerified stays 0)
- On error → show error message inline

---

### Phase B: Dashboard Phone Verification
**Where:** `NglDashboard.tsx` (settings/profile section)
**When:** User is logged in, wants to add/change/verify phone number

#### B.1 — Phone verification card in dashboard
- Show current phone status:
  - ❌ No phone → "Add WhatsApp number" button
  - ⏳ Phone added but unverified → "Verify now" button + phone number
  - ✅ Phone verified → Green badge with masked number
- Clicking "Add" or "Verify" opens a small inline form (not a modal)

#### B.2 — Inline OTP flow
- Phone input (if adding new) → "Send Reference Code" button
- After send → 6-digit input + countdown timer
- Verify → Green checkmark + "Phone verified!" toast

#### B.3 — Language strings
- Add all new strings to `NglLang.tsx`:
  - `dash.phoneTitle` — "📱 WhatsApp Verification"
  - `dash.phoneAdd` — "Add WhatsApp"
  - `dash.phoneVerify` — "Verify"
  - `dash.phoneVerified` — "Verified ✅"
  - `dash.phoneSend` — "Send Reference Code"
  - `dash.phoneEnterRef` — "Enter the Reference number from WhatsApp"
  - `dash.phoneResend` — "Resend (wait Xs)"
  - `dash.phoneSkip` — "Skip for now"
  - etc. (all bilingual bn/en)

---

### Phase C: UI Polish & Messaging
**Critical:** User must NOT be confused by "Reference" vs "OTP"

#### C.1 — All user-facing text must say "Reference number" not "OTP code"
| Screen | Text |
|--------|------|
| Create page phone hint | "We'll send a Reference number to verify your WhatsApp" |
| OTP send success | "📱 Check WhatsApp! You'll receive a Reference number" |
| OTP input label | "Enter Reference Number" |
| OTP input placeholder | "6-digit number from WhatsApp" |
| Error: wrong code | "Reference number doesn't match. Try again." |
| Error: expired | "Reference number expired. Tap Resend." |
| Error: rate limit | "Please wait Xs before requesting again." |

#### C.2 — Countdown timers
- **Resend cooldown:** 60 seconds (matches backend rate limit)
- **Expiry warning:** "Expires in X:XX" (5 minute countdown)
- Visual: circular progress or countdown text next to input

---

### Phase D: Edge Cases & Error Handling

#### D.1 — Rate limiting
- Backend enforces 1 OTP/minute per username
- Frontend shows greyed-out resend button with countdown
- If user spams: show "Wait Xs" from 429 response

#### D.2 — Delivery failures
- If WhatsApp delivery fails (502 from backend): 
  - Show: "Could not send to this number. Please check and try again."
  - Don't consume the rate limit slot (already handled in backend)

#### D.3 — Invalid phone
- Frontend validates: exactly 10 digits, starts with 6-9
- Backend validates via `validatePhone()` — returns clean E.164 format

#### D.4 — Session/auth
- All OTP endpoints require `key` (secretKey from localStorage)
- If key is wrong: 403 → redirect to login

---

### Phase E: Future — When AUTH Template is Unblocked

When Meta resolves the permission bug:

#### E.1 — Create AUTH template
```
Template name: bong_ngl_otp
Category: AUTHENTICATION
Delivery: Copy code
Expiry: 5 minutes
```

#### E.2 — Update cascade in whatsapp.ts
```typescript
const templates = [
  // AUTH template (best UX — includes copy button)
  { name: 'bong_ngl_otp', category: 'AUTHENTICATION' },
  // UTILITY fallbacks
  'bong_order_reference_v1',
  'bong_appointment_remind_v1',
  'bong_status_update_v1',
  'bong_ticket_update_v1',
];
```

#### E.3 — Update UI text
- Change "Reference number" → "Verification code" everywhere
- The WhatsApp message will now say: "123456 is your verification code..." with Copy button
- Much better UX — no more confusion

#### E.4 — No other changes needed
- Backend routes stay the same
- Database schema stays the same
- Frontend OTP flow stays the same (just label text changes)

---

## 📊 Template Inventory (April 7, 2026)

| Template | Category | Status | Message Preview |
|----------|----------|--------|-----------------|
| `bong_order_reference_v1` | UTILITY | ✅ APPROVED | "Your Bong Bari request is ready. Reference: {OTP}" |
| `bong_appointment_remind_v1` | UTILITY | ✅ APPROVED | "Your session detail is {OTP}. Keep for records." |
| `bong_status_update_v1` | UTILITY | ✅ APPROVED | "Your item {OTP} is ready for pickup." |
| `bong_ticket_update_v1` | UTILITY | ✅ APPROVED | "Your support ticket {OTP} has been updated." |
| `hello_world` | UTILITY | ✅ APPROVED | Default Meta sample (not used) |
| AUTH templates | AUTH | ❌ BLOCKED | Code 10/2388185 — Meta sync bug |
| `bong_ngl_confirm_v1` | UTILITY | ❌ REJECTED → Deleted | Had OTP-like wording |
| `bong_ngl_number_v1` | UTILITY | ❌ REJECTED → Deleted | Had OTP-like wording |

---

## 🔧 File Map (What Changes Where)

| File | Phase | What Changes |
|------|-------|-------------|
| `client/src/components/NglLang.tsx` | A.1, B.3, C.1 | Add all OTP-related bilingual strings |
| `client/src/pages/NglCreate.tsx` | A.2, A.3 | Add `otp` step, OTP input UI, API calls |
| `client/src/pages/NglDashboard.tsx` | B.1, B.2 | Add phone verification card + inline OTP flow |
| `server/lib/whatsapp.ts` | E.2 | Add AUTH template to cascade (when unblocked) |
| `server/routes/ngl.ts` | — | No changes needed (already complete) |
| `shared/schema.ts` | — | No changes needed (already complete) |
| `server/lib/otp.ts` | — | No changes needed (already complete) |

---

## ✅ Implementation Order (Recommended)

1. **Phase A** (Create flow) — ✅ DONE — `form` → `otp` → `photo` with 6-digit input, auto-advance, paste, skip
2. **Phase C** (UI messaging) — ✅ DONE — All bilingual strings in NglLang.tsx (otp.*, create.phone*, dash.phone*)
3. **Phase B** (Dashboard) — ✅ DONE — Popup modal (3 steps: phone input → 6-digit OTP → verified). Inline replaced.
4. **Phase D** (Edge cases) — ✅ DONE + HARDENED — Brute-force lockout (5 max), HMAC-SHA256, timing-safe, phone validation (starts 6-9)
5. **Phase E** (AUTH upgrade) — ❌ BLOCKED by Meta (Code 10/2388185). When unblocked: add template name to array + swap labels.

### 🔒 Backend Hardening (April 8, 2026)
Applied 5 security fixes to `server/lib/otp.ts` and `server/routes/ngl.ts`:
- HMAC-SHA256 with server secret (replaces plain SHA-256)
- Timing-safe comparison via `crypto.timingSafeEqual`
- Brute-force lockout: max 5 verify attempts per OTP, then invalidated
- Removed 2 dead rejected templates from WhatsApp cascade
- Phone masking: only last 4 digits visible (+91 •••••9865)

### 🎨 Dashboard UX (April 8, 2026)
- Home tab: unified single card (avatar+name, link bar, 4 actions, prompt)
- Phone: popup modal with themed gradient header, spring animation, 3-step flow
- Phone + Delete merged into single compact row at bottom
- Green verified badge, masked number display
