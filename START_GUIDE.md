# 🚀 Complete System Startup Guide

## Quick Start (3 Terminals)

### Terminal 1: Backend Server
```bash
cd backend
npm install
npm start
```

**What it does:**
- ✅ REST API server on http://localhost:3001
- ✅ WebSocket server on ws://localhost:3001/ws
- ✅ Real-time agent status updates
- ✅ Market data & sentiment endpoints
- ✅ Trade history & approvals

**You should see:**
```
🚀 CSA Backend Server Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 REST API:     http://localhost:3001/api
🔌 WebSocket:    ws://localhost:3001/ws
```

---

### Terminal 2: Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```

**What it does:**
- ✅ Next.js frontend on http://localhost:3000
- ✅ TradingView charts
- ✅ Wallet connection (MetaMask)
- ✅ Real-time agent status
- ✅ Autonomous trading controls

**You should see:**
```
▲ Next.js 16.1.1
- Local:        http://localhost:3000
```

---

### Terminal 3: AI Agent (Optional - Autonomous Trading)
```bash
cd ai-agent
pip install -r requirements.txt
python run_autonomous_trader.py
```

**What it does:**
- ✅ Monitors CRO sentiment every 5 minutes
- ✅ Analyzes market conditions
- ✅ Executes autonomous trades
- ✅ Respects Sentinel daily limits
- ✅ Logs decisions to `autonomous_trade_log.txt`

**To stop:** Press `Ctrl+C`

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│                   http://localhost:3000                      │
│                                                              │
│  • TradingView Charts                                       │
│  • Wallet Connection (MetaMask)                             │
│  • Real-time Agent Status                                   │
│  • Emergency Stop Controls                                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─── HTTP REST API ───────────────────────┐
                   │                                          │
                   └─── WebSocket (Real-time) ───────────────┤
                                                              │
┌─────────────────────────────────────────────────────────────▼──┐
│                    BACKEND SERVER                              │
│                  http://localhost:3001                         │
│                                                                 │
│  • REST API Endpoints                                          │
│  • WebSocket Broadcasting                                      │
│  • Web3 Integration (ethers.js)                                │
│  • Agent State Management                                      │
└─────┬──────────────────────────────────────────────────────────┘
      │
      ├─── Calls ────────────────────────────┐
      │                                       │
      ▼                                       ▼
┌─────────────────────┐            ┌──────────────────────────┐
│   AI AGENT SYSTEM   │            │   CRONOS TESTNET         │
│   (Python + MCP)    │            │   evm-t3.cronos.org      │
│                     │            │                          │
│ • Sentiment Analysis│            │ • SentinelClamp Contract │
│ • Market Data       │            │ • SimpleAMM Pool         │
│ • Trade Execution   │            │ • WCRO/tUSD Tokens       │
│ • MCP Tools (9)     │            │                          │
└─────────────────────┘            └──────────────────────────┘
```

---

## API Endpoints

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Get Agent Status
```bash
curl http://localhost:3001/api/agent/status
```

### Get Wallet Balances
```bash
curl "http://localhost:3001/api/wallet/balances?address=0xYourAddress"
```

### Get Market Price
```bash
curl http://localhost:3001/api/market/price
```

### Get Sentiment
```bash
curl http://localhost:3001/api/market/sentiment
```

### Emergency Stop
```bash
curl -X POST http://localhost:3001/api/agent/emergency-stop
```

---

## WebSocket Events

**Client → Server:**
```json
{
  "type": "command",
  "action": "emergency_stop"
}
```

**Server → Client:**
```json
{
  "type": "agent_status",
  "data": {
    "status": "analyzing",
    "lastUpdate": "2026-01-13T10:30:00Z",
    "currentAction": "Analyzing CRO sentiment...",
    "confidence": 0.85
  }
}
```

```json
{
  "type": "trade_event",
  "data": {
    "id": "trade_123",
    "type": "swap",
    "fromToken": "WCRO",
    "toToken": "tUSD",
    "amount": "0.5",
    "status": "success",
    "timestamp": "2026-01-13T10:30:00Z"
  }
}
```

```json
{
  "type": "sentiment_update",
  "data": {
    "signal": "buy",
    "score": 0.65,
    "sources": ["CoinGecko", "Price Action"],
    "timestamp": "2026-01-13T10:30:00Z"
  }
}
```

---

## Deployment Checklist

### ✅ Smart Contracts (Already Deployed)
- [x] SentinelClamp: `0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff`
- [x] MockRouter: `0x3796754AC5c3b1C866089cd686C84F625CE2e8a6`
- [x] WCRO: `0x5C7F8a570d578ED84e63FdFA7b5a2f628d2B4d2A`
- [x] tUSD: `0xc21223249CA28397B4B6541dfFaECc539BfF0c59`
- [x] SimpleAMM Pool funded with WCRO/tUSD

### ✅ Backend
- [x] REST API server created (`backend/src/index.js`)
- [x] WebSocket server integrated
- [x] Environment variables configured
- [x] Dependencies added to package.json

### ✅ Frontend
- [x] Environment variables set (`.env.local`)
- [x] Contract ABIs created (`lib/contracts.ts`)
- [x] Contract hooks created (`lib/contract-hooks.ts`)
- [x] WebSocket client ready (`lib/websocket.ts`)
- [x] Dashboard integrated
- [x] Agent status indicator in header

### ✅ AI Agent
- [x] MCP server with 9 tools (`src/mcp_server.py`)
- [x] Autonomous trader (`run_autonomous_trader.py`)
- [x] Sentiment aggregation (CoinGecko + Price Action)
- [x] Trade execution logic

---

## Testing the Integration

### 1. Test Backend API
```bash
# In backend directory
npm start
```

Open browser: http://localhost:3001/api/health

### 2. Test Frontend Connection
```bash
# In frontend directory
npm run dev
```

Open browser: http://localhost:3000

### 3. Test WebSocket (Browser Console)
```javascript
const ws = new WebSocket('ws://localhost:3001/ws');
ws.onmessage = (event) => console.log('Received:', JSON.parse(event.data));
ws.send(JSON.stringify({ type: 'command', action: 'emergency_stop' }));
```

### 4. Test Full Flow
1. Start backend
2. Start frontend
3. Connect MetaMask wallet
4. Check agent status in dashboard
5. Verify real-time updates

---

## Troubleshooting

### Backend won't start
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm start
```

