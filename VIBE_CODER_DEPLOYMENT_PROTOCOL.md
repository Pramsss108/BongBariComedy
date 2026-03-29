# Vibe Coder Deployment Protocol (BongBari Comedy)
**VERSION 1.0 — ZERO WHITE SCREEN GUARANTEE**

This document serves as the absolute source of truth for all future AI agents (Vibe Coders) working on this project. The architecture is split into a static React frontend (GitHub Pages) and a dynamic NodeJS backend (Render.com). Any AI working on this must execute deployments EXACTLY as specified below.

---

## 🏗️ 1. The Architecture
* **Frontend:** Built with Vite (`npm run build:client`) and hosted on **GitHub Pages**. Code lives in `/client`.
* **Backend:** Express/NodeJS (`npm run start:server`) hosted on **Render.com**. Code lives in `/server`.

## 🚨 2. The Deployment Rule
### DO NOT USE LOCAL `gh-pages` COMMANDS ON WINDOWS.
The local `npx gh-pages -d dist/public` command is extremely flaky on Windows because the `.cache` directory gets locked by previous crashed processes.

**If you edit the FRONTEND and need to deploy:**
1. Execute: `git add .`
2. Execute: `npm run deploy:force`
3. This command commits `chore(deploy): force pages rebuild FORCE_PAGES_DEPLOY` and pushes to `main`.
4. **The GitHub Actions CDN pipeline intercepts this commit** and automatically builds the Vite app in an isolated Ubuntu cloud server, then force-pushes the output strictly to the `gh-pages` branch. 

### THE "WHITE SCREEN" WARNING
Because GitHub Actions takes ~2 minutes to build, if the user hard-refreshes their browser *before* the Action finishes, they will see a **White Screen of Death (404 Error)** because the new JS bundles are not yet on the CDN edge nodes.
* **Vibe Coder Action:** You MUST wait for the GitHub Action to complete, or explicitly tell the user: *"Do not aggressively refresh yet. Wait exactly 3 minutes for the GitHub pipeline to turn green."*

## 🌐 3. Backend Deployment (Render.com)
**If you edit the BACKEND and need to deploy:**
1. Execute: `git add server/`
2. Execute: `git commit -m "feat(backend): description"`
3. Execute: `git push origin main`
4. Render.com listens to the `main` branch. It will automatically detect the push and spin up a new container.
* **Vibe Coder Action:** Render takes ~3 minutes to seamlessly switch traffic to the new container. Do NOT tell the user to test instantly. If they test instantly, they will hit the old code and report a bug. Tell them to wait 3 minutes.

## 🛡️ 4. The ASocks BotGuard Proxy Logic
The YouTube Downloader (`server/routes/downloader.ts`) uses an ASocks Residential Proxy to bypass YouTube's 422 BotGuard blocks.
* The proxy string *must* be scrambled on every single request using `crypto.randomBytes(4)`.
* **Never use `-hold-session-session-STATIC_ID-`**. If an IP is static, YouTube will ban it permanently within 5 requests. The scrambler regex explicitly injects `session-[RANDOM HEX]:` so the ASocks network rotates the physical ISP IP on every single `Fetch` click.

## 💻 5. How the User Can Track Progress
To see what is actually happening behind the scenes without waiting blindly:
1. **Frontend Tracker:** Go to `https://github.com/Pramsss108/BongBariComedy/actions`. If the orange circle is spinning, the CD/CI pipeline is building the new page. Wait until it is a Green Checkmark.
2. **Backend Tracker:** Open the Render.com Dashboard -> `bongbaricomedy` Web Service -> **Events** tab. If it says "Deploying...", the new server is still booting. Wait until it says "Live".

---

> ## ~~RENDER~~ — BANNED & REPLACED (March 29, 2026)
> 
> **All Render references above are OBSOLETE.** Render.com pipeline minutes exhausted, free tier unreliable.
> 
> | Old (Render) | New (Oracle Cloud Always Free) |
> |---|---|
> | ~~bongbaricomedy.onrender.com~~ | http://79.76.110.66:5000 |
> | ~~Render free tier (512MB RAM)~~ | Oracle VM (951MB RAM + 1.5GB swap) |
> | ~~Render auto-deploy~~ | GitHub Actions → Oracle VM SSH deploy |
> | ~~Render CPU 0.1 vCPU~~ | Oracle 1 OCPU (AMD EPYC) |
> | ~~Render sleeps after 15min~~ | PM2 24/7, auto-restart on reboot |
> 
> **Do NOT add any Render configs, buildpacks, or references. Oracle Cloud is the permanent backend.**

---

> ## ~~RENDER~~ -- BANNED & REPLACED (March 29, 2026)
> 
> **All Render references above are OBSOLETE.** Render.com pipeline minutes exhausted, free tier unreliable.
> 
> | Old (Render) | New (Oracle Cloud Always Free) |
> |---|---|
> | ~~bongbaricomedy.onrender.com~~ | `http://79.76.110.66:5000` |
> | ~~Render free tier (512MB RAM)~~ | Oracle VM (951MB RAM + 1.5GB swap) |
> | ~~Render auto-deploy~~ | GitHub Actions -> Oracle VM SSH deploy |
> | ~~Render CPU 0.1 vCPU~~ | Oracle 1 OCPU (AMD EPYC) |
> | ~~Render sleeps after 15min~~ | PM2 24/7, auto-restart on reboot |
> 
> **Do NOT add any Render configs, buildpacks, or references. Oracle Cloud is the permanent backend.**
