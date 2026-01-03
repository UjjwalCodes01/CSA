#!/bin/bash
# Run x402 demo with service

cd /home/rudra/CSA/backend

echo "🚀 Starting x402 service..."
node src/services/facilitator-service.js > /tmp/x402-service.log 2>&1 &
SERVICE_PID=$!

echo "⏳ Waiting for service to start..."
sleep 3

echo ""
echo "🎬 Running demo..."
echo ""
node src/test/demo-x402-full.js

# Cleanup
echo ""
echo "🧹 Stopping service..."
kill $SERVICE_PID 2>/dev/null

echo "✅ Demo complete!"
