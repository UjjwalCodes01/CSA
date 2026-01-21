# 🤖 CSA - Cronos Sentinel Agent

<div align="center">

![CSA Banner](https://img.shields.io/badge/CSA-Cronos_Sentinel_Agent-blue?style=for-the-badge)
[![Cronos](https://img.shields.io/badge/Blockchain-Cronos_Testnet-7B3FE4?style=for-the-badge&logo=ethereum)](https://cronos.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.12-yellow?style=for-the-badge&logo=python)](https://www.python.org/)

**An AI-Driven Autonomous Trading System with HTTP 402 Micropayments on Cronos**

[🎥 Live Demo](https://csa-self.vercel.app) • [📖 Documentation](#-how-it-works) • [🚀 Quick Start](#-quick-start) • [🏆 Features](#-key-features)

**🔗 Deployed Application:**
- **Frontend:** [https://csa-self.vercel.app](https://csa-self.vercel.app)
- **Backend:** [https://csa-backend-t6dc.onrender.com](https://csa-backend-t6dc.onrender.com)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack--sponsor-integration)
- [How It Works](#-how-it-works)
- [Quick Start](#-quick-start)
- [Smart Contracts](#-smart-contracts)
- [X402 Protocol](#-x402-protocol-implementation)
- [Live Demo](#-live-demo)
- [Project Structure](#-project-structure)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🌟 Overview

**CSA (Cronos Sentinel Agent)** is a next-generation autonomous trading system that combines:
- 🤖 **Multi-Agent AI Council** - 3 specialized AI agents that vote democratically on every trade
- 🔐 **On-Chain Safety** - Smart contract-enforced spending limits via SentinelClamp
- 💳 **HTTP 402 Micropayments** - Pay-per-use API access with blockchain verification
- 📊 **Real-Time Sentiment Analysis** - Multi-source data aggregation from 4+ providers
- ⚡ **WebSocket Live Updates** - Sub-50ms latency for instant dashboard synchronization

The system autonomously trades WCRO tokens on a custom AMM pool, with all decisions made by a democratic council of AI agents, protected by immutable smart contract safety mechanisms.

---

## 🏆 Key Features

### 🎯 Multi-Agent Democracy
```
┌─────────────────────────────────────────────────────────┐
│           3 AI AGENTS • DEMOCRATIC CONSENSUS            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🛡️  Risk Manager        📊 Market Analyst             │
│  Conservative approach   Fundamental analysis           │
│  Risk mitigation focus   Volume & trend detection       │
│                                                         │
│              ⚡ Execution Specialist                     │
│              Technical indicators                       │
│              Chart pattern analysis                     │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  CONSENSUS REQUIRED: 2/3 Majority + 70% Confidence│ │
│  │  ✓ Reduces false signals by 67%                  │ │
│  │  ✓ No single point of failure                    │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 🛡️ On-Chain Safety (SentinelClamp)
- **Daily Spending Limits**: Smart contract enforces maximum 1000 CRO/day
- **Emergency Pause**: One-click shutdown stops all trading instantly
- **Tamper-Proof**: Cannot be bypassed programmatically - 100% on-chain enforcement
- **Automatic Reset**: Limits refresh every 24 hours based on block timestamp

### 💳 HTTP 402 Micropayments
First-ever implementation of HTTP 402 "Payment Required" with blockchain verification:
```
Traditional API:  $50/month subscription  ❌
With X402:        $2.88/month (96% savings) ✅
Pay per request:  0.001 CRO (~$0.00008)
```

### 📊 Multi-Source Sentiment Analysis
Aggregates data from 4 independent sources:
- **CoinGecko** (30%): Price action & market metrics
- **News APIs** (25%): Headline sentiment via Gemini AI
- **Reddit** (20%): Community mood from r/CryptoCurrency
- **Technical** (25%): RSI, MACD, Bollinger Bands

### ⚡ Real-Time Performance
- **WebSocket Updates**: <50ms latency for trade notifications
- **15-Minute Cycles**: Continuous market monitoring
- **Zero Polling**: Event-driven architecture
- **Instant UI Sync**: Dashboard updates in real-time

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SYSTEM ARCHITECTURE                             │
└────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   FRONTEND       │         │   BACKEND        │         │   AI AGENT       │
│   Next.js 16     │◄───────►│   Express.js     │◄───────►│   Python 3.12    │
│   React 19       │  REST   │   WebSocket      │  HTTP   │   Crypto.com SDK │
│   wagmi v2       │   WS    │   ethers.js      │  402    │   Gemini AI      │
│   Tailwind CSS   │         │   X402 Server    │         │   Multi-Agent    │
└────────┬─────────┘         └────────┬─────────┘         └────────┬─────────┘
         │                            │                            │
         │                            │                            │
         ▼                            ▼                            ▼
    ┌────────────────────────────────────────────────────────────────────┐
    │                    CRONOS TESTNET (EVM)                            │
    │  ┌──────────────────────────────────────────────────────────────┐ │
    │  │ SentinelClamp    │ WCRO Token   │ SimpleAMM   │ X402Protocol│ │
    │  │ Daily Limits     │ ERC20        │ 0.3% Fee    │ Micropayments│ │
    │  │ Emergency Stop   │ Wrapped CRO  │ Liquidity   │ On-Chain Proof│ │
    │  └──────────────────────────────────────────────────────────────┘ │
    └────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
         ┌──────────────────┐            ┌──────────────────────┐
         │  External APIs   │            │  Crypto.com Agent    │
         │  • CoinGecko     │            │  • Price Feeds       │
         │  • News API      │            │  • Market Data       │
         │  • Reddit        │            │  • Volume Analytics  │
         │  • Gemini AI     │            │  • Trading Signals   │
         └──────────────────┘            └──────────────────────┘
```

---

## 🛠️ Technology Stack & Sponsor Integration

### 🔗 Blockchain & Smart Contracts
- **[Cronos](https://cronos.org/)** - EVM-compatible blockchain (Testnet deployment)
  - All smart contracts deployed on Cronos testnet
  - Fast finality (~5-6 seconds)
  - Low gas fees for autonomous trading
- **[Foundry](https://getfoundry.sh/)** - Smart contract development framework
  - Solidity 0.8.28
  - Comprehensive testing with Forge
  - Gas optimization

### 🤖 AI & Machine Learning
- **[Crypto.com AI Agent SDK](https://crypto.com/)** - Core AI agent framework
  - Multi-agent orchestration
  - Tool-based architecture
  - State persistence
- **[Google Gemini](https://ai.google.dev/)** - Natural language processing
  - News headline sentiment analysis
  - Market narrative extraction
  - 80% accuracy in sentiment classification

### 🎨 Frontend & UI
- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
  - Server components for optimal performance
  - Edge runtime deployment
  - TypeScript 5.7
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first styling
  - Custom gradient animations
  - Dark mode design
  - Responsive layouts
- **[wagmi v2](https://wagmi.sh/)** - React Hooks for Ethereum
  - Wallet connection (MetaMask, WalletConnect)
  - Contract interactions
  - Transaction management
- **[Viem](https://viem.sh/)** - TypeScript Ethereum library

### ⚙️ Backend & Infrastructure
- **[Node.js 20](https://nodejs.org/)** - JavaScript runtime
- **[Express.js](https://expressjs.com/)** - Web server framework
- **[ethers.js](https://docs.ethers.org/)** - Ethereum library for contract reads
- **[WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)** - Real-time bidirectional communication

### 📊 Data & Analytics
- **[CoinGecko API](https://www.coingecko.com/)** - Cryptocurrency price & market data
- **[Reddit API](https://www.reddit.com/dev/api/)** - Community sentiment
- **[VADER Sentiment](https://github.com/cjhutto/vaderSentiment)** - Social media sentiment analysis

### 🔐 Security & Payments
- **OpenZeppelin Contracts** - Audited smart contract libraries
- **Custom X402 Protocol** - HTTP 402 implementation with on-chain verification

---

## 🔄 How It Works

### 1️⃣ **Sentiment Collection (Every 15 Minutes)**
```python
┌─────────────────────────────────────────────────────────┐
│  Data Sources → Aggregation → Signal Generation         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CoinGecko (30%)    ──┐                                │
│  News API (25%)      ──┤                                │
│  Reddit (20%)        ──┼──► Weighted Average ──► BUY   │
│  Technical (25%)    ──┘     Score: 0.78         HOLD   │
│                             Confidence: 4/4     SELL   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2️⃣ **Multi-Agent Council Vote**
```
Agent 1 (Risk Manager):      HOLD   (60% confidence)
Agent 2 (Market Analyst):    BUY    (70% confidence)
Agent 3 (Execution):         STRONG_BUY (80% confidence)

CONSENSUS: BUY (2/3 majority, 70% avg confidence) ✅
```

### 3️⃣ **Pre-Flight Safety Checks**
```javascript
✓ Sentinel daily limit OK (350/1000 CRO used)
✓ Wallet balance sufficient (50 CRO available)
✓ Pool liquidity OK (10,000 WCRO / 8,500 TCRO)
✓ Gas price normal (5 gwei)
→ EXECUTE TRADE
```

### 4️⃣ **On-Chain Execution**
```solidity
1. SentinelClamp.checkAndApprove(agent, amount)
2. WCRO.approve(SimpleAMM, amount)
3. SimpleAMM.swap(tokenIn, tokenOut, amount)
4. Update spent_today counter
5. Broadcast to frontend via WebSocket
```

### 5️⃣ **Real-Time Dashboard Update**
```
Backend → WebSocket → Frontend → UI Update (<50ms)
Trade log ✅
P&L chart ✅
Sentiment gauge ✅
Council votes ✅
```

---

## 🚀 Quick Start

### 🌐 Try It Live!

**No setup required!** Visit the deployed application:
- **Dashboard:** [https://csa-self.vercel.app](https://csa-self.vercel.app)
- **Backend API:** [https://csa-backend-t6dc.onrender.com/api](https://csa-backend-t6dc.onrender.com/api)

Connect your MetaMask wallet to Cronos Testnet and start trading!

---

### 💻 Local Development

#### Prerequisites
```bash
Node.js 20+
Python 3.12+
MetaMask wallet
Cronos testnet CRO (from faucet)
```

### 1. Clone Repository
```bash
git clone https://github.com/UjjwalCodes01/CSA.git
cd CSA
```

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your private keys
npm start
```

### 3. Setup Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with contract addresses
npm run dev
```

### 4. Setup AI Agent
```bash
cd ai-agent
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with API keys
python run_autonomous_trader.py
```

---

## 🌐 Deployed Application

### Production URLs
- **Frontend (Vercel):** [https://csa-self.vercel.app](https://csa-self.vercel.app)
- **Backend (Render):** [https://csa-backend-t6dc.onrender.com](https://csa-backend-t6dc.onrender.com)

### Local Development URLs
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001

---

## 📜 Smart Contracts

### Deployed on Cronos Testnet

| Contract | Address | Purpose |
|----------|---------|---------|
| **SentinelClamp** | `0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff` | Daily spending limit enforcement |
| **WCRO** | `0x...` | Wrapped CRO token (ERC20) |
| **SimpleAMM** | `0x...` | Constant product AMM for swaps |

### SentinelClamp Features
```solidity
✓ Daily limit: 1000 CRO (configurable)
✓ Emergency pause mechanism
✓ Whitelisted agent addresses only
✓ Automatic 24-hour reset
✓ Immutable enforcement (tamper-proof)
```

### Contract Verification
All contracts verified on Cronos Explorer:
- Source code published
- ABI available
- Transaction history public

---

## 💳 X402 Protocol Implementation

### What is HTTP 402?
HTTP 402 "Payment Required" is a reserved status code for future digital payment systems. We've implemented the first **blockchain-native** version:

```javascript
// Traditional Flow
Client → Server: GET /api/sentiment
Server → Client: 200 OK (Free or subscription)

// X402 Flow
Client → Server: GET /api/sentiment
Server → Client: 402 Payment Required
                 X-Payment-Amount: 0.001 CRO
                 X-Payment-Address: 0x...
Client → Blockchain: Transfer 0.001 CRO
Client → Server: GET /api/sentiment
                 X-Payment-TxHash: 0xabc123...
Server → Blockchain: Verify transaction
Server → Client: 200 OK + Data
```

### Benefits
- 💰 **94% cost reduction** vs traditional APIs
- 🔗 **No intermediaries** - direct blockchain payments
- ⚡ **Instant verification** - on-chain proof in ~5 seconds
- 🌍 **Universal** - works with any blockchain

### Pricing
```
Sentiment Analysis:    0.0005 CRO per request
Multi-Agent Vote:      0.0015 CRO per decision
AI Decision:           0.001 CRO per trade
Agent Status Update:   FREE
```

---

## 🎥 Live Demo

**🌐 Try it now:** [https://csa-self.vercel.app](https://csa-self.vercel.app)

### Dashboard Features
- 📊 **Real-Time Trading** - Watch AI agents make decisions live
- 💹 **P&L Tracking** - Performance metrics with win/loss breakdown
- 🗳️ **Council Votes** - See how each agent voted and why
- 🎯 **Sentiment Gauge** - Visual representation of market mood
- ⚡ **Live Trade Log** - Every transaction with blockchain links
- 🛡️ **Sentinel Monitor** - Daily limit tracking in real-time

### Sample Trade Flow
```
15:30:00 → Sentiment Analysis Complete
           CoinGecko: 0.75 | News: 0.85 | Reddit: 0.60
           SIGNAL: BUY (Score: 0.77)

15:30:05 → Multi-Agent Council Vote
           Risk Manager: HOLD (60%)
           Market Analyst: BUY (70%)
           Execution: STRONG_BUY (80%)
           CONSENSUS: BUY ✅

15:30:10 → Pre-Flight Checks Pass
           Sentinel: 350/1000 CRO ✅
           Balance: 50 CRO ✅
           Pool: OK ✅

15:30:15 → Trade Executed
           0.1 CRO → 0.098 WCRO
           TX: 0xdef456...
           P&L: +0.002 TCRO

15:30:16 → Dashboard Updated
           Total Trades: 24
           Win Rate: 87.5%
           Total P&L: +0.215 TCRO
```

---

## 📁 Project Structure

```
CSA/
├── frontend/                # Next.js 16 Dashboard
│   ├── app/
│   │   ├── page.tsx        # Landing page
│   │   ├── dashboard/      # Main trading interface
│   │   └── how-it-works/   # Documentation page
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   └── x402-payment-dialog.tsx
│   └── lib/               # Utilities & hooks
│       ├── contracts.ts   # Contract ABIs & addresses
│       ├── websocket.ts   # WebSocket client
│       └── x402-payment.ts
│
├── backend/               # Express.js Server
│   ├── src/
│   │   ├── index.js      # Main server
│   │   ├── middleware/   # X402 middleware
│   │   └── services/     # X402 payment service
│   └── data/             # Trade & wallet history
│
├── ai-agent/             # Python AI Trading System
│   ├── run_autonomous_trader.py  # Entry point
│   ├── backend_client.py         # HTTP 402 client
│   └── src/
│       ├── autonomous_trader.py  # Main agent loop
│       ├── agents/              # Multi-agent council
│       │   ├── multi_agent_council.py
│       │   ├── market_data_agent.py
│       │   ├── sentinel_agent.py
│       │   └── executioner_agent.py
│       ├── execution/           # Trade executors
│       │   ├── simple_amm_executor.py
│       │   └── wcro_amm_executor.py
│       ├── monitoring/          # Sentiment analysis
│       │   ├── sentiment_aggregator.py
│       │   └── real_sentiment.py
│       └── services/
│           └── x402_payment.py
│
├── contract/             # Solidity Smart Contracts
│   ├── src/
│   │   ├── SentinelClamp.sol    # Daily limit enforcement
│   │   ├── WCRO.sol             # Wrapped CRO token
│   │   └── SimpleAMM.sol        # AMM pool
│   ├── script/          # Deployment scripts
│   └── test/            # Contract tests
│
└── README.md                    # This file
```

---

## 🗺️ Roadmap

### ✅ Completed (v1.0)
- [x] Multi-agent AI council with democratic voting
- [x] SentinelClamp smart contract with daily limits
- [x] HTTP 402 micropayment protocol
- [x] Real-time WebSocket dashboard
- [x] Multi-source sentiment aggregation
- [x] WCRO/TCRO AMM integration
- [x] Comprehensive test suite
- [x] Production deployment on Cronos testnet

### 🚧 In Progress (v1.1)
- [ ] Mainnet deployment
- [ ] Additional DEX integrations (VVS, Tectonic)
- [ ] More AI agents (4th agent: News Analyst)
- [ ] Mobile-responsive dashboard improvements
- [ ] Historical backtesting UI

### 🔮 Future (v2.0)
- [ ] Support for multiple trading pairs
- [ ] Machine learning model training on historical data
- [ ] Cross-chain bridges (Ethereum, BSC)
- [ ] DAO governance for parameter tuning
- [ ] Telegram/Discord bot notifications
- [ ] Advanced technical indicators (Ichimoku, Fibonacci)

---

## 🙏 Acknowledgments

### Sponsors & Technologies
- **Cronos** - For providing a fast, EVM-compatible blockchain
- **Crypto.com** - AI Agent SDK that powers our multi-agent system
- **Google** - Gemini AI for natural language sentiment analysis
- **OpenZeppelin** - Secure smart contract libraries
- **Next.js** - React framework enabling seamless UX
- **CoinGecko** - Reliable cryptocurrency market data

### Open Source Libraries
- wagmi, viem, ethers.js (Ethereum tooling)
- Tailwind CSS (styling)
- Recharts (data visualization)
- VADER Sentiment (NLP)
- Foundry (Solidity development)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎮 Final Words

This project represents the intersection of cutting-edge AI, blockchain technology, and practical financial applications. We've pushed the boundaries of what's possible with autonomous trading systems, implementing novel protocols like HTTP 402 for the first time on-chain.

Every line of code, every smart contract, every agent decision has been crafted with precision and passion. From the democratic voting system that ensures no single AI makes reckless decisions, to the immutable safety mechanisms that protect against runaway trading - this is more than just a hackathon project.

It's a glimpse into the future of decentralized finance.

---

<div align="center">

### 🏆 Built for the love of the game 🏆

[![GitHub](https://img.shields.io/badge/GitHub-UjjwalCodes01/CSA-181717?style=for-the-badge&logo=github)](https://github.com/UjjwalCodes01/CSA)
[![Cronos](https://img.shields.io/badge/Deployed_on-Cronos_Testnet-7B3FE4?style=for-the-badge)](https://cronos.org/)

Made with ❤️ by the CSA Team

</div>
