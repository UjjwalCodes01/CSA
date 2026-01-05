# Week 2 (Days 8-14): Intelligence Layer Roadmap

**Timeline:** January 6-12, 2026  
**Estimated Time:** 12-15 hours total  
**Status:** Ready to start  

---

## 🎯 End Goal

By end of Week 2, your system will:
1. ✅ Fetch real-time price data via CDC Market Data MCP
2. ✅ Analyze Twitter sentiment for crypto trends
3. ✅ Parse natural language intents via CDC AI Agent SDK
4. ✅ Orchestrate 3-agent system to make autonomous trade decisions
5. ✅ Demo: "Buy CRO if bullish sentiment + price < $0.10" → Agent executes

**Proof of Milestone:**
```
User: "Swap $10 of CRO to USDC if sentiment is positive"
    ↓
Orchestrator Agent
    ├──→ Market Data Agent: CRO = $0.085
    ├──→ Sentiment Agent: Twitter sentiment = 78% bullish
    └──→ Decision: ✅ Execute trade
            ↓
        Execution Agent
            ├──→ Sentinel: Check limits (✅ approved)
            └──→ MockRouter: Execute swap
                    ↓
                Result: Tx Hash 0xabc...123
```

---

## 📋 Day-by-Day Breakdown

### **Day 8-9: CDC Market Data MCP Integration (4-5 hours)**

#### **What is MCP?**
Model Context Protocol - allows agents to access external data sources (price feeds, market data, etc.)

#### **Task 1: Set Up CDC Market Data MCP**
- [ ] Install MCP SDK: `npm install @modelcontextprotocol/sdk`
- [ ] Register for Crypto.com API key (if needed)
- [ ] Create MCP server configuration

#### **Task 2: Create Market Data Agent** (`src/agents/intelligence/market-data-agent.js`)
```javascript
export class MarketDataAgent {
  // Get current price for token
  async getPrice(symbol) { }
  
  // Get 24h price change
  async getPriceChange24h(symbol) { }
  
  // Get trading volume
  async getVolume(symbol) { }
  
  // Check if price meets condition
  async checkPriceCondition(symbol, operator, targetPrice) { }
}
```

#### **Task 3: MCP Tools Integration**
Create tools for MCP server:
- `get_cro_price` - Current CRO/USD price
- `get_usdc_price` - Current USDC price
- `get_market_summary` - Volume, change, etc.

#### **Acceptance Criteria:**
- ✅ Can fetch CRO price from CDC API
- ✅ Can check price conditions (>, <, ==)
- ✅ Returns structured data for orchestrator
- ✅ Test: `npm run test:market-data`

**Test Output:**
```
✅ CRO Price: $0.085
✅ 24h Change: +3.2%
✅ Volume: $1.2M
✅ Condition (CRO < $0.10): true
```

---

### **Day 10: MCP Server & Testing (2 hours)**

#### **Task 1: Create MCP Server Configuration**
```json
// mcp-config.json
{
  "mcpServers": {
    "cdc-market-data": {
      "command": "node",
      "args": ["src/mcp/cdc-market-server.js"],
      "env": {
        "CDC_API_KEY": "your_api_key"
      }
    }
  }
}
```

#### **Task 2: Test MCP Integration**
- [ ] Start MCP server
- [ ] Query tools via MCP protocol
- [ ] Verify data accuracy vs CDC website

#### **Task 3: Create Demo Script** (`src/test/demo-market-data.js`)
```javascript
// Demo flow:
1. Query CRO price
2. Query USDC price
3. Calculate swap rate
4. Show market conditions
```

**Acceptance Criteria:**
- ✅ MCP server runs independently
- ✅ Agent can query server
- ✅ Data matches CDC website
- ✅ Demo shows real-time prices

---

### **Day 11-12: Twitter Sentiment Analysis (4-5 hours)**

#### **Task 1: Set Up Twitter API Access**
Options:
- **Option A:** Twitter API v2 (official, requires approval)
- **Option B:** RapidAPI Twitter alternative
- **Option C:** Mock sentiment for demo (recommended for hackathon)

