# 🤖 AI Agent - Autonomous Trading System

The core autonomous trading engine powered by a multi-agent AI council, real-time sentiment analysis, and blockchain integration.

---

## 📋 Overview

This Python-based AI agent autonomously trades CRO tokens using intelligent decision-making:
- 🗳️ **Multi-Agent Council**: 3 specialized AI agents (Risk Manager, Market Analyst, Execution Specialist) vote democratically on every trade decision
- 📊 **4-Source Sentiment Analysis**: Real-time data aggregation from CoinGecko API, News APIs (via Gemini AI), Reddit (VADER sentiment), and Technical indicators (RSI, MACD)
- 💳 **X402 Protocol Integration**: On-chain micropayments for premium API access using Cronos blockchain
- ⚡ **15-Minute Trading Cycles**: Fully autonomous operation with SentinelClamp safety enforcement
- 🔗 **Backend WebSocket Updates**: Live trade notifications pushed to dashboard in real-time
- 🛡️ **Multi-Layer Safety**: Daily spending limits, circuit breakers, balance verification, and emergency pause controls

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS TRADER LOOP                       │
└─────────────────────────────────────────────────────────────────┘

Every 15 minutes:
  1. Sentiment Collection
     ├─ CoinGecko API (price, volume, trending)
     ├─ News API (headlines → Gemini sentiment)
     ├─ Reddit (community posts via VADER)
     └─ Technical (RSI, MACD, Bollinger Bands)
     
  2. Multi-Agent Council Vote
     ├─ Risk Manager (conservative, 🛡️)
     ├─ Market Analyst (fundamentals, 📊)
     └─ Execution Specialist (technical, ⚡)
     
  3. Consensus Algorithm
     └─ IF 2/3 majority AND avg_confidence > 70%
        → EXECUTE TRADE
     
  4. Pre-Flight Safety Checks
     ├─ SentinelClamp limit OK?
     ├─ Wallet balance sufficient?
     ├─ Pool liquidity OK?
     └─ Gas price normal?
     
  5. On-Chain Execution
     ├─ Approve WCRO spending
     ├─ Execute swap via SimpleAMM
     └─ Update SentinelClamp counter
     
  6. Backend Notification
     └─ Send updates via HTTP 402 protocol
```

---

## 🚀 Quick Start

### Prerequisites
```bash
Python 3.12+
pip or conda
Cronos testnet CRO
Private key with whitelisted agent wallet
```

### Installation

1. **Create Virtual Environment**
```bash
cd ai-agent
python -m venv venv

# Activate
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate     # Windows
```

2. **Install Dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure Environment**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Blockchain
AGENT_PRIVATE_KEY=0x...           # Agent wallet private key
RPC_URL=https://evm-t3.cronos.org # Cronos testnet RPC

# Smart Contracts (Cronos Testnet)
SENTINEL_CLAMP_ADDRESS=0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
WCRO_ADDRESS=0x7D7c0E58a280e70B52c8299d9056e0394Fb65750
SIMPLE_AMM_ADDRESS=0x70a021E9A1C1A503A77e3279941793c017b06f46
MOCK_ROUTER_ADDRESS=0x3796754AC5c3b1C866089cd686C84F625CE2e8a6

# AI APIs
CDC_AGENT_API_KEY=your_crypto_com_key
GEMINI_API_KEY=your_google_gemini_key

# Backend Integration
BACKEND_URL=http://localhost:3001
BACKEND_WALLET_KEY=0x...          # Backend wallet for X402 payments

# Optional: Additional Data Sources
COINGECKO_API_KEY=your_key        # Pro tier (optional)
NEWS_API_KEY=your_key             # For news sentiment
```

### Running the Agent

**Standard Mode (Recommended)**
```bash
python run_autonomous_trader.py
```

**Direct Execution**
```bash
cd src
python autonomous_trader.py
```

**Background Service (Linux)**
```bash
nohup python run_autonomous_trader.py > trader.log 2>&1 &
```

---

## 📁 Project Structure

