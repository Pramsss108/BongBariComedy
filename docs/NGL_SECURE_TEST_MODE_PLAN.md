# NGL Secure Test Mode Plan (No-Code)

## Objective
Create a safe testing approach on the main site so that:
- fake or stale phone verification is minimized,
- premium cannot be unlocked by unauthorized users,
- full funnel can be tested on mobile/desktop,
- test payment can run at Rs 1 only in dev/test mode.

## What We Found (Current Behavior)
1. Phone can appear as `verified` if the account already has a previously verified number in DB.
2. Phone can appear as `verification pending` when a phone number is saved but OTP verification is not completed.
3. OTP send flow stores the phone before verification, so an unverified phone still exists in account state.
4. In dev OTP mode (when WhatsApp token is absent), OTP send is simulated/logged, which is useful for dev but can confuse status expectations.
5. Payment dev grant/revoke endpoints exist and are protected by a shared secret; this is useful for testing but must be tightly governed.

## Why "Verified" Can Look Fake
1. Username reuse can surface old verified data if same account is reused.
2. Unverified state is expected after OTP send until OTP verify succeeds.
3. If OTP is simulated in dev and not truly delivered, the UX can still look like a real OTP journey unless clearly labeled as test mode.

## Desired Security Guarantees
1. No unknown user can self-enable premium by guessing or bypassing controls.
2. Dev/testing controls are cryptographically gated, short-lived, and auditable.
3. Test payment path cannot affect live billing metrics or production entitlements accidentally.
4. Phone status shown in UI must always reflect authoritative backend state.

## Proposed Architecture (Plan Only)

### 1. Separate Premium Modes
1. `LIVE_PREMIUM_MODE`:
- normal plans (Rs 98 / Rs 683), live Razorpay keys.
2. `TEST_PREMIUM_MODE`:
- fixed Rs 1 plan for funnel validation only.
- clearly labeled in UI as test payment.
- uses independent metadata tags for analytics segregation.

### 2. Strong Access Control for Test Mode
1. Test mode can only be enabled server-side.
2. Enablement requires both:
- environment flag (`NGL_TEST_MODE=true`) and
- tester authorization (allowlisted account or signed token).
3. Never trust client flag alone.

### 3. Cryptographic Tester Authorization
1. Issue short-lived signed test tokens (JWT or HMAC-signed payload) with:
- username,
- scope (`premium:test`),
- expiry,
- nonce/session id.
2. Verify signature and expiry on every test-sensitive endpoint.
3. Reject replayed or expired tokens.

### 4. Hardening Premium Activation
1. Premium activation source should be explicit:
- `live_payment`, `test_payment`, `dev_grant`, `manual_admin`.
2. Enforce source-specific validation rules.
3. Require immutable payment/test transaction id before entitlement mutation.
4. Keep append-only audit logs for all premium state changes.

### 5. Phone Verification Integrity
1. Add explicit phone verification state machine:
- `none` -> `otp_sent` -> `verified`.
2. Show `verified` only if backend says verified and phone hash/id is present.
3. Keep OTP-send and OTP-verify events in audit log.
4. Add stale-state cleanup policy for old `otp_sent` records.

### 6. Remove "Fake" Perception in UI
1. UI badge text should reflect exact backend state:
- `Verified`, `Pending verification`, `Not added`.
2. If in dev OTP simulation, show clear label: `Test OTP mode`.
3. Add "last verified at" metadata in account security panel.

### 7. Rs 1 Test Payment Flow
1. Only available when test mode is active and user is authorized tester.
2. Dedicated test plan id and separate reporting dimensions.
3. Entitlement granted with test marker (not mixed with live purchases).
4. Add auto-expiry for test premium (example: 24h or configurable).

### 8. Prevent Unauthorized Premium Access
1. Keep dev grant endpoint disabled by default in production.
2. If enabled for emergency testing, require:
- IP allowlist,
- signed request,
- rotating secret,
- strict rate limits,
- audit logging.
3. Add alerting on unusual grant/revoke volume.

### 9. Test Matrix (Desktop + Mobile)
1. Desktop browsers: Chrome, Edge, Safari.
2. Mobile: Android Chrome, iOS Safari.
3. Cases:
- new account no phone,
- OTP sent but not verified,
- verified phone,
- live payment,
- Rs 1 test payment,
- unauthorized test attempt,
- expired test token,
- replay attempt.

### 10. Rollout Strategy
1. Phase A: observability and audit fields first.
2. Phase B: cryptographic tester token gate.
3. Phase C: Rs 1 test payment mode for allowlisted testers.
4. Phase D: UI clarity updates and dashboard status hardening.
5. Phase E: security review + kill-switch rehearsal.

## Operational Guardrails
1. One-click kill switch to disable test mode instantly.
2. Daily review of premium mutation logs.
3. Separate dashboard widgets for live vs test conversions.
4. Quarterly rotation of test secrets/keys.

## Success Criteria
1. No ambiguous "fake verified" reports.
2. No unauthorized premium entitlement in security logs.
3. Full funnel testable at Rs 1 in controlled test mode.
4. Clean segregation of test vs live payment analytics.

## Relevant Existing Files
- [server/routes/ngl.ts](server/routes/ngl.ts)
- [server/lib/otp.ts](server/lib/otp.ts)
- [server/lib/whatsapp.ts](server/lib/whatsapp.ts)
- [client/src/pages/NglDashboard.tsx](client/src/pages/NglDashboard.tsx)
- [client/src/components/NglUpgradeModal.tsx](client/src/components/NglUpgradeModal.tsx)
