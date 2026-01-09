# Day 11 - Example Queries & Expected Outputs

## Quick Start
```bash
cd /home/rudra/CSA/ai-agent
python3 src/main.py
```

## Example Interactions

### 1. Basic Sentiment Query
**User:** `What is the sentiment for CRO?`

**Expected Response:**
```
The current sentiment for CRO is Bullish with a score of 78/100. 
It's trending with 1234 mentions. Based on Twitter analysis, the 
community mood is positive, which is favorable for trading.
```

---

### 2. Multi-Token Comparison
**User:** `Compare sentiment for CRO, BTC, and ETH`

**Expected Response:**
```
📊 Sentiment Comparison:
- ETH: 82/100 (Bullish) - Trending ✅
- CRO: 78/100 (Bullish) - Trending ✅
- BTC: 65/100 (Neutral)

ETH has the strongest sentiment, followed by CRO. Both are 
showing bullish trends on social media.
```

---

### 3. Trending Tokens
**User:** `Show me trending tokens`

**Expected Response:**
```
🔥 Currently Trending:
1. ETH: 82/100 (Bullish)
2. CRO: 78/100 (Bullish)

Market mood is Bullish with 2 tokens showing strong positive sentiment.
```

---

### 4. Conditional Sentiment Check
**User:** `Is CRO sentiment above 70?`

**Expected Response:**
```
✅ Sentiment condition MET: CRO sentiment is 78/100, which is above 
your threshold of 70. This indicates bullish community sentiment and 
favorable conditions for trading.
```

---

### 5. Comprehensive Trade Analysis
**User:** `Should I buy CRO now?`

**Expected Response:**
```
Let me analyze current conditions for CRO...

📊 Market Analysis:
- Current Price: $0.10189 USDT
- 24h Change: +2.5%
- Trend: 🟡 Consolidating (Sideways)

🐦 Sentiment Analysis:
- Score: 78/100 (Bullish)
- Trending: Yes
- Volume: 1234 mentions
- Confidence: 85%

🛡️ Sentinel Safety Check:
- Daily Limit: 1.0 CRO
- Remaining: 1.0 CRO
- Status: ✅ Available

Recommendation: Favorable conditions for trading CRO. Positive sentiment 
and stable price. I recommend starting with 0.25-0.50 CRO to stay within 
safe limits.
```

---

### 6. Trade with Sentiment Condition
**User:** `Swap 0.5 CRO to USDC if sentiment is bullish`

**Expected Response:**
```
Checking sentiment condition...

✅ Sentiment Check: CRO sentiment is 78/100 (Bullish) - Condition met
✅ Market Check: Price stable at $0.10189
✅ Sentinel Check: Approved for 0.5 CRO (0.5 CRO remaining)

All conditions satisfied. Your trade of 0.5 CRO → USDC is approved.
Estimated output: ~0.051 USDC
```

---

### 7. Safety Override Example
**User:** `I want to swap 2 CRO`

**Expected Response:**
```
Checking safety limits...

❌ Sentinel Check: Daily limit exceeded
- Requested: 2.0 CRO
- Available: 1.0 CRO
- Difference: 1.0 CRO over limit

The smart contract will block this transaction. Your maximum safe 
amount is 0.95 CRO. Would you like to proceed with a smaller amount?

Recommended alternatives:
- Conservative: 0.25 CRO
- Moderate: 0.50 CRO
- Maximum: 0.95 CRO
```

---

### 8. Bearish Sentiment Example
**User:** `What's the sentiment for a token with low sentiment?`

**Note:** Mock data has BTC at 65/100 (Neutral). For bearish example:

**Expected Response:**
```
The sentiment for BTC is Neutral with a score of 65/100. It's not 
currently trending. The community mood is mixed, suggesting moderate 
caution. Consider waiting for clearer signals before trading.
```

---

### 9. Sentiment + Market Combined
**User:** `Analyze trading conditions for CRO`

