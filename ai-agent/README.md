# Cronos Sentinel Agent - AI Intelligence Layer

AI-powered DeFi trading agent with blockchain-enforced safety limits.

## 📁 Project Structure

```
ai-agent/
├── src/
│   ├── main.py                    # Main agent entry point
│   └── agents/
│       ├── market_data_agent.py   # Exchange API integration
│       └── sentinel_agent.py      # Smart contract safety tools
├── tests/
│   └── test_market_data.py        # Day 8-10 tests
├── .env                           # Configuration (DO NOT COMMIT)
├── requirements.txt               # Python dependencies
└── README.md                      # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ai-agent
pip install -r requirements.txt
```

### 2. Configure Environment

Edit `.env` file and add your Gemini API key:

```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

All other values are pre-configured for Cronos EVM Testnet.

### 3. Run the Agent

```bash
cd src
python main.py
```

### 4. Test Queries

Try these commands:
- `"What is the current CRO price?"`
- `"Can I swap 0.05 CRO to USDC?"`
- `"What is my Sentinel status?"`
- `"Recommend a safe swap amount"`

## 🧪 Run Tests

```bash
cd tests
python test_market_data.py
```

## 🎯 Day 8-10 Features

### ✅ Market Data Agent
- Real-time CRO/USDT price from Crypto.com Exchange
- Price condition checking (`CRO < $0.10`)
- Market analysis and recommendations
- Swap value calculations

### ✅ Sentinel Safety Agent
- Pre-transaction approval checks (no gas cost!)
- Daily limit monitoring (1 CRO limit)
- Safe amount recommendations
- Blockchain-enforced safety

### ✅ AI Integration
- Natural language queries
- Gemini 2.0 Flash model
- Custom personality (safety-focused)
- Session persistence (SQLite)

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
Agent: The current CRO/USDT price is $0.085. 
       24h change: +3.2%, Volume: $1.2M
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
