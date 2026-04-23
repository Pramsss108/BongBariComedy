$ErrorActionPreference = 'Stop'
$r = Invoke-WebRequest -Uri "http://localhost:5173/bb-cosmic-core.js" -UseBasicParsing -TimeoutSec 10
Write-Host "Status: $($r.StatusCode)  Size: $($r.Content.Length) bytes" -ForegroundColor Cyan
$c = $r.Content
$syms = @(
  'showSettings','showWinCard','showPauseMenu','showResumeCountdown','shareScorePNG',
  'spawnBishesh','spawnHeart','drawBishesh','drawHeart','finalizeRunStats',
  'checkAchievements','anticheatTick','telemetryRecordRun','recordInput','setLang',
  'ACHIEVEMENTS','STRINGS','PROFILE','saveProfile',
  'BISHESH_DURATION_FRAMES','WIN_DISTANCE_M','HEART_EVERY_SCORE','PROFILE_KEY',
  'bb-gear','bb-sheet','bb-countdown','bb-achv','endlessMode','onboarding'
)
$miss = 0
foreach ($s in $syms) {
  $ok = $c.Contains($s)
  if (-not $ok) { $miss++ }
  $tag = if ($ok) { 'OK     ' } else { 'MISSING' }
  $col = if ($ok) { 'Green' } else { 'Red' }
  Write-Host ("  {0}  {1}" -f $tag, $s) -ForegroundColor $col
}
Write-Host ""
if ($miss -eq 0) {
  Write-Host "ALL $($syms.Count) SYMBOLS PRESENT" -ForegroundColor Green
} else {
  Write-Host "$miss MISSING" -ForegroundColor Red
  exit 1
}