#### **Task 2: Create Sentiment Agent** (`src/agents/intelligence/sentiment-agent.js`)
```javascript
export class SentimentAgent {
  // Analyze recent tweets about a token
  async analyzeSentiment(symbol) { }
  
  // Get sentiment score (0-100)
  async getSentimentScore(symbol) { }
  
  // Check if sentiment meets threshold
  async checkSentimentCondition(symbol, threshold) { }
  
  // Get top trending topics
  async getTrendingTopics() { }
}
```

#### **Task 3: Sentiment Analysis Logic**
```javascript
// Simple scoring:
- Positive keywords: "moon", "bullish", "buy", "pump" → +1
- Negative keywords: "dump", "bearish", "sell", "crash" → -1
- Score = (positive - negative) / total * 100
```

#### **Task 4: Mock Sentiment Service** (for reliable demos)
```javascript
// Mock data for demos:
const MOCK_SENTIMENT = {
  CRO: { score: 78, trending: true, volume: 1234 },
  BTC: { score: 65, trending: false, volume: 9876 },
  ETH: { score: 72, trending: true, volume: 5432 }
};
```

#### **Acceptance Criteria:**
- ✅ Can fetch/mock Twitter sentiment
- ✅ Returns score 0-100
- ✅ Identifies bullish/bearish trends
- ✅ Test: `npm run test:sentiment`

**Test Output:**
```
✅ CRO Sentiment: 78/100 (Bullish)
✅ Volume: 1,234 mentions
✅ Trending: Yes
✅ Condition (sentiment > 70): true
```

---

### **Day 13: Data Fusion & Intelligence Layer (2-3 hours)**

#### **Task 1: Create Intelligence Coordinator**
```javascript
// src/agents/intelligence/intelligence-coordinator.js
export class IntelligenceCoordinator {
  constructor(marketAgent, sentimentAgent) {}
  
  // Fuse market + sentiment data
  async analyzeTradeConditions(symbol) {
    const price = await this.marketAgent.getPrice(symbol);
    const sentiment = await this.sentimentAgent.getSentimentScore(symbol);
    
    return {
      price,
      sentiment,
      recommendation: this.calculateRecommendation(price, sentiment)
    };
  }
  
  // Decision logic
  calculateRecommendation(price, sentiment) {
    if (sentiment > 70 && price < 0.10) return "STRONG_BUY";
    if (sentiment < 30) return "SELL";
    return "HOLD";
  }
}
```

#### **Task 2: Create Fusion Demo** (`src/test/demo-intelligence-fusion.js`)
Show how market + sentiment data combine to make decisions.

#### **Acceptance Criteria:**
- ✅ Combines market + sentiment data
- ✅ Returns actionable recommendation
- ✅ Explains reasoning
- ✅ Test: `npm run test:intelligence`

---

### **Day 14: Orchestrator with CDC AI Agent SDK (3-4 hours)**

#### **Task 1: Set Up CDC AI Agent SDK**
```bash
npm install @crypto-com/ai-agent-sdk
```

#### **Task 2: Create Orchestrator Agent** (`src/agents/orchestrator-agent.js`)
```javascript
import { AgentSDK } from '@crypto-com/ai-agent-sdk';

export class OrchestratorAgent {
  constructor(intelligenceCoordinator, executionAgent, sentinelAgent) {
    this.sdk = new AgentSDK();
    this.intelligence = intelligenceCoordinator;
    this.executor = executionAgent;
    this.sentinel = sentinelAgent;
  }
  
  // Parse natural language intent
  async parseIntent(userInput) {
    return await this.sdk.parseIntent(userInput);
  }
  
  // Execute full workflow
  async executeIntent(userInput) {
    // 1. Parse intent
    const intent = await this.parseIntent(userInput);
    // "Swap $10 CRO to USDC if sentiment is positive"
    
    // 2. Gather intelligence
    const analysis = await this.intelligence.analyzeTradeConditions('CRO');
    
    // 3. Check conditions
    if (!this.meetsConditions(intent, analysis)) {
      return { status: 'SKIPPED', reason: 'Conditions not met' };
    }
    
    // 4. Check Sentinel
    const sentinelCheck = await this.sentinel.simulateCheck(
      MOCK_ROUTER_ADDRESS,
      intent.amount
    );
    
    if (!sentinelCheck.approved) {
      return { status: 'BLOCKED', reason: sentinelCheck.reason };
    }
    
    // 5. Execute trade
    const result = await this.executor.executeSwap(
      intent.tokenIn,
      intent.tokenOut,
      intent.amount,
      intent.slippage
    );
    
    return { status: 'SUCCESS', txHash: result.txHash };
  }
}
```

