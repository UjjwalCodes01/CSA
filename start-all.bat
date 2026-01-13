@echo off
echo ========================================
echo    CSA FULL SYSTEM STARTUP
echo ========================================
echo.
echo This will start:
echo   1. Backend Server (port 3001)
echo   2. Frontend Dashboard (port 3000)
echo.
echo Make sure you have:
echo   [x] Node.js installed
echo   [x] Backend .env configured
echo   [x] Frontend .env.local configured
echo.
pause
echo.

cd /d "%~dp0"

echo Starting Backend Server...
start "CSA Backend" cmd /k "cd backend && npm install && npm start"

timeout /t 3 /nobreak >nul

echo Starting Frontend Dashboard...
start "CSA Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo ========================================
echo  SYSTEM STARTED!
echo ========================================
echo.
echo  Backend:  http://localhost:3001/api
echo  Frontend: http://localhost:3000
echo.
echo  Two terminal windows have opened.
echo  Close them to stop the services.
echo.
echo  To start AI Agent:
echo    cd ai-agent
echo    python run_autonomous_trader.py
echo.
pause
