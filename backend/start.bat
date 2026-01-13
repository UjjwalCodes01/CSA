@echo off
echo ========================================
echo    CSA BACKEND SERVER - STARTUP
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Installing dependencies...
call npm install

echo.
echo [2/3] Checking environment...
if not exist .env (
    echo ERROR: .env file not found!
    echo Please create .env file with your configuration.
    pause
    exit /b 1
)

echo.
echo [3/3] Starting backend server...
echo.
echo ========================================
echo  Backend will run on http://localhost:3001
echo  WebSocket will run on ws://localhost:3001/ws
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start