```
ai-agent/
├── run_autonomous_trader.py          # Entry point with monitoring
├── backend_client.py                 # HTTP 402 client for backend
├── requirements.txt                  # Python dependencies
│
├── src/
│   ├── autonomous_trader.py          # Main trading loop
│   │
│   ├── agents/                       # Multi-Agent Council
│   │   ├── multi_agent_council.py    # Orchestrates 3 AI agents
│   │   ├── market_data_agent.py      # Market data tools
│   │   ├── sentinel_agent.py         # SentinelClamp interaction
│   │   └── executioner_agent.py      # Trade execution tools
│   │
│   ├── execution/                    # Trade Executors
│   │   ├── simple_amm_executor.py    # SimpleAMM swap execution
│   │   └── wcro_amm_executor.py      # WCRO wrapping/unwrapping
│   │
│   ├── monitoring/                   # Sentiment Analysis
│   │   ├── sentiment_aggregator.py   # Multi-source aggregation
│   │   └── real_sentiment.py         # News + social sentiment
│   │
│   └── services/
│       └── x402_payment.py           # X402 payment client
│
├── autonomous_trade_log.txt          # Live trading log
├── agent_control.json                # Runtime state
└── mcp_config.json                   # MCP server config
```

---

## 🎯 Key Features

### Multi-Agent Council
Three AI agents vote independently on every decision:
- **Risk Manager** 🛡️: Conservative, focuses on capital preservation
- **Market Analyst** 📊: Analyzes fundamentals and volume trends  
- **Execution Specialist** ⚡: Technical indicators and chart patterns

### Sentiment Aggregation
Collects data from 4 sources with weighted scores:
- **CoinGecko (30%)**: Price trends, 24h volume, market cap rank, trending status
- **News (25%)**: Financial news headlines analyzed by Google Gemini AI for sentiment
- **Reddit (20%)**: r/CryptoCurrency posts processed via VADER sentiment analysis
- **Technical (25%)**: RSI (overbought/oversold), MACD crossovers, Bollinger Band breakouts

**Final Score Formula:**  
`sentiment = (0.30 × coingecko) + (0.25 × news) + (0.20 × reddit) + (0.25 × technical)`

- Score > 0.6: **BUY** signal
- Score < -0.6: **SELL** signal
- Otherwise: **HOLD**

### Safety Mechanisms
- SentinelClamp daily limit checks
- Emergency pause capability
- Circuit breaker (auto-pause after failures)
- Gas price monitoring
- Balance verification

---

## ⚡ Trade Execution Flow

1. **Council votes** → Majority decision (2/3 minimum)
2. **Confidence check** → Average confidence ≥ 70%
3. **SentinelClamp approval** → Check daily limit on-chain
4. **Wallet balance** → Verify sufficient CRO
5. **Approve WCRO** → ERC20 approval transaction
6. **Execute swap** → SimpleAMM swap call
7. **Backend notification** → Send trade data via HTTP 402
8. **Log result** → Append to `autonomous_trade_log.txt`

Typical execution time: **8-12 seconds** (including blockchain confirmations)

---

## 📊 Monitoring

View live logs:
```bash
tail -f autonomous_trade_log.txt
```

Sample output:
```
🤖 AUTONOMOUS TRADER - 2026-01-20 15:30:00
🔍 Aggregating sentiment for crypto-com-chain...
   ✓ CoinGecko: 0.85
   ✓ News: 0.72
   SIGNAL: BUY (Score: 0.78)

🗳️ MULTI-AGENT VOTING
   Risk Manager: HOLD (60%)
   Market Analyst: BUY (70%)
   Execution: STRONG_BUY (80%)
   CONSENSUS: BUY ✅

💰 Trade executed: 0.1 CRO → 0.098 WCRO
   TX: 0xabc123...
```

---

## 🔧 Configuration

Edit trading parameters in `src/autonomous_trader.py`:
```python
CYCLE_INTERVAL = 15 * 60      # 15 minutes
MIN_AGREEMENT = 2/3            # 2 out of 3 agents
MIN_CONFIDENCE = 0.70          # 70%
DEFAULT_TRADE_AMOUNT = 0.1     # CRO
```

---

## 🚀 Deployment

For production deployment, see main project README.

**Built with ❤️ using Crypto.com Agent Client SDK & Google Gemini AI**
