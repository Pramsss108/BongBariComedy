Write-Host "Checking Local IP Address for Dev Access..."
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias *Wi-Fi*).IPAddress
if (!$ip) { $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" }).IPAddress | Select-Object -First 1 }

Write-Host "=========================================="
Write-Host "📱 MOBILE DEBUG URL: http://${ip}:5173"
Write-Host "=========================================="
