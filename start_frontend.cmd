@echo off
echo ========================================
echo   Installing Frontend Dependencies...
echo ========================================
cd /d c:\Users\softe\projects\quranic-ai-agent\frontend
call npm install
echo.
echo ========================================
echo   Starting Frontend Server (port 5173)
echo ========================================
call npm run dev
pause
