# Sync local .env to Netlify environment variables without committing secrets
# Usage (PowerShell):
#   ./scripts/sync-netlify-env.ps1 -SiteName "bongbari" -EnvFile "server/.env"
# Requires: Netlify CLI logged in (netlify login)

param(
  [Parameter(Mandatory=$true)][string]$SiteName,
  [Parameter(Mandatory=$false)][string]$EnvFile = "server/.env"
)

if (!(Test-Path $EnvFile)) {
  Write-Error "Env file not found: $EnvFile"
  exit 1
}

# Read key=value lines, ignore comments and blanks
$lines = Get-Content $EnvFile | Where-Object { $_ -and $_ -notmatch '^\s*#' -and $_ -match '=' }

$vars = @{}
foreach ($line in $lines) {
  $kv = $line -split '=', 2
  $key = $kv[0].Trim()
  $val = $kv[1].Trim()
  if ($key) { $vars[$key] = $val }
}

# Map only keys we expect
$allowed = @(
  'GEMINI_API_KEY','JWT_SECRET','ADMIN_USER','ADMIN_PASSWORD',
  'YOUTUBE_CHANNEL_ID','YOUTUBE_API_KEY','CORS_ORIGIN'
)

foreach ($k in $allowed) {
  if ($vars.ContainsKey($k)) {
    $v = $vars[$k]
    Write-Host "Setting $k"
    npx netlify-cli env:set $k $v --site $SiteName | Out-Null
  }
}

Write-Host "Done. Triggering a deploy to apply env vars..."
# Optional: trigger deploy
npx netlify-cli deploy --site $SiteName --build --prod --message "Apply env vars" | Out-Null
Write-Host "Deploy triggered."
