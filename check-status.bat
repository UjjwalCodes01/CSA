@echo off
echo ╔══════════════════════════════════════════════════════════╗
echo ║          CSA SYSTEM STATUS CHECKER                       ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

echo [1/3] Checking Backend (port 3001)...
curl -s http://localhost:3001/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend is RUNNING
    curl http://localhost:3001/api/health
) else (
    echo ❌ Backend is NOT running
    echo    Start with: cd backend ^&^& npm start
)
echo.

echo [2/3] Checking Frontend (port 3000)...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Frontend is RUNNING on http://localhost:3000
) else (
    echo ❌ Frontend is NOT running
    echo    Start with: cd frontend ^&^& npm run dev
)
echo.

echo [3/3] Checking AI Agent...
tasklist /FI "IMAGENAME eq python.exe" 2>NUL | find /I /N "python.exe">NUL
if %errorlevel% equ 0 (
    echo ✅ Python process detected (AI Agent may be running)
) else (
    echo ⚠️  No Python process found
    echo    Start with: cd ai-agent ^&^& python run_autonomous_trader.py
)
echo.

echo ════════════════════════════════════════════════════════════
echo  SYSTEM STATUS SUMMARY
echo ════════════════════════════════════════════════════════════
echo.
echo  Next steps:
echo    1. Start any missing services
echo    2. Open http://localhost:3000
echo    3. Connect your wallet
echo.
pause
