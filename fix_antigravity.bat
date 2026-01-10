@echo off
echo Starting Antigravity Repair... > repair_log.txt
echo %DATE% %TIME% >> repair_log.txt

echo [1/4] Terminating Antigravity process... >> repair_log.txt
taskkill /F /IM Antigravity.exe >> repair_log.txt 2>&1

echo [2/4] Fixing Keyboard Filters (Expected: kbdclass)... >> repair_log.txt
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e96b-e325-11ce-bfc1-08002be10318}" /v UpperFilters /t REG_MULTI_SZ /d kbdclass /f >> repair_log.txt 2>&1

echo [3/4] Fixing Mouse Filters (Expected: mouclass)... >> repair_log.txt
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e96f-e325-11ce-bfc1-08002be10318}" /v UpperFilters /t REG_MULTI_SZ /d mouclass /f >> repair_log.txt 2>&1

echo [4/4] Removing Startup Entry... >> repair_log.txt
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v Antigravity /f >> repair_log.txt 2>&1

echo Repair Complete. Please Reboot. >> repair_log.txt
type repair_log.txt
