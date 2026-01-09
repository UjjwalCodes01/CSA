#!/bin/bash
# Start both backend API and Telegram bot

echo "🚀 Starting Cronos Sentinel System"
echo "=================================="
echo ""

# Kill existing processes
echo "Stopping existing processes..."
pkill -f api-server.js 2>/dev/null
pkill -f telegram_bot.py 2>/dev/null
sleep 2

# Start backend API
echo "Starting Backend API..."
cd /home/rudra/CSA/backend
node src/api-server.js &
API_PID=$!
echo "  ✅ API Server started (PID: $API_PID)"
sleep 3

# Start Telegram bot
echo ""
echo "Starting Telegram Bot..."
cd /home/rudra/CSA/ai-agent
python3 src/telegram_bot.py &
BOT_PID=$!
echo "  ✅ Telegram Bot started (PID: $BOT_PID)"

echo ""
echo "=================================="
echo "✅ All services running!"
echo ""
echo "API Server: http://localhost:3001"
echo "Telegram Bot: @CronosSentinel_bot"
echo ""
echo "To stop: pkill -f 'api-server|telegram_bot'"
echo ""
