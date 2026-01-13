# 🚀 How to Start the Backend

## Method 1: Quick Start (Windows)

### Option A: Start Backend Only
```bash
cd backend
start.bat
```

### Option B: Start Everything (Backend + Frontend)
```bash
# From project root
start-all.bat
```

This will automatically:
1. ✅ Install dependencies
2. ✅ Start backend server on http://localhost:3001
3. ✅ Start frontend on http://localhost:3000

---

## Method 2: Manual Start (Any OS)

### 1. Install Dependencies
```bash
cd backend
npm install
```

Required packages:
- `express` - Web server
- `ws` - WebSocket server
- `cors` - Cross-origin requests
- `ethers` - Blockchain interaction
- `dotenv` - Environment variables

### 2. Configure Environment
Edit `backend/.env`:
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
CRONOS_TESTNET_RPC=https://evm-t3.cronos.org
SENTINEL_ADDRESS=0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
MOCK_ROUTER_ADDRESS=0x3796754AC5c3b1C866089cd686C84F625CE2e8a6
WCRO_ADDRESS=0x5C7F8a570d578ED84e63FdFA7b5a2f628d2B4d2A
TUSD_ADDRESS=0xc21223249CA28397B4B6541dfFaECc539BfF0c59
```

### 3. Start Backend
```bash
npm start
```

You should see:
```
🚀 CSA Backend Server Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 REST API:     http://localhost:3001/api
🔌 WebSocket:    ws://localhost:3001/ws
🌐 Frontend:     http://localhost:3000
⛓️  Network:      Cronos Testnet
📝 Sentinel:     0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Endpoints:
   GET  /api/health
   GET  /api/agent/status
   GET  /api/wallet/balances?address=0x...
   GET  /api/market/price
   GET  /api/market/sentiment
   GET  /api/trades/history
   GET  /api/trades/pending
   POST /api/agent/emergency-stop
   POST /api/trades/approve
```

---

## Testing the Backend

### 1. Health Check
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-13T10:30:00.000Z",
  "network": "cronos-testnet"
}
```

### 2. Get Agent Status
```bash
curl http://localhost:3001/api/agent/status
```

### 3. Get Wallet Balances
```bash
curl "http://localhost:3001/api/wallet/balances?address=0xYourWalletAddress"
```

### 4. Get Market Price
```bash
curl http://localhost:3001/api/market/price
```

### 5. Test WebSocket (Browser Console)
```javascript
const ws = new WebSocket('ws://localhost:3001/ws');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (event) => console.log('Received:', JSON.parse(event.data));
```

---

## What the Backend Does

### ✅ REST API Server
- Serves market data, sentiment, balances
- Handles emergency stop commands
- Manages trade approvals
- Provides agent status

### ✅ WebSocket Server
- Real-time agent status updates
- Live trade event broadcasting
- Sentiment update streaming
- Bidirectional communication with frontend

### ✅ Blockchain Integration
- Connects to Cronos Testnet
- Reads from SentinelClamp contract
- Queries WCRO and tUSD balances
- Monitors on-chain state

### ✅ Agent State Management
- Tracks agent status (idle/analyzing/executing/stopped)
- Maintains trade history
- Stores pending approvals
- Broadcasts state changes

---

## Integration with AI Agent

The backend is ready to integrate with your AI agent. Two options:

### Option 1: Python AI Agent Auto-Start (Commented Out)
Uncomment line 364 in `backend/src/index.js`:
```javascript
startAIAgent();  // Auto-starts Python AI agent
```

### Option 2: Manual AI Agent Start
```bash
# In a separate terminal
cd ai-agent
python run_autonomous_trader.py
```

The AI agent will:
- Monitor sentiment every 5 minutes
- Make autonomous trading decisions
- Send updates to backend via MCP/API calls
- Backend broadcasts to frontend via WebSocket

---

## Integration with Frontend

Your frontend is already configured! Just make sure:

### ✅ Frontend `.env.local` has:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
```

### ✅ Start Frontend:
```bash
cd frontend
npm run dev
```

Visit http://localhost:3000 and you'll see:
- ✅ Agent status indicator (connected to backend WebSocket)
- ✅ Real-time sentiment updates
- ✅ Live trade events
- ✅ Emergency stop button (sends command to backend)

---

## Architecture Flow

```
┌──────────────────┐
│   FRONTEND       │  http://localhost:3000
│   (Next.js)      │
│                  │
│  • Dashboard     │
│  • Charts        │
│  • Wallet        │
└────────┬─────────┘
         │
         ├─── HTTP REST API
         │    (market data, balances, trades)
         │
         └─── WebSocket
              (real-time updates)
              │
┌─────────▼────────────┐
│   BACKEND SERVER     │  http://localhost:3001
│   (Express + WS)     │
│                      │
│  • API Endpoints     │
│  • WebSocket Server  │
│  • State Manager     │
└──────────┬───────────┘
           │
           ├─── Web3 (ethers.js)
           │    │
           │    ▼
           │  ┌────────────────────┐
           │  │  CRONOS TESTNET    │
           │  │                    │
           │  │  • SentinelClamp   │
           │  │  • WCRO/tUSD       │
           │  └────────────────────┘
           │
           └─── Calls/Listens
                │
                ▼
              ┌──────────────────┐
              │   AI AGENT       │
              │   (Python)       │
              │                  │
              │  • MCP Tools     │
              │  • Sentiment     │
              │  • Trading Logic │
              └──────────────────┘
```

---

## Troubleshooting

### Port 3001 already in use
```bash
# Windows: Kill process on port 3001
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or change port in .env
PORT=3002
```

### CORS errors
Make sure `backend/.env` has:
```env
FRONTEND_URL=http://localhost:3000
```

### WebSocket won't connect
1. Backend must be running
2. Check URL in frontend: `ws://localhost:3001/ws`
3. Verify no firewall blocking

### Dependencies not installing
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Production Deployment

### Railway / Render / Heroku
```bash
# Deploy backend directory
# Set environment variables in dashboard
PORT=3001
FRONTEND_URL=https://your-frontend.vercel.app
CRONOS_TESTNET_RPC=https://evm-t3.cronos.org
# ... (all contract addresses)
```

### Update frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app/ws
```

---

## Next Steps

1. ✅ **Start backend** (port 3001)
2. ✅ **Start frontend** (port 3000)
3. ✅ **Connect wallet** in frontend
4. ✅ **Watch real-time updates** in dashboard
5. ✅ **Start AI agent** for autonomous trading (optional)

**Backend is now fully connected to your frontend and ready for AI agent integration! 🎉**
