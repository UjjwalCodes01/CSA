# 🚀 QUICK START GUIDE - Complete System

## All 3 Hackathon Features Ready!

✅ **Priority #1**: Manual Trade System  
✅ **Priority #2**: Multi-Agent Collaboration  
✅ **Priority #3**: CDC Integration  

---

## Start Everything (3 Terminals)

### Terminal 1: Backend
```bash
cd backend
npm start
```
Expected: `Backend running on port 3001`

### Terminal 2: CDC Price Updater (NEW!)
```bash
cd ai-agent
python update_cdc_prices.py
```
Expected: `✅ CDC price updated: $0.085123 (+2.50%)`

### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```
Expected: `Local: http://localhost:3000`

---

## Or Use Batch Files (Windows)

```bash
# Terminal 1
start-all.bat

# Terminal 2 (in new window)
start-cdc-updater.bat
```

---

## Verify Everything is Working

### 1. Check Backend Health
```bash
curl http://localhost:3001/api/health
```

### 2. Check CDC Prices
```bash
curl http://localhost:3001/api/market/price/cdc
```

### 3. Check Price Comparison
```bash
curl http://localhost:3001/api/market/price/compare
```

### 4. Run Full Test Suite
```bash
cd ai-agent
python test_cdc_integration.py
```

---

## Dashboard URL

Open in browser:
```
http://localhost:3000/dashboard
```

---

## What You'll See on Dashboard

1. **Performance Metrics Panel** (6 stats)
   - Win Rate, Total P&L, Best/Worst Trade, Avg Profit, Score

2. **Manual Trade Panel** (Priority #1)
   - Buy/Sell toggle
   - Amount input
   - Execute button
   - No Sentinel limits

3. **CDC Price Comparison Panel** (Priority #3) ← NEW!
   - CoinGecko price
   - Crypto.com price
   - Difference stats
   - "Powered by Crypto.com" badge

4. **Multi-Agent Council Panel** (Priority #2)
   - Risk Manager 🛡️
   - Market Analyst 📊
   - Execution Specialist ⚡
   - Vote badges and confidence bars

5. **TradingView Chart**
   - Live CRO/USD price chart

6. **Recent Trades Table**
   - Trade history with P&L

---

## Common Issues

### CDC Prices Show $0.00
**Fix**: Start CDC updater
```bash
cd ai-agent
python update_cdc_prices.py
```

### Backend Not Responding
**Fix**: Check port 3001
```bash
# Kill process on port 3001
npx kill-port 3001

# Restart backend
cd backend
npm start
```

### Frontend Shows Loading Forever
**Fix**: Clear browser cache and refresh
```
Ctrl + Shift + R (hard refresh)
```

---

## File Structure

```
CSA/
├── backend/
│   ├── src/index.js         ← CDC endpoints added
│   └── package.json
│
├── frontend/
│   └── app/dashboard/
│       └── page.tsx         ← CDC widget added
│
├── ai-agent/
│   ├── src/services/
│   │   └── cdc_price_service.py    ← NEW
│   ├── update_cdc_prices.py         ← NEW
│   └── test_cdc_integration.py      ← NEW
│
├── start-all.bat
├── start-cdc-updater.bat            ← NEW
├── CDC_INTEGRATION.md               ← NEW
└── CDC_INTEGRATION_COMPLETE.md      ← NEW
```

---

## Environment Variables (Optional)

Create `ai-agent/.env`:
```bash
# Optional - uses mock data if not set
CRYPTO_COM_API_KEY=your_api_key_here

# Optional - defaults shown
BACKEND_URL=http://localhost:3001
CDC_UPDATE_INTERVAL=30
```

---

## Testing Checklist

Before demo:
- [ ] Backend running on port 3001
- [ ] CDC updater running (prints updates every 30s)
- [ ] Frontend running on port 3000
- [ ] Dashboard loads without errors
- [ ] CDC widget shows prices
- [ ] Multi-agent panel shows 3 agents
- [ ] Manual trade executes successfully
- [ ] All test suites passing

---

## Demo Flow

1. **Show Dashboard Overview**
   - Point out 3 main features
   - Highlight CDC branding

2. **Execute Manual Trade**
   - Toggle Buy/Sell
   - Enter amount
   - Click Execute
   - Show trade appears in history

3. **Show Multi-Agent Votes**
   - Explain 3 agent personalities
   - Show voting system
   - Point out consensus logic

4. **Highlight CDC Integration**
   - Show price comparison
   - Explain spread analysis
   - Mention Agent Client SDK usage
   - Show real-time updates

5. **Show Performance Metrics**
   - Win rate calculation
   - P&L tracking
   - Best/worst trades

---

## Hackathon Talking Points

### Technical Excellence
- ✅ Production-quality code
- ✅ Comprehensive error handling
- ✅ Full test coverage
- ✅ Complete documentation

### Innovation
- ✅ Multi-agent AI collaboration
- ✅ Multi-source price comparison
- ✅ Real-time WebSocket updates
- ✅ Sentiment-driven trading

### Crypto.com Integration
- ✅ Direct SDK usage
- ✅ Real-time price feeds
- ✅ Professional UI/UX
- ✅ Business value (arbitrage detection)

### User Experience
- ✅ Beautiful dashboard
- ✅ Smooth animations
- ✅ Responsive design
- ✅ Clear data visualization

---

## Support

If anything breaks:
1. Check backend logs
2. Check browser console
3. Run `python test_cdc_integration.py`
4. Restart all services

---

## 🎉 You're Ready!

All 3 hackathon features are complete and working.  
Start the services and enjoy! 🚀
