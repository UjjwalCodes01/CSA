# CSA Backend - x402 Agents

Backend agents for Cronos Sentinel Agent (CSA) hackathon project.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Edit `.env` file with your credentials (already configured).

### 3. Run x402 Demo

**Terminal 1** - Start mock x402 service:
```bash
npm run mock-service
```

**Terminal 2** - Run x402 handshake demo:
```bash
npm run demo
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── agents/
│   │   └── executioner.js      # x402 payment handler
│   ├── services/
│   │   └── mock-audit-service.js  # Mock paid service
│   ├── test/
│   │   ├── demo-x402.js        # Full x402 demo
│   │   └── test-x402-handshake.js  # Simple test
│   └── abi/
│       └── SentinelClamp.js    # Contract ABI
├── .env                        # Configuration
└── package.json
```

## 🔧 Components

### Executioner Agent
- Handles x402 payment protocol
- Interacts with SentinelClamp contract
- Manages payment proofs
- Retries requests after payment

### Mock x402 Service
- Simulates paid API service
- Returns 402 Payment Required
- Validates payment proofs
- Returns audit data after payment

## 📋 NPM Scripts

- `npm run mock-service` - Start mock x402 service
- `npm run demo` - Run full x402 handshake demo
- `npm test` - Run simple test
- `npm start` - Start main backend (TBD)

## 🎯 Day 3-4 Milestone

✅ x402 handshake implemented  
✅ Agent pays via SentinelClamp  
✅ Service validates payment  
✅ End-to-end demo working

**Next:** Day 5-7 - VVS Finance Integration

## 🔗 Links

- SentinelClamp Contract: `0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff`
- Cronos Testnet: https://evm-t3.cronos.org
- Explorer: https://explorer.cronos.org/testnet
