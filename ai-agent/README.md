# Cronos Sentinel Agent - AI Intelligence Layer

AI-powered DeFi trading agent with blockchain-enforced safety limits and multi-agent intelligence.

## 📁 Project Structure

```
ai-agent/
├── src/
│   ├── main.py                    # Main agent entry point
│   └── agents/
│       ├── market_data_agent.py   # Exchange API integration (Day 8-10)
│       ├── sentinel_agent.py      # Smart contract safety tools (Day 8-10)
│       └── sentiment_agent.py     # Twitter sentiment analysis (Day 11) ✨ NEW
├── tests/
│   └── test_market_data.py        # Day 8-10 tests
├── test_sentiment.py              # Day 11 sentiment tests ✨ NEW
├── .env                           # Configuration (DO NOT COMMIT)
├── requirements.txt               # Python dependencies
├── DAY_11_SENTIMENT_COMPLETE.md   # Day 11 status report ✨ NEW
├── DAY_11_EXAMPLE_QUERIES.md      # Example interactions ✨ NEW
└── README.md                      # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ai-agent
pip install -r requirements.txt
```

### 2. Configure Environment

Edit `.env` file and add your API keys:

```bash
GEMINI_API_KEY=your-gemini-api-key-here
TWITTER_BEARER_TOKEN=your-twitter-bearer-token-here  # Optional for Day 11
```

All other values are pre-configured for Cronos EVM Testnet.

### 3. Run the Agent

```bash
python3 src/main.py
```

### 4. Test Queries

Try these commands:
- `"What is the current CRO price?"`
- `"What is the sentiment for CRO?"` ✨ NEW
- `"Show me trending tokens"` ✨ NEW
- `"Should I buy CRO now?"` ✨ NEW (multi-agent analysis)
- `"Can I swap 0.05 CRO to USDC?"`
- `"What is my Sentinel status?"`
- `"Recommend a safe swap amount"`

## 🧪 Run Tests

```bash
# Test market data agent (Day 8-10)
cd tests
python3 test_market_data.py

# Test sentiment agent (Day 11) ✨ NEW
python3 test_sentiment.py
```

## 🎯 Features by Day

### ✅ Day 8-10: Market Data & Sentinel Agent
- Real-time CRO/USDT price from Crypto.com Exchange
- Price condition checking (`CRO < $0.10`)
- Market analysis and recommendations
- Swap value calculations
- Pre-transaction approval checks (no gas cost!)
- Daily limit monitoring (1 CRO limit)
- Safe amount recommendations
- Blockchain-enforced safety

### ✅ Day 11-13: Sentiment Agent ✨ NEW
- Twitter sentiment analysis (real API + mock fallback)
- **Weighted keyword scoring** - Strong/medium/mild keywords (3x/2x/1x)
- **Volume-adjusted confidence** - More tweets = higher confidence
- Token sentiment scores (10-90 scale, 5 sentiment levels)
- Trending token detection (score + volume weighted)
- Multi-token comparison (CRO, BTC, ETH, USDC)
- Sentiment-based trade recommendations with risk levels
- Conditional trading logic

### ✅ AI Integration
- Natural language queries
- Gemini 2.5 Flash model
- Custom personality (safety-focused)
- Session persistence (SQLite)
- **13 custom tools** across 3 specialized agents:
  - 5 market data tools
  - 4 Sentinel safety tools
  - 4 sentiment analysis tools ✨ NEW

## 🔧 Configuration

### Contracts (Cronos EVM Testnet)
- **SentinelClamp**: `0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff`
- **MockRouter**: `0x3796754AC5c3b1C866089cd686C84F625CE2e8a6`
- **WCRO**: `0x5C7F8a570d578Ed84e63FdFA7b5a2f628d2B4d2A`
- **USDC**: `0xc21223249CA28397B4B6541dfFaECc539BfF0c59`

### Network
- **Chain ID**: 338 (Cronos EVM Testnet)
- **RPC**: https://evm-t3.cronos.org
- **Explorer**: https://explorer.cronos.org/testnet

## 📊 Example Interactions

### Market Data Query
```
You: What is the CRO price?
Agent: The current CRO/USDT price is $0.10189. 
       24h change: +2.5%, Trend: Consolidating
```

### Sentiment Analysis ✨ NEW
```
You: What's the sentiment for CRO?
Agent: CRO sentiment is 78/100 (Bullish), trending with 1234 mentions.
       This is a favorable time for trading based on social sentiment.
```

### Multi-Agent Analysis ✨ NEW
```
You: Should I buy CRO now?
Agent: Let me analyze comprehensively...
       📊 Market: $0.10189, consolidating sideways
       🐦 Sentiment: 78/100 bullish, trending
       🛡️ Sentinel: 1.0 CRO available
       
       ✅ Recommendation: Favorable conditions for trading.
```

### Safety Check
```
You: Can I swap 0.05 CRO?
Agent: ✅ Yes! Sentinel will approve this swap.
       Current status: 0.0/1.0 CRO spent today
       After swap: 0.95 CRO remaining
```

### Blocked Trade
```
You: Can I swap 5 CRO?
Agent: ❌ No, this exceeds your daily limit!
       You have 1.0 CRO available today.
       Recommended safe amount: 0.95 CRO
       This limit is enforced by the blockchain.
```

## 🛡️ Key Innovation

**Problem**: AI agents with unlimited wallet access are dangerous.

**Solution**: Blockchain smart contracts enforce spending limits that AI cannot bypass.

**Proof**: Try asking the agent to swap 5 CRO. It will check Sentinel and refuse!

## 📝 Custom Tools

### Market Data Tools
- `get_cro_price()` - Current CRO price
- `check_price_condition()` - Price threshold checks
- `get_market_summary()` - Market overview
- `calculate_swap_value()` - Estimate output
- `analyze_market_conditions()` - Full analysis

### Sentinel Tools
- `check_sentinel_approval()` - Pre-transaction check
- `get_sentinel_status()` - Current limits
- `can_afford_swap()` - Affordability check
- `recommend_safe_swap_amount()` - Safe suggestions

## 🔜 Next Steps (Day 11-14)

- **Day 11-13**: Add Twitter sentiment analysis
- **Day 14**: Add Telegram bot interface
- **Week 3**: Polish and demo video

## 🐛 Troubleshooting

### "No module named 'crypto_com_agent_client'"
```bash
pip install cryptocom-agent-client
```

### "Failed to initialize agent"
Check your `.env` file:
- `GEMINI_API_KEY` - Must be valid Gemini API key
- `DEVELOPER_PLATFORM_API_KEY` - Must be valid Crypto.com key

### "Error checking Sentinel"
Verify:
- RPC URL is accessible: https://evm-t3.cronos.org
- Contract addresses are correct
- Network connection is stable

## 📚 Documentation

- [AI Agent SDK Docs](https://ai-agent-sdk-docs.crypto.com/)
- [Cronos Docs](https://docs.cronos.org/)
- [Project Roadmap](../DAY_8_14_ROADMAP.md)

## 🏆 Hackathon Proof

This agent demonstrates:
1. ✅ AI that understands natural language
2. ✅ Real-time market data integration
3. ✅ Blockchain-enforced safety (Sentinel)
4. ✅ Cannot be tricked into unsafe trades
5. ✅ Production-ready code

**Judge Test**: Ask the agent to swap 10 CRO. It will refuse and explain why! 🛡️
