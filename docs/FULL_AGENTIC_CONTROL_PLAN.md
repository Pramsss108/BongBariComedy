# Full Agentic Control Plan (Hetzner + Cloudflare + VS Code)

This guide is for non-coders. Follow once, then future agents can run almost everything automatically.

## What You Already Finished
- Backend primary is Hetzner: 78.47.104.43
- Cloudflare `api` DNS now points to Hetzner
- `api` record is Proxied ON (correct)
- GitHub auto-deploy to Hetzner is configured
- GitHub secrets already set:
  - HETZNER_HOST
  - HETZNER_SSH_KEY
  - HETZNER_ENV

## One-Time Setup Left (Critical)
You must add Cloudflare API token secret so agents can switch DNS automatically.

### Step 1: Create Cloudflare API Token
1. Open Cloudflare dashboard -> My Profile -> API Tokens.
2. Click Create Token.
3. Use template: Edit zone DNS.
4. Permissions:
   - Zone:Read
   - Zone DNS:Edit
5. Zone resources:
   - Include -> Specific zone -> bongbari.com
6. Create Token and copy token value.

### Step 2: Save Token in GitHub Secrets
1. Open GitHub repo -> Settings -> Secrets and variables -> Actions.
2. New repository secret:
   - Name: CLOUDFLARE_API_TOKEN
   - Value: (paste token)
3. Save.

After this, routing can be switched from GitHub Actions in one click.

## One-Click DNS Switch (Already Added)
Workflow name:
- Cloudflare DNS Switch + Health Check

How to run:
1. GitHub -> Actions -> Cloudflare DNS Switch + Health Check.
2. Click Run workflow.
3. Choose target_backend:
   - hetzner (normal)
   - oracle (emergency rollback)
   - custom (manual IP)
4. Run.

What it does automatically:
- Updates `api.bongbari.com` A record in Cloudflare
- Forces proxied ON and TTL Auto
- Runs health check on `https://api.bongbari.com/api/version`
- Fails if unhealthy

## Daily Zero-Code Ops (Safe Commands)
For future agents, this is the normal pattern:
1. Code change -> push to main.
2. GitHub deploy workflow ships backend to Hetzner.
3. If routing needs switch, run Cloudflare DNS workflow.
4. Verify endpoint returns healthy JSON.

## Emergency Rollback (No Coding)
If production breaks:
1. Run Cloudflare DNS workflow.
2. Set target_backend = oracle (or custom IP).
3. Run and wait for health check.
4. Once stable, investigate safely.

## Security Rules (Must Keep)
- Never share token/private key in chat screenshots.
- Keep Cloudflare token scope limited to bongbari.com only.
- Keep `api` as Proxied ON.
- Never edit CNAME unless domain migration is intentional.

## VS Code Full Agentic Capability Checklist
To allow agents to do almost everything inside VS Code:
- GitHub CLI logged in (`gh auth status`)
- SSH key exists for Hetzner and works
- GitHub repo secrets configured (including CLOUDFLARE_API_TOKEN)
- Cloudflare token with Zone DNS edit permission
- Dev servers run with `npm run dev:live`

## Quick Verification (2 minutes)
1. Open `https://api.bongbari.com/api/version`
2. Confirm response includes `healthy`
3. Confirm app features using API are working

If all 3 pass, you are fully agentic-ready.