#### **Task 3: Create Full Demo** (`src/test/demo-orchestrator.js`)
```javascript
// Demo scenarios:
1. "Swap 0.05 CRO to USDC if sentiment is bullish"
   → Check sentiment (78%) → ✅ Execute

2. "Swap 0.1 CRO if price is below $0.08"
   → Check price ($0.085) → ❌ Skip (price too high)

3. "Swap 5 CRO to USDC"
   → Check Sentinel → ❌ Blocked (exceeds limit)
```

#### **Acceptance Criteria:**
- ✅ Parses natural language intents
- ✅ Orchestrates 3 agents (intelligence, sentinel, execution)
- ✅ Executes trades when conditions met
- ✅ Blocks trades when conditions fail
- ✅ Returns clear explanations

---

## 📁 Files You'll Create

```
backend/
├── src/
│   ├── agents/
│   │   ├── intelligence/
│   │   │   ├── market-data-agent.js       ← NEW
│   │   │   ├── sentiment-agent.js         ← NEW
│   │   │   └── intelligence-coordinator.js ← NEW
│   │   └── orchestrator-agent.js          ← NEW
│   ├── mcp/
│   │   ├── cdc-market-server.js           ← NEW: MCP server
│   │   └── tools/
│   │       ├── get-price.js               ← NEW: Price tool
│   │       └── get-sentiment.js           ← NEW: Sentiment tool
│   ├── services/
│   │   ├── twitter-service.js             ← NEW: Twitter API
│   │   └── mock-sentiment-service.js      ← NEW: Mock for demos
│   ├── test/
│   │   ├── demo-market-data.js            ← NEW
│   │   ├── demo-sentiment.js              ← NEW
│   │   ├── demo-intelligence-fusion.js    ← NEW
│   │   └── demo-orchestrator.js           ← NEW: Full system
│   └── abi/
│       (existing files)
├── mcp-config.json                         ← NEW: MCP configuration
├── package.json                            ← UPDATE
└── README.md                               ← UPDATE
```

---

## 🔧 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| MCP Server | @modelcontextprotocol/sdk | Data source protocol |
| Market Data | Crypto.com API | Real-time prices |
| Sentiment | Twitter API v2 / Mock | Social sentiment |
| Intent Parsing | CDC AI Agent SDK | NLP for user commands |
| Orchestration | Custom logic | Multi-agent coordination |

---

## 📊 Architecture Diagram

```
User Input: "Swap 0.05 CRO if sentiment is bullish"
    ↓
┌─────────────────────────────────────────┐
│     Orchestrator Agent (CDC AI SDK)     │
│  - Parse intent                         │
│  - Coordinate agents                    │
│  - Make decisions                       │
└─────────────────┬───────────────────────┘
                  │
      ┌───────────┼───────────┐
      ↓           ↓           ↓
┌──────────┐ ┌─────────┐ ┌──────────┐
│ Market   │ │Sentiment│ │Execution │
│ Data     │ │ Agent   │ │ Agent    │
│ Agent    │ │         │ │          │
└────┬─────┘ └────┬────┘ └────┬─────┘
     │            │           │
     ↓            ↓           ↓
┌─────────┐ ┌──────────┐ ┌──────────┐
│CDC MCP  │ │Twitter   │ │Sentinel  │
│Server   │ │API       │ │+ Router  │
└─────────┘ └──────────┘ └──────────┘
```

---

## 💡 Implementation Tips

### **Tip 1: Use Environment Variables**
```bash
# .env additions
CDC_API_KEY=your_cdc_api_key
TWITTER_API_KEY=your_twitter_key
TWITTER_BEARER_TOKEN=your_bearer_token
OPENAI_API_KEY=your_openai_key  # For intent parsing
```

### **Tip 2: Mock Data for Reliability**
For hackathon demos, use mock data to ensure consistent results:
```javascript
const DEMO_MODE = process.env.DEMO_MODE === 'true';
if (DEMO_MODE) {
  return MOCK_SENTIMENT[symbol];
}
```

### **Tip 3: MCP Server Testing**
Test MCP server independently:
```bash
node src/mcp/cdc-market-server.js &
# Test tools
curl http://localhost:3333/tools
```

