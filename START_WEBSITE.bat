@echo off
title Bong Bari Comedy - Production Server
color 0f

echo.
echo ==========================================================
echo   BONG BARI COMEDY - PRODUCTION LAUNCHER (God-Tier)
echo ==========================================================
echo.
echo [1/4] Cleaning ports (Ensuring no conflicts)...
call npx --yes kill-port 5000 5173 8888 3000

echo [2/4] Building valid production assets...
echo       (This compiles the optimization build, please wait...)
call npm run build

echo [3/4] Setting Production Environment...
set NODE_ENV=production

echo [4/4] Launching Production Server...
echo.
echo   =========================================
echo   - LIVE URL: http://localhost:5000
echo   =========================================
echo.
echo   The website will open automatically in 5 seconds...

:: Open browser in background after 5 seconds
start /b cmd /c "timeout /t 5 >nul & start http://localhost:5000"

:: Start the server (this blocks the window until closed)
npm run start
pause
