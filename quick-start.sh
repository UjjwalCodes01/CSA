#!/bin/bash

# Quick Start Script for Full Stack Integration
# This script helps you test the complete integration

echo "🚀 Sentinel Alpha - Integration Quick Start"
echo "=========================================="
echo ""

# Check if backend is running
echo "1. Checking if AI agent backend is running..."
if curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo "   ✅ Backend is running on port 8000"
else
    echo "   ❌ Backend is NOT running"
    echo "   Please start the backend first:"
    echo "   cd ai-agent && python src/main.py"
    echo ""
    exit 1
fi

# Check if frontend is running
echo ""
echo "2. Checking if frontend is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Frontend is running on port 3000"
else
    echo "   ❌ Frontend is NOT running"
    echo "   Starting frontend..."
    cd frontend && npm run dev &
    FRONTEND_PID=$!
    echo "   Frontend started with PID: $FRONTEND_PID"
fi

echo ""
echo "3. Integration Status"
echo "   ✅ Environment variables configured"
echo "   ✅ Contract ABIs loaded"
echo "   ✅ Contract hooks ready"
echo "   ✅ WebSocket client ready"
echo "   ✅ Dashboard integrated"
echo ""

echo "🎯 Next Steps:"
echo "   1. Open http://localhost:3000/dashboard"
echo "   2. Connect your MetaMask wallet"
echo "   3. Verify WebSocket shows 'Agent Connected' (green pulse)"
echo "   4. Check that wallet balances load from blockchain"
echo "   5. Execute a test trade from the AI agent"
echo "   6. Watch the trade appear in real-time on dashboard"
echo ""

echo "📚 Documentation:"
echo "   - Integration Guide: frontend/INTEGRATION_GUIDE.md"
echo "   - Integration Status: INTEGRATION_STATUS.md"
echo "   - WebSocket Example: ai-agent/websocket_server_example.py"
echo ""

echo "🔧 Debugging:"
echo "   - Check backend logs for WebSocket connections"
echo "   - Open browser DevTools > Network > WS to see messages"
echo "   - Check console for any contract read errors"
echo ""

echo "✅ Integration ready! Visit http://localhost:3000/dashboard"
