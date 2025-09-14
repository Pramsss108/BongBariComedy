Netlify Serverless Setup

Environment variables (Site settings → Build & deploy → Environment):
- ADMIN_USER=admin
- ADMIN_PASSWORD=your-strong-password
- JWT_SECRET=your-very-strong-random-secret
- GEMINI_API_KEY=optional-google-key

Client configuration:
- If the app and functions are on the same site, no change needed; /api/* is redirected to functions by netlify.toml.
- If split, set VITE_API_BASE to the functions site origin.

Storage:
- Memes, homepage content, and banner use Netlify Blobs (stores: memes-store, homepage-store).

Routes provided by functions:
- /api/auth/login, /api/auth/me, /api/auth/logout
- /api/memes (GET, POST /generate, PUT /:id, POST /:id/publish, GET /public)
- /api/chatbot/message
- /api/greeting/today
- /api/admin/homepage-content (GET/POST/PUT/DELETE)
- /api/homepage-banner (GET/POST)
