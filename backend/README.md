# ⚙️ Backend - Express.js API Server

The central coordination layer connecting AI agents, smart contracts, and the frontend dashboard with real-time WebSocket communication and HTTP 402 payment verification.

---

## 📋 Overview

Features:
- 🔌 **WebSocket Server**: Real-time bidirectional communication (<50ms latency)
- 💳 **X402 Middleware**: HTTP 402 payment verification for protected endpoints
- 📊 **State Management**: Aggregates data from AI agent and blockchain
- 🔗 **Contract Integration**: Reads on-chain data via ethers.js
- 📡 **Event Broadcasting**: Pushes updates to all connected clients

---

## 🏗️ Architecture

```
AI Agent (Python) ──HTTP 402──► Express.js REST API
                                      │
Frontend (Next.js) ◄──WebSocket──────┤
                                      │
                              ethers.js Contract Reads
                                      │
                              Cronos Testnet Contracts
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Cronos testnet RPC access
- Private key for X402 payments

### Installation

```bash
cd backend
npm install
cp .env.example .env
# Edit .env
npm start
```

### Environment Variables

```env
PORT=3001
NODE_ENV=development
RPC_URL=https://evm-t3.cronos.org
BACKEND_PRIVATE_KEY=0x...
SENTINEL_CLAMP_ADDRESS=0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
WCRO_ADDRESS=0x7D7c0E58a280e70B52c8299d9056e0394Fb65750
SIMPLE_AMM_ADDRESS=0x70a021E9A1C1A503A77e3279941793c017b06f46
MOCK_ROUTER_ADDRESS=0x3796754AC5c3b1C866089cd686C84F625CE2e8a6
FRONTEND_URL=http://localhost:3000
X402_ENABLED=true
X402_DEV_MODE=false
```

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.js                      # Main server
│   ├── middleware/
│   │   └── x402-middleware.js        # Payment verification
│   ├── services/
│   │   ├── x402-payment-service.js   # Payment logic
│   │   └── event-monitor.js          # Blockchain events
│   └── abi/                          # Contract ABIs
├── data/                             # Trade/decision history
└── package.json
```

---

## 🔌 API Endpoints

### Public Endpoints

**Health Check**
```http
GET /health
```

**Agent Status**
```http
GET /api/agent/status
```

**Market Sentiment**
```http
GET /api/market/sentiment
```

**Trade History**
```http
GET /api/trade-history
```

**Council Votes**
```http
GET /api/council/votes
```

### Protected Endpoints (X402 Payment Required)

**Update Sentiment**
```http
POST /api/market/sentiment/update
X-Payment-TxHash: 0x...
```

**Submit Council Votes**
```http
POST /api/council/votes
X-Payment-TxHash: 0x...
```

**Submit Agent Decision**
```http
POST /api/agent/decision
X-Payment-TxHash: 0x...
```

---

## 💳 X402 Payment Flow

1. AI Agent makes request → Backend returns `402 Payment Required`
2. Agent pays on-chain → Gets transaction hash
3. Agent retries with `X-Payment-TxHash` header
4. Backend verifies on blockchain → Returns `200 OK`

---

## 🔌 WebSocket Events

Server broadcasts these events to all clients:

- `agent_status` - Agent state updates
- `trade_event` - New trades executed
- `sentiment_update` - Market sentiment changes
- `council_votes` - Multi-agent voting results
- `blockchain_event` - On-chain events

---

## 📊 Monitoring

```bash
# View logs
tail -f backend.log

# Check connections
curl http://localhost:3001/health

# Test WebSocket
node test-websocket.js
```

---

## 🚀 Deployment

### Railway / Render
1. Connect GitHub repo
2. Set environment variables
3. Deploy

### PM2 (VPS)
```bash
pm2 start src/index.js --name csa-backend
pm2 save
pm2 startup
```

---

## 📦 Dependencies

- `express` - Web framework
- `ws` - WebSocket server
- `ethers` - Blockchain interaction
- `cors` - Cross-origin requests
- `dotenv` - Environment config

---

**Built with ❤️ using Express.js & ethers.js**
