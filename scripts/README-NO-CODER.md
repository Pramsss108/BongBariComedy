Quick guide for non-coders (Netlify + GitHub)

1) Put your secrets in server/.env (never commit them in Git)
   Example:
   GEMINI_API_KEY=YOUR_KEY
   JWT_SECRET=make-a-long-random-string
   ADMIN_USER=admin
   ADMIN_PASSWORD=your-strong-pass
   YOUTUBE_CHANNEL_ID=UCNXvQhwAn4b2sAm6pCM9w7Q
   YOUTUBE_API_KEY=YOUR_YOUTUBE_KEY
   CORS_ORIGIN=https://bongbari.com

2) Sync secrets to Netlify (one-time or whenever you change .env)
   - Open PowerShell in the project folder
   - Log in once: netlify login
   - Run: ./scripts/sync-netlify-env.ps1 -SiteName "YOUR_NETLIFY_SITENAME" -EnvFile "server/.env"
     (Ask Netlify admin for the exact site name if unsure)

3) Deploy by pushing to GitHub
   - Make sure your repo is connected to Netlify
   - Push to main (or trigger Deploy in Netlify UI)

4) Verify
   - Open https://bongbari.com/api/ready (should show ok:true)
   - Open https://bongbari.com/api/youtube/latest (should show videos)
   - Visit homepage, chatbot shows template then AI replies when GEMINI_API_KEY is set

That’s it—no server to run. All APIs are Netlify Functions.
