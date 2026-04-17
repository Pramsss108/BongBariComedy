# Bong NGL — Payment Integration Plan (Razorpay) — Production Ready

**Status:** PLAN ONLY (no live keys wired). Foundation schema (`isPremium`, `premiumUntil`) is already in `shared/schema.ts`.

## 1. Plans
| Plan        | Price     | Duration | Unlocks                                                                         |
|-------------|-----------|----------|----------------------------------------------------------------------------------|
| PRO Monthly | ₹98 / mo  | 30 days  | 3 PRO themes (Neon, Rose Gold, Midnight), deep sender reveal (city+ISP+device+OS), unlimited pins, ad-free. |
| PRO Yearly  | ₹683 / yr | 365 days | Everything above + "Founder" badge + early access to new features.              |

## 2. Environment Variables (Oracle VM `/server/.env`)
```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```
**Never** expose `KEY_SECRET` to client. Only `KEY_ID` goes through `VITE_RAZORPAY_KEY_ID`.

## 3. Schema (already done — do NOT re-migrate)
```ts
// shared/schema.ts → nglUsers
isPremium: integer("is_premium").notNull().default(0),     // 0 = free, 1 = pro
premiumUntil: timestamp("premium_until"),                  // expiry; null = never upgraded
```
Optional future table (add only when renewals + history needed):
```ts
nglPayments = {
  id, username, razorpayOrderId, razorpayPaymentId, razorpaySignature,
  plan: 'monthly' | 'yearly', amount, status: 'created'|'paid'|'failed'|'refunded',
  createdAt, paidAt
}
```

## 4. Backend Routes to Build (`server/routes/ngl.ts`)
```ts
// 4.1 Create order
POST /api/ngl/payment/create-order
  Headers: X-NGL-Key (required)
  Body:    { plan: 'monthly' | 'yearly' }
  Action:  Razorpay SDK → orders.create({ amount: 9800|68300, currency:'INR', receipt:`bong_${username}_${Date.now()}` })
  Return:  { orderId, amount, currency, keyId: RAZORPAY_KEY_ID }

// 4.2 Verify payment
POST /api/ngl/payment/verify
  Headers: X-NGL-Key (required)
  Body:    { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan }
  Action:  HMAC SHA256(order_id|payment_id, KEY_SECRET) === signature
           if valid → UPDATE nglUsers SET isPremium=1, premiumUntil=NOW()+INTERVAL '30 days' (or 365)
  Return:  { success: true, premiumUntil }

// 4.3 Webhook (renewals, failures, disputes)
POST /api/ngl/payment/webhook
  Headers: X-Razorpay-Signature
  Action:  Verify signature with RAZORPAY_WEBHOOK_SECRET
           Handle events: payment.captured, payment.failed, subscription.charged
  Return:  200 OK (always — non-200 causes Razorpay to retry)
```

## 5. Client Flow (`client/src/pages/NglDashboard.tsx`)
1. User clicks "💎 Upgrade to PRO" badge or FOMO lock card.
2. Show modal with Monthly / Yearly toggle + feature list.
3. On confirm → `POST /api/ngl/payment/create-order` → receive `{orderId, amount, keyId}`.
4. Inject `https://checkout.razorpay.com/v1/checkout.js` (load once, cache).
5. `new Razorpay({key: keyId, order_id: orderId, ...prefill}).open()`.
6. On success handler → `POST /api/ngl/payment/verify` with signature.
7. If verified → `setIsPremium(true)`, refresh profile, confetti, toast "🎉 Welcome to PRO!".
8. On failure → log to `gEvent('ngl_pro_payment_failed')`, friendly error toast.

## 6. Dependencies (Oracle VM — only ~80 KB)
```
npm i razorpay   # official SDK, no native deps, safe for 256MB Node
```
**Do NOT** install: `stripe`, `paypal-rest-sdk` (too heavy, Indian creators prefer UPI/Razorpay).

## 7. Go-Live Checklist
- [ ] Razorpay KYC complete (GST + PAN + bank)
- [ ] Test mode: `rzp_test_*` keys → 5 end-to-end test transactions (monthly + yearly, both success + failure)
- [ ] Live mode: swap to `rzp_live_*`, update env on Oracle VM via `ssh opc@158.101.175.37`
- [ ] Webhook URL registered in Razorpay dashboard: `https://api.bongbari.com/api/ngl/payment/webhook`
- [ ] Set `isPremium` flag manually for founder/team accounts via SQL
- [ ] Add "Refund Policy" + "Cancel Subscription" to `/terms` page
- [ ] Pricing page at `/ngl/pro` (new route) — NOT a modal-only flow
- [ ] Invoice auto-email via Razorpay (built-in, just toggle)
- [ ] Monitor first 100 transactions manually for 1 week

## 8. Security Notes
- Always verify signature server-side. **Never** trust client-reported `paid=true`.
- Use idempotent order receipts: `bong_<username>_<timestamp>` so duplicate clicks don't create duplicate orders.
- Rate-limit `/create-order`: max 3/minute per user (abuse of test mode).
- Log `razorpayPaymentId` on every upgrade for auditability.
- Webhook signature check must run BEFORE any DB write.

## 9. Rollback
If payment goes live and breaks: set `FEATURE_PRO_PAYMENT=0` env var and server routes return `503 Service Temporarily Unavailable`. Client falls back to "Coming Soon" messaging. `isPremium=1` users retain access.

## 10. What's NOT in this plan (deferred Phase 2)
- Subscriptions (auto-renew) — Razorpay Subscription API requires a webhook infra that's more work.
- UPI AutoPay — same reason.
- Multi-currency (USD for NRIs) — only once Indian volume is healthy.
- Refund UI — do manually via Razorpay dashboard for first 3 months.
