# Bong Kahini Community Tool

A modern, playful Bengali community platform for sharing, reacting, and moderating stories and tools. Built for bongbari.com with Next.js, Netlify Functions, MongoDB Atlas, Upstash Redis, Gemini moderation, Cloudinary, and Pusher.

## Purpose
- Share and react to Benglish stories, tools, and posts
- Anonymous posting (rate-limited, anti-spam)
- Moderation queue (Gemini, async)
- Live feed and reactions (Pusher/Ably/Supabase Realtime)
- Admin UI, analytics, and more

## Tech Stack
- **Next.js** (TypeScript, Tailwind CSS)
- **Netlify Functions** (API routes, serverless)
- **MongoDB Atlas** (main DB, globalThis client cache)
- **Upstash Redis** (rate-limit, queues, REST/serverless)
- **Gemini** (moderation, async background jobs)
- **Cloudinary** (signed uploads) or S3 (signed URLs)
- **Pusher/Ably/Supabase Realtime** (live updates)

## Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Copy .env.example and fill in secrets
cp .env.example .env.local

# 3. Start dev server
npm run dev

# 4. Build for production
npm run build

# 5. Deploy to Netlify (auto with Git push if connected)
# Or: npx netlify deploy --prod
```

## Environment Variables (set in Netlify UI > Site settings > Environment)
- `MONGO_URL` — MongoDB Atlas connection string
- `UPSTASH_REST_URL` — Upstash Redis REST endpoint
- `UPSTASH_REST_TOKEN` — Upstash Redis REST token
- `GEMINI_KEY` — Gemini API key (moderation)
- `NEXT_PUBLIC_YT_ID` — YouTube channel ID (public)
- `NEXT_PUBLIC_SITE_URL` — Your site URL (e.g. https://bongbari.com)
- `CLOUDINARY_URL` — Cloudinary API URL (or S3 keys)
- `PUSHER_KEY` — Pusher key (or Ably/Supabase)
- `PUSHER_SECRET` — Pusher secret
- `NETLIFY_SITE_ID` — Netlify site ID (for CLI deploys)

> **Note:** Never commit secrets to GitHub. Use Netlify’s Environment Variables for all keys.

## Seed Script
```bash
npm run seed
# Seeds the DB with sample Benglish stories for launch/demo
```

## Test Commands
```bash
npm run test      # Run all tests
npm run lint      # Lint code
npm run typecheck # TypeScript type check
```

## Netlify Serverless Considerations
- All API routes run as Netlify Functions (cold start possible, keep DB/Redis clients in globalThis)
- No raw WebSockets (use Pusher/Ably/Supabase for realtime)
- Async moderation (Gemini) runs in background jobs/queues, never blocks main request
- File uploads use signed URLs (Cloudinary/S3)
- Upstash Redis is used for rate-limiting and lightweight queues (REST/serverless, not TCP)

---

For questions or help, see CONTRIBUTING.md or open an issue.
