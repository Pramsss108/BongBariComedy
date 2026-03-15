# BONGBARI YOUTUBE DOWNLOADER — ARCHITECTURE & LIMITS

## 🚀 How We Fixed It (Why it works now)
Previously, the backend used an NPM wrapper called `youtube-dl-exec`. This wrapper had a critical bug on Windows where it couldn't properly escape folder paths with spaces (e.g., `d:\barir Mashla\web...`). This caused the backend to crash invisibly with a "Path not found" error before it even attempted to talk to YouTube.

**The Fix:**
1. **Direct Binary Execution:** We bypassed the npm wrapper entirely. The server now uses native Node.js `child_process.spawn` and `execFile` to directly launch the `yt-dlp` executable.
2. **Buffer Optimization:** We bumped the memory buffer to 20MB. Some YouTube videos have massive DASH streaming manifests. Before, navigating these manifests would crash the system; now, it plows right through them.
3. **Ghost Streaming (Proxy Pipe):** The video never actually downloads to your server's hard drive! It creates a live pipeline (`stdout.pipe`) pulling the video blobs from YouTube servers directly through your backend and straight into the user's browser as a `.mp4` attachment. 

---

## ⚠️ Is It "Unlimited" for Everyone? (Important Limits)

If you push this to production, anyone on the internet *can* use it without logging in, but it is **NOT strictly unlimited**. You will face three major bottlenecks if it goes viral:

### 1. YouTube IP Banning (The Biggest Risk)
Because all the download requests route through your Render.com backend, YouTube sees **every single download coming from the exact same Render IP Address**. 
* If 100 people download 100 videos a day, YouTube's anti-bot system will flag your server's IP address.
* Once flagged, the downloader will start failing with `HTTP Error 403: Forbidden` or `Sign in to confirm you're not a bot`.
* *Workaround if this happens:* You will have to deploy proxy rotators or update the `yt-dlp` binary frequently.

### 2. Render Bandwidth Limits (100 GB / month)
Because the video routes *through* your server, an 80MB video uses 80MB of incoming bandwidth (YouTube -> Render) and 80MB of outgoing bandwidth (Render -> User). 
* Render's Free Tier strictly limits outbound bandwidth to **100 GB per month**. 
* If users download heavily, your server will hit the bandwidth cap and Render will suspend the backend until the next month.

### 3. Hard-Coded Rate Limits (Anti-Spam)
We have already built anti-abuse rate limiters into `server/routes/downloader.ts` to prevent a single user from crashing your site:
* **Info requests:** Limited to 10 requests per minute per user.
* **Download/Stream requests:** Limited to 5 downloads per minute per user.

## Summary
It is fully functional and ready for public use! Just keep an eye on your **Render dashboard** for network bandwidth spikes if the tool becomes too popular.