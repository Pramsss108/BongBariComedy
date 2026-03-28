@echo off
title Beast Harvest - Local Proxy Engine
echo.
echo  ====================================================
echo   BEAST HARVEST - Local Proxy Hunting Engine
echo  ====================================================
echo.
echo  Starting local beast server on port 9877...
echo  API target: http://localhost:5000
echo  Press Ctrl+C to stop.
echo.
cd /d "%~dp0"
node beast_harvest.mjs --mode=server --api=http://localhost:5000
pause