### **Tip 4: Intent Parsing Patterns**
```javascript
// Common patterns:
"swap X to Y" → { action: 'swap', from: X, to: Y }
"if price < N" → { condition: 'price', operator: '<', value: N }
"if sentiment is bullish" → { condition: 'sentiment', threshold: 70 }
```

### **Tip 5: Error Handling**
```javascript
try {
  const price = await marketAgent.getPrice('CRO');
} catch (error) {
  // Fallback to cached price or skip trade
  return { status: 'ERROR', reason: 'Price feed unavailable' };
}
```

---

## ✅ Completion Checklist

### Day 8-9: Market Data
- [ ] MCP SDK installed
- [ ] Market Data Agent implemented
- [ ] Can fetch CRO price from CDC
- [ ] MCP server running
- [ ] Demo script working

### Day 10: MCP Testing
- [ ] MCP configuration created
- [ ] Server runs independently
- [ ] Tools accessible via MCP protocol
- [ ] Data verified vs CDC website

### Day 11-12: Sentiment
- [ ] Twitter API access (or mock)
- [ ] Sentiment Agent implemented
- [ ] Sentiment scoring working
- [ ] Demo script showing sentiment analysis

### Day 13: Intelligence Fusion
- [ ] Intelligence Coordinator created
- [ ] Market + sentiment data combined
- [ ] Recommendation logic working
- [ ] Demo showing fusion

### Day 14: Orchestrator
- [ ] CDC AI Agent SDK integrated
- [ ] Orchestrator Agent implemented
- [ ] Full workflow (intent → analysis → execution)
- [ ] 3-agent system working
- [ ] All demos passing

---

## 🎯 Success Metrics

By end of Day 14:
- **3-Agent System:** Market + Sentiment + Execution working together
- **Intent Parsing:** Natural language → executable trades
- **Data Fusion:** Social + price data combined for decisions
- **Demo Success:** 3 scenarios showing different outcomes
- **Code Quality:** 10+ test cases passing
- **Documentation:** Clear README explaining intelligence layer

---

## 🎬 Demo Scenarios for Week 2

### **Demo 1: Bullish Sentiment Trade** ✅
```
Input: "Swap 0.05 CRO to USDC if sentiment is bullish"
↓
Market Data: CRO = $0.085
Sentiment: 78% bullish (✅ > 70 threshold)
Sentinel: 0.05 < 1.0 limit (✅ approved)
↓
Result: Trade executed, tx hash 0xabc...
```

### **Demo 2: Price Condition Not Met** ⏸️
```
Input: "Swap 0.1 CRO if price is below $0.08"
↓
Market Data: CRO = $0.085 (❌ not < $0.08)
↓
Result: Trade skipped (condition not met)
```

### **Demo 3: Sentinel Block** ❌
```
Input: "Swap 5 CRO to USDC"
↓
Sentiment: 78% bullish (✅)
Sentinel: 5.0 > 1.0 limit (❌ blocked)
↓
Result: Trade blocked by Sentinel (safety enforced)
```

---

## 🚀 Ready to Start Day 8?

**Checklist:**
- ✅ Days 1-7 complete (you're here!)
- ✅ All tests passing
- ✅ MockRouter deployed
- ✅ Sentinel working
- ✅ x402 protocol functional

**First Steps Tomorrow (Day 8):**
1. Create `src/agents/intelligence/` directory
2. Install MCP SDK: `npm install @modelcontextprotocol/sdk`
3. Register for Crypto.com API access
4. Create `market-data-agent.js`

**Expected Time:**
- Day 8-9: 4-5 hours (market data)
- Day 10: 2 hours (MCP server)
- Day 11-12: 4-5 hours (sentiment)
- Day 13: 2-3 hours (fusion)
- Day 14: 3-4 hours (orchestrator)
- **Total: 15-19 hours over 7 days**

---

## 💬 Questions?

This intelligence layer is what makes your project special:
- ✅ Not just a trading bot
- ✅ Multi-source data fusion
- ✅ Natural language control
- ✅ Blockchain-enforced safety

**By Day 14, judges will see:**
- AI that understands user intent
- AI that analyzes market conditions
- AI that checks social sentiment
- AI that CANNOT exceed safety limits

**You're building the future of safe autonomous AI.** 🚀
