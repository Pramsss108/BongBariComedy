# Full Agentic Control Plan

## Step 1: Open required pages
1. Open Cloudflare API Tokens: [https://dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Open GitHub repo secrets: [https://github.com/Pramsss108/BongBariComedy/settings/secrets/actions](https://github.com/Pramsss108/BongBariComedy/settings/secrets/actions)
3. Open GitHub Actions list: [https://github.com/Pramsss108/BongBariComedy/actions](https://github.com/Pramsss108/BongBariComedy/actions)
4. Open Cloudflare DNS: [https://dash.cloudflare.com/?to=/:account/:zone/dns/records](https://dash.cloudflare.com/?to=/:account/:zone/dns/records)

## Step 2: Create Cloudflare token
1. On API Tokens page click Create Token.
2. Choose Edit zone DNS template.
3. Set permissions:
   - Zone Read
   - Zone DNS Edit
4. Set zone scope to bongbari.com only.
5. Create token.
6. Copy token.

## Step 3: Save token in GitHub
1. Open Actions secrets page: [https://github.com/Pramsss108/BongBariComedy/settings/secrets/actions](https://github.com/Pramsss108/BongBariComedy/settings/secrets/actions)
2. Click New repository secret.
3. Name: CLOUDFLARE_API_TOKEN
4. Secret value: paste token from Step 2.
5. Click Add secret.

## Step 4: Run one-click DNS switch workflow
1. Open workflow page: [https://github.com/Pramsss108/BongBariComedy/actions/workflows/cloudflare-dns-switch.yml](https://github.com/Pramsss108/BongBariComedy/actions/workflows/cloudflare-dns-switch.yml)
2. Click Run workflow.
3. Select branch: main.
4. Set target_backend:
   - hetzner for normal production
   - oracle for rollback
   - custom for manual IP
5. Leave api hostname as api.bongbari.com.
6. Click Run workflow.

## Step 5: Verify DNS + health
1. Open workflow runs: [https://github.com/Pramsss108/BongBariComedy/actions/workflows/cloudflare-dns-switch.yml](https://github.com/Pramsss108/BongBariComedy/actions/workflows/cloudflare-dns-switch.yml)
2. Open latest run.
3. Confirm green status.
4. Open API health URL: [https://api.bongbari.com/api/version](https://api.bongbari.com/api/version)
5. Confirm response contains healthy.

## Step 6: Standard deploy flow (no manual server work)
1. Push code to main.
2. Open deploy workflow: [https://github.com/Pramsss108/BongBariComedy/actions/workflows/deploy.yml](https://github.com/Pramsss108/BongBariComedy/actions/workflows/deploy.yml)
3. Confirm run is green.
4. Re-check API health: [https://api.bongbari.com/api/version](https://api.bongbari.com/api/version)

## Step 7: Emergency rollback flow
1. Open DNS switch workflow: [https://github.com/Pramsss108/BongBariComedy/actions/workflows/cloudflare-dns-switch.yml](https://github.com/Pramsss108/BongBariComedy/actions/workflows/cloudflare-dns-switch.yml)
2. Click Run workflow.
3. Set target_backend to oracle or custom.
4. Run workflow.
5. Check API health: [https://api.bongbari.com/api/version](https://api.bongbari.com/api/version)

## Step 8: Fixed rules to keep
1. Keep DNS record api -> 78.47.104.43 with proxied enabled.
2. Keep API origin port rewrite rule disabled.
3. Do not change CNAME unless you intentionally migrate domain.
4. Keep secrets in GitHub Actions only.
