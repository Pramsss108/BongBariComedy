# Netlify Deploy Guide (Gemini + YouTube ready)

This guide ensures Gemini (Google GenAI) and YouTube integrations work seamlessly in Netlify (Preview and Production).

## Phase 1 — Configure Environment

Set Environment Variables in Netlify → Site settings → Build & deploy → Environment

- GEMINI_API_KEY = your Google Generative Language API key
- YOUTUBE_API_KEY = your YouTube Data API key (if used)
- JWT_SECRET = long random string
- ADMIN_USER, ADMIN_PASSWORD = admin credentials
- CORS_ORIGIN = https://<your-site>.netlify.app (and/or custom domain)

Confirm redirects are present (already in repo):
- `netlify.toml` routes /api/* → functions

## Phase 2 — Deploy Preview & Verify

After pushing to a branch, open the Preview URL and check:
- GET /api/ai/ready → { ok: true, aiReady: true, aiKeyPresent: true }
- GET /api/ready → ok:true and ready:true once warm
- GET /api/greeting/today → returns a short greeting text (<2s)
- Open chat and send a message:
  - If AI responds → good
  - If not, you should see: “Email team@bongbari.com or form: /work-with-us#form”

## Phase 3 — Promote to Production

Promote Preview to prod. Re-check the above endpoints. Ensure env vars exist in the Production context as well.

## Phase 4 — Optional Enhancements

- Add a small “AI offline” chip in the chatbot header by polling /api/ai/ready
- Rate-limit /api/chatbot/message if needed
- Pre-warm trending data on deploy via a small scheduled function (optional)

## Local Dev Basics

- UI only with mocked promo functions: `npm run dev:mock`
- Full dev with Netlify Functions: `npm run dev:marquee`
