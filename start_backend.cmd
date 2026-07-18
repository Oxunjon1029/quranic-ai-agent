@echo off
echo ========================================
echo   Installing Backend Dependencies...
echo ========================================
cd /d c:\Users\softe\projects\quranic-ai-agent\backend
call npm install
echo.
echo ========================================
echo   Starting Backend Server (port 3000)
echo ========================================
call npm run start:dev
pause
