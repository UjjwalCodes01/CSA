# 🔧 QUICK FIX - Sentinel Limit & Price Updates

## Problem
- Agent shows "daily_limit: 0 CRO, daily_spent: 1000 CRO"
- Dashboard prices not updating
- Agent can't make trades

## Solution (3 Steps)

### Step 1: Fix Sentinel Limit (MUST DO FIRST!)
```bash
cd ai-agent
python fix_sentinel_limit.py
```

**What it does:**
- Sets Sentinel daily limit to 1000 CRO
- Resets spent to 0 CRO
- Takes ~30 seconds (blockchain transaction)

**Expected output:**
```
✅ Daily limit updated to 1000.0 TCRO
✅ Sentinel reset complete
```

### Step 2: Start Backend
```bash
cd backend
npm start
```

**Expected output:**
```
🚀 CSA Backend Server Started!
📡 REST API: http://localhost:3001/api
```

### Step 3: Start Agent
```bash
cd ai-agent
python run_autonomous_trader.py
```

**What's different now:**
- ✅ Agent reads correct Sentinel limit (1000 CRO, not 0)
- ✅ Agent updates dashboard prices every cycle
- ✅ Agent can make trades again

**Expected output:**
```
📊 Dashboard price updated: $0.085123 (+2.50%)
Daily limit: 1000.0 CRO | Spent: 0.0 CRO | Remaining: 1000.0 CRO
```

---

## What Was Fixed

### Fix #1: Sentinel ABI Updated
**File**: `ai-agent/src/agents/sentinel_agent.py`

Changed `getStatus()` from returning 4 values to 6 values:
- Old: `dailyLimit, dailySpent, remainingToday, totalTransactions`
- New: `currentSpent, remaining, timeUntilReset, isPaused, txCount, x402Count`

Added separate `dailyLimit()` call to get the actual limit.

### Fix #2: Agent Now Updates Dashboard Prices
**File**: `ai-agent/src/autonomous_trader_mcp.py`

Added code at line ~150 to fetch price and send to backend every cycle:
```python
# Fetch current price and update backend
price_result = await mcp_client.call_tool("check_cro_price", {})
send_to_backend("market/price/update", {
    "price": price_data.get('price', 0),
    "change_24h": price_data.get('24h_change', 0)
})
```

### Fix #3: Frontend Null Safety
**File**: `frontend/app/dashboard/page.tsx`

Added null checks for price comparison widget to prevent crashes.

---

## Verification

After starting the agent, you should see:

```
🤖 AUTONOMOUS AGENT - 2026-01-15 10:30:00
📊 Dashboard price updated: $0.085123 (+2.50%)

🧠 Gemini analyzing market with MCP tools...

🤖 Agent Decision:
------------------------------------------------------------
DECISION: BUY

REASONING:
1. Market Conditions: CRO price at $0.085123, sentiment: strong_buy
2. Sentinel Status: Daily limit 1000.0 CRO, spent 0.0 CRO, remaining 1000.0 CRO
3. Executing swap: 0.5 WCRO -> tUSD
```

---

## Common Issues

### "daily_limit still shows 0 CRO"
**Fix**: Did you run `python fix_sentinel_limit.py`? This sets it on the blockchain.

### "Connection timeout when fetching price"
**Fix**: This is normal occasionally. Agent will retry next cycle.

### "Dashboard still shows old price"
**Fix**: Hard refresh browser (Ctrl+Shift+R)

### "Backend not running"
**Fix**: 
```bash
# Kill old process
npx kill-port 3001
# Restart
cd backend && npm start
```

---

## Quick Commands

**All in one (3 terminals):**

Terminal 1 - Backend:
```bash
cd backend && npm start
```

Terminal 2 - Agent:
```bash
cd ai-agent && python run_autonomous_trader.py
```

Terminal 3 - Frontend:
```bash
cd frontend && npm run dev
```

---

## Status Check

**Is Sentinel fixed?**
```bash
cd ai-agent
python -c "from src.agents.sentinel_agent import get_sentinel_status; print(get_sentinel_status.invoke({}))"
```

Should show: `daily_limit: 1000.0, daily_spent: 0.0 (or small amount)`

**Is price updating?**
```bash
curl http://localhost:3001/api/market/price
```

Should return current CRO price.

---

**Bottom line**: Run `fix_sentinel_limit.py` first, then restart everything!