**Expected Response:**
```
Comprehensive Analysis for CRO:

📊 Market Conditions:
- Price: $0.10189
- Trend: Consolidating
- Liquidity: Good

🐦 Social Sentiment:
- Score: 78/100 (Bullish)
- Trending: Yes
- Risk Level: Low

🛡️ Safety Status:
- Daily Limit: 1.0 CRO available
- Wallet Balance: Sufficient

Overall: ✅ Favorable conditions for CRO trading. Both market fundamentals 
and sentiment are positive. Proceed with confidence within your limits.
```

---

### 10. Trending Topic Analysis
**User:** `What's trending in crypto right now?`

**Expected Response:**
```
🔥 Trending Crypto Topics:

Based on Twitter sentiment analysis:
1. Ethereum (ETH) - 82/100 bullish sentiment
   - Keywords: defi, layer2, bullish
   
2. Cronos (CRO) - 78/100 bullish sentiment  
   - Keywords: bullish, moon, cronos, defi

Market Mood: Bullish - 2 tokens showing strong positive sentiment

Top trading opportunities: ETH and CRO both have favorable sentiment 
for trading right now.
```

---

## Testing Command-Line Examples

### Test 1: Quick Sentiment Check
```bash
You: What's CRO sentiment?
```

### Test 2: Market + Sentiment
```bash
You: Should I trade CRO?
```

### Test 3: Conditional Logic
```bash
You: Only trade if CRO sentiment > 75
```

### Test 4: Multi-Agent Analysis
```bash
You: Give me a complete analysis for buying 0.5 CRO
```

### Test 5: Trending Discovery
```bash
You: What's trending?
```

---

## Standalone Sentiment Test

If you want to test sentiment tools independently (without the full agent):

```bash
python3 test_sentiment.py
```

This will run all 4 sentiment tools:
1. get_token_sentiment (CRO)
2. check_sentiment_condition (CRO > 70)
3. get_trending_tokens
4. analyze_trade_sentiment (0.5 CRO)
5. Multi-token comparison (CRO, BTC, ETH)

---

## Current Status

### Working Features ✅
- All 4 sentiment tools functional
- Mock data fallback for reliable demos
- Integration with main agent
- Multi-agent orchestration (market + sentiment + Sentinel)

### Known Issues ⚠️
- Twitter API returning 400 error (likely auth format issue)
- Currently using mock data fallback (78/100 for CRO)
- Need to test with friend to verify real Twitter API

### Mock Sentiment Data
```python
CRO: 78/100 (Bullish, Trending)
ETH: 82/100 (Bullish, Trending)
BTC: 65/100 (Neutral)
USDC: 50/100 (Neutral, Stablecoin)
```

---

## Next Steps

1. **Test with friend** → Verify Twitter Bearer Token works
2. **Day 14** → Full orchestrator with autonomous decision making
3. **Demo video** → Record multi-agent analysis showcase

---

## Demo for Judges

### Script to Show Multi-Agent Intelligence

**Opening:**
"This is the Cronos Sentinel Agent - the only AI trading bot with 
blockchain-enforced safety. Let me show you how it analyzes trades 
using multiple specialized agents."

**Demo Query:**
```
You: "Should I buy 0.5 CRO right now?"
```

**Agent Response** (multi-agent working together):
```
Let me analyze this comprehensively...

📊 Market Data Agent: CRO at $0.10189, consolidating sideways
🐦 Sentiment Agent: 78/100 bullish sentiment, trending on Twitter  
🛡️ Sentinel Agent: 0.5 CRO approved, 0.5 CRO remaining in daily limit

✅ Recommendation: All signals are favorable. This is a good time to 
trade CRO. The smart contract has verified your daily limit and will 
enforce the safety rules.
```

**Closing:**
"Notice how the agent checked market data, social sentiment, AND 
blockchain safety before recommending anything. Other bots have 
unlimited wallet access. Ours is protected by smart contracts that 
cannot be bypassed - even by the AI itself."

---

**Project Status:** 79% Complete (11/14 core days)  
**Next Milestone:** Day 14 Full Orchestrator  
**Submission Target:** January 20, 2025
