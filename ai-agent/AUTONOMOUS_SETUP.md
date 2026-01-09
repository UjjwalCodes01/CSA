# 🤖 Autonomous Trading Agent - Setup Guide

## Week 2: Day 11-14 Implementation

Complete autonomous trading system with Twitter sentiment analysis and on-chain execution.

---

## 📋 Features

✅ **24/7 Social Monitoring** - Twitter sentiment analysis via Apify  
✅ **Autonomous Decision Making** - AI agent with full trading authority  
✅ **Sentinel Safety** - Smart contract enforced limits  
✅ **Auto-Execution** - Swaps execute without human confirmation  
✅ **Risk Management** - Stop-loss, position sizing, gas reserves  

---

## 🚀 Quick Start

### 1. Get Apify API Token

1. Go to https://console.apify.com/
2. Sign up (free tier: $5 credit)
3. Navigate to Settings → Integrations
4. Copy your API token
5. Add to `.env`:
   ```
   APIFY_API_TOKEN=apify_api_xxxxxxxxxxxxxxxxxxxxxxxx
   ```

### 2. Test Components

**Test Twitter Monitor:**
```bash
cd C:\Users\DELL\OneDrive\Desktop\CSA\ai-agent
python src/monitoring/twitter_monitor.py
```

**Test Executioner Tools:**
```bash
python -c "from src.agents.executioner_agent import check_execution_feasibility; print(check_execution_feasibility.invoke({'amount_cro': 0.01, 'token_out': 'USDC'}))"
```

**Test Autonomous Agent (Single Decision):**
```bash
python src/autonomous_trader.py test
```

### 3. Run Autonomous Trader (24/7)

```bash
# WARNING: This will trade autonomously!
python src/autonomous_trader.py
```

---

## ⚙️ Configuration

Edit `.env` to customize:

```bash
# Monitoring Keywords (what to track on Twitter)
MONITOR_KEYWORDS=CRO,Cronos,$CRO,VVS Finance,Crypto.com Chain

# Signal Thresholds (when to trigger trades)
BULLISH_THRESHOLD=0.6        # Execute buy at +0.6 sentiment
BEARISH_THRESHOLD=-0.4       # Execute sell at -0.4 sentiment
VOLUME_SPIKE_THRESHOLD=500   # Alert if 500+ tweets in 10 min
```

---

## 🎯 Trading Logic

### Buy Signals:
- **strong_buy + volume_spike** → Execute 50% of available Sentinel limit
- **strong_buy** → Execute 25% of available limit
- **weak_buy** → Monitor, don't trade

### Sell Signals:
- **strong_sell** → Exit all positions
- **weak_sell** → Hold (no action)

### Safety Checks (Pre-Flight):
1. ✅ Check Sentinel approval (smart contract enforced)
2. ✅ Check wallet balance (>= amount + 0.01 CRO gas)
3. ✅ Check market conditions (price, volume)
4. ✅ Validate slippage tolerance

---

## 📊 Monitoring

**View Trade Log:**
```bash
tail -f autonomous_trade_log.txt
```

**Check Agent Database:**
```bash
sqlite3 autonomous_agent.db "SELECT * FROM messages ORDER BY timestamp DESC LIMIT 10;"
```

---

## 🔒 Safety Features

1. **Sentinel Daily Limit** - On-chain enforcement (can't be bypassed)
2. **Gas Reserve** - Always keeps 0.01 CRO for fees
3. **Stop-Loss** - Pauses after 3 consecutive losses
4. **Slippage Protection** - Minimum output enforced
5. **Audit Log** - All decisions logged to file

---

## 🛠️ Architecture

```
┌─────────────────────────────────────────┐
│  Twitter (via Apify)                    │
│  - Scrape mentions of CRO, Cronos       │
│  - Extract sentiment signals            │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Sentiment Analyzer (VADER)             │
│  - Score: -1.0 (bearish) to +1.0 (bull) │
│  - Detect volume spikes                 │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Autonomous Trading Agent (Gemini AI)   │
│  - Analyzes: signal + market + Sentinel │
│  - Decides: buy / sell / hold           │
│  - Authority: Execute without approval  │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Executioner Agent                      │
│  - Pre-flight: Feasibility check        │
│  - Execution: Send transaction          │
│  - Sentinel: On-chain approval required │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Cronos Blockchain                      │
│  - SentinelClamp: Daily limit enforced  │
│  - MockRouter: Swap execution           │
│  - Transaction: Confirmed on-chain      │
└─────────────────────────────────────────┘
```

---

## 🧪 Testing Without Apify

The system works with **mock data** if Apify token is not set:
- Generates 30 random tweets with varied sentiment
- Useful for testing logic without API costs

---

## 📈 Next Steps

**Day 12:** Twitter sentiment refinement  
**Day 13:** Portfolio manager + risk engine  
**Day 14:** Demo preparation + stress testing  

---

## 🚨 Important Notes

⚠️ **This trades with REAL funds** - Test on testnet first!  
⚠️ **Sentinel limits are enforced** - Agent cannot bypass smart contract  
⚠️ **Monitor actively** - Check logs and blockchain transactions  
⚠️ **Gas fees required** - Ensure 0.1+ CRO balance for operations  

---

## 🔗 Resources

- Apify Console: https://console.apify.com/
- Cronos Explorer: https://explorer.cronos.org/testnet
- Sentinel Contract: `0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff`
- Twitter API Docs: https://apify.com/apify/twitter-scraper

---

**Built for Crypto.com x402 Paytech Hackathon**  
**Week 2: Autonomous AI Trading System**