### Frontend won't connect to backend
- Check backend is running on port 3001
- Verify NEXT_PUBLIC_API_URL in frontend/.env.local
- Check browser console for CORS errors

### WebSocket not connecting
- Backend must be running
- Frontend WebSocket URL: ws://localhost:3001/ws
- Check browser Network tab for WebSocket connection

### AI Agent errors
```bash
cd ai-agent
pip install --upgrade -r requirements.txt
python run_autonomous_trader.py
```

---

## Environment Variables Summary

### Backend (.env)
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
CRONOS_TESTNET_RPC=https://evm-t3.cronos.org
SENTINEL_ADDRESS=0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
MOCK_ROUTER_ADDRESS=0x3796754AC5c3b1C866089cd686C84F625CE2e8a6
WCRO_ADDRESS=0x5C7F8a570d578ED84e63FdFA7b5a2f628d2B4d2A
TUSD_ADDRESS=0xc21223249CA28397B4B6541dfFaECc539BfF0c59
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
NEXT_PUBLIC_SENTINEL_ADDRESS=0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
NEXT_PUBLIC_MOCK_ROUTER_ADDRESS=0x3796754AC5c3b1C866089cd686C84F625CE2e8a6
NEXT_PUBLIC_WCRO_ADDRESS=0x5C7F8a570d578ED84e63FdFA7b5a2f628d2B4d2A
NEXT_PUBLIC_TUSD_ADDRESS=0xc21223249CA28397B4B6541dfFaECc539BfF0c59
```

### AI Agent (.env)
```env
# Add MCP configuration if needed
GEMINI_API_KEY=your_key_here
```

---

## Production Deployment

### Backend (Railway / Heroku)
1. Set environment variables
2. Deploy `backend/` directory
3. Note the production URL

### Frontend (Vercel)
1. Connect GitHub repository
2. Set environment variables (replace localhost with production URLs)
3. Deploy

### AI Agent (Keep running locally or use cloud VM)
- For 24/7 autonomous trading, deploy to a cloud VM
- Ensure it can access the backend WebSocket endpoint

---

## Next Steps

1. ✅ **Start all 3 services** (backend, frontend, AI agent)
2. ✅ **Connect your wallet** to frontend
3. ✅ **Monitor agent status** in dashboard
4. ✅ **Watch autonomous trades** happen automatically
5. ✅ **Test emergency stop** functionality

---

## Support

- **Contracts:** Deployed on Cronos Testnet
- **Explorer:** https://explorer.cronos.org/testnet
- **RPC:** https://evm-t3.cronos.org

**Happy Trading! 🚀**
