@echo off
echo ==========================================
echo      SYSTEM LOG COLLECTOR
echo ==========================================
echo.
echo Gathering recent system errors and audio diagnostics...
echo Please wait...

REM Use PowerShell to grab logs safely and save to "Crash_Logs.txt"
powershell -Command "Get-EventLog -LogName System -EntryType Error,Warning -Newest 30 | Select-Object TimeGenerated, Source, Message | Format-Table -AutoSize | Out-File 'Crash_Logs.txt' -Encoding UTF8"
powershell -Command "Get-EventLog -LogName Application -EntryType Error,Warning -Newest 30 | Select-Object TimeGenerated, Source, Message | Format-Table -AutoSize | Out-File 'Crash_Logs.txt' -Append -Encoding UTF8"

echo. >> Crash_Logs.txt
echo --- AUDIO REGISTRY CHECK --- >> Crash_Logs.txt
reg query "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e96c-e325-11ce-bfc1-08002be10318}" /v UpperFilters >> Crash_Logs.txt 2>&1

echo.
echo ==========================================
echo DONE!
echo ==========================================
echo Logs saved to: Crash_Logs.txt
echo.
echo Upload this file if you have issues.
echo.
pause
