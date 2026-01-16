@echo off
echo ========================================
echo   CDC Price Updater
echo   Crypto.com Integration (Priority #3)
echo ========================================
echo.

cd /d "%~dp0ai-agent"

echo Starting CDC Price Updater...
echo Fetching CRO prices from Crypto.com every 30 seconds
echo.

python update_cdc_prices.py

pause
