@echo off
:: BatchGotAdmin
:-------------------------------------
REM  --> Check for permissions
    IF "%PROCESSOR_ARCHITECTURE%" EQU "amd64" (
>nul 2>&1 "%SYSTEMROOT%\SysWOW64\cacls.exe" "%SYSTEMROOT%\SysWOW64\config\system"
) ELSE (
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
)

REM --> If error flag set, we do not have admin.
if '%errorlevel%' NEQ '0' (
    echo Requesting administrative privileges...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    set params= %*
    echo UAC.ShellExecute "cmd.exe", "/c ""%~s0"" %params%", "", "runas", 1 >> "%temp%\getadmin.vbs"

    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    pushd "%CD%"
    CD /D "%~dp0"
:--------------------------------------

echo ==========================================
echo      ANTIGRAVITY SYSTEM REPAIR TOOL + LOGGER
echo ==========================================
echo.
echo [1/5] Creating System Diagnostic Log (System_Debug_Log.txt)...
echo This will help diagnosie the Focusrite/USB issues.
echo --------------------------------------------------- > System_Debug_Log.txt
echo DIAGNOSTIC LOG GENERATED ON %DATE% %TIME% >> System_Debug_Log.txt
echo --------------------------------------------------- >> System_Debug_Log.txt
echo. >> System_Debug_Log.txt

echo [*] Dumping recent Critical System Errors... >> System_Debug_Log.txt
wevtutil qe System /c:20 /f:text /l:2 /rd:true >> System_Debug_Log.txt 2>&1

echo. >> System_Debug_Log.txt
echo [*] Checking Audio/Media Filter Drivers (Focusrite Check)... >> System_Debug_Log.txt
reg query "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e96c-e325-11ce-bfc1-08002be10318}" /v UpperFilters >> System_Debug_Log.txt 2>&1

echo. >> System_Debug_Log.txt
echo [*] Checking USB Controller Filters... >> System_Debug_Log.txt
reg query "HKLM\SYSTEM\CurrentControlSet\Control\Class\{36fc9e60-c465-11cf-8056-444553540000}" /v UpperFilters >> System_Debug_Log.txt 2>&1

echo Logs saved. Proceeding with Repair...
echo.

echo [2/5] Terminating malicious process...
taskkill /F /IM Antigravity.exe
echo.

echo [3/5] Repairing Keyboard Registry Filters...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e96b-e325-11ce-bfc1-08002be10318}" /v UpperFilters /t REG_MULTI_SZ /d kbdclass /f
echo.

echo [4/5] Repairing Mouse Registry Filters...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Class\{4d36e96f-e325-11ce-bfc1-08002be10318}" /v UpperFilters /t REG_MULTI_SZ /d mouclass /f
echo.

echo [5/5] Removing Startup Entry...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v Antigravity /f
echo.

echo ==========================================
echo REPAIR COMPLETE.
echo ==========================================
echo A log file "System_Debug_Log.txt" has been created in this folder.
echo If your Focusrite still has issues after reboot, check that log file.
echo.
echo PLEASE RESTART YOUR COMPUTER IMMEDIATELY.
echo.
pause
