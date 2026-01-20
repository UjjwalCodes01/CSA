# ✅ Deployment Checklist

Quick reference checklist for deploying CSA Trading System.

---

## 🎯 Code Verification (Before Deployment)

### ✅ Start/Stop Button Integration
- [x] Frontend has Start/Stop button in dashboard
- [x] Frontend calls `/api/agent/start` and `/api/agent/stop`
- [x] Backend spawns Python process: `spawn('python3', [aiAgentPath])`
- [x] Backend kills process on stop: `agentProcess.kill('SIGTERM')`
- [x] Agent runs forever loop: `run_forever()` → `schedule.every(15).minutes`
- [x] Agent makes immediate decision on start
- [x] WebSocket broadcasts status updates

**Status:** ✅ READY - Agent triggers properly from dashboard button

### ✅ Core Functionality
- [x] Multi-agent council votes (3 agents)
- [x] Sentiment aggregation (CoinGecko, News, Reddit, Technical)
- [x] SentinelClamp daily limits enforced on-chain
- [x] X402 micropayments for AI services
- [x] WebSocket real-time updates to dashboard
- [x] Trade history tracking and display
- [x] Smart contracts deployed to Cronos Testnet

**Status:** ✅ READY - All features working locally

---

## 🚀 Deployment Steps

### Step 1: Backend Deployment (Railway)

```bash
cd backend

# Initialize Railway
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set RPC_URL=https://evm-t3.cronos.org
railway variables set SENTINEL_CLAMP_ADDRESS=0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
railway variables set WCRO_ADDRESS=0x7D7c0E58a280e70B52c8299d9056e0394Fb65750
railway variables set SIMPLE_AMM_ADDRESS=0x70a021E9A1C1A503A77e3279941793c017b06f46
railway variables set MOCK_ROUTER_ADDRESS=0x3796754AC5c3b1C866089cd686C84F625CE2e8a6

# Private keys (KEEP SECRET!)
railway variables set BACKEND_PRIVATE_KEY=<your_backend_key>
railway variables set AGENT_PRIVATE_KEY=<your_agent_key>

# API Keys
railway variables set CDC_AGENT_API_KEY=<your_key>
railway variables set GEMINI_API_KEY=<your_key>
railway variables set COINGECKO_API_KEY=<your_key>
railway variables set NEWS_API_KEY=<your_key>

# Deploy
railway up

# Get URL
railway domain
```

**Save Backend URL:** `_______________________`

---

### Step 2: Frontend Deployment (Vercel)

```bash
cd frontend

# Update .env.production with backend URL
# NEXT_PUBLIC_API_URL=https://your-backend.railway.app
# NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app/ws

# Deploy
vercel --prod

# Configure env vars in Vercel dashboard:
# - NEXT_PUBLIC_API_URL
# - NEXT_PUBLIC_WS_URL
# - NEXT_PUBLIC_SENTINEL_CLAMP_ADDRESS
# - NEXT_PUBLIC_WCRO_ADDRESS
# - NEXT_PUBLIC_SIMPLE_AMM_ADDRESS
# - NEXT_PUBLIC_MOCK_ROUTER_ADDRESS
# - NEXT_PUBLIC_AGENT_ADDRESS
```

**Save Frontend URL:** `_______________________`

---

### Step 3: Update Backend CORS

```bash
cd backend
railway variables set FRONTEND_URL=https://your-vercel-url.app
railway up
```

---

### Step 4: Verification

- [ ] **Backend Health Check**
  ```bash
  curl https://your-backend.railway.app/api/health
  # Should return: {"status":"ok",...}
  ```

- [ ] **Frontend Loads**
  - Open: https://your-vercel-url.app
  - Dashboard accessible
  - No console errors

- [ ] **Wallet Connection**
  - MetaMask connects successfully
  - Shows correct network (Cronos Testnet)
  - Can see wallet address

- [ ] **Agent Start/Stop**
  - Click "Start Agent" button
  - Agent status changes to "Running"
  - Backend logs show: `[AI Agent] 🤖 Starting...`
  - WebSocket connected (check console)

- [ ] **Real-Time Updates**
  - Sentiment gauge updates
  - Council votes appear
  - Trade history shows latest trades
  - "Last Trade Decision" card shows most recent

- [ ] **First Autonomous Trade**
  - Wait 15 minutes after starting agent
  - Check dashboard for new trade
  - Verify council votes recorded
  - Check blockchain explorer for transaction

---

## 🔍 Quick Tests

### Test 1: Backend API
```bash
# Health check
curl https://your-backend.railway.app/api/health

# Agent status
curl https://your-backend.railway.app/api/agent/status

# Trade history
curl https://your-backend.railway.app/api/trades/history
```

### Test 2: Start Agent
1. Open dashboard
2. Click "Start Agent"
3. Check backend logs: `railway logs`
4. Look for: `🚀 Starting AI agent...`
5. Wait for: `[AI Agent] 🤖 AUTONOMOUS TRADER...`

### Test 3: WebSocket
1. Open browser console
2. Look for: `WebSocket connected`
3. Check Network tab → WS tab
4. Should see messages flowing

### Test 4: First Trade
1. Wait 15 minutes after agent starts
2. Dashboard should show:
   - New sentiment reading
   - Council votes (3 agents)
   - Trade decision (BUY/SELL/HOLD)
   - If BUY/SELL with >70% confidence → trade executes

---

## 📊 Production Monitoring

### Backend Logs (Railway)
```bash
railway logs --tail
```

**Watch for:**
- ✅ `[AI Agent] 🤖 Starting cycle...`
- ✅ `📊 Sentiment aggregation complete`
- ✅ `🗳️ Multi-Agent Council Vote`
- ✅ `Consensus: BUY/SELL/HOLD`
- ✅ `💰 Trade executed successfully`
- ❌ Any errors or crashes

### Frontend (Vercel Dashboard)
- Page views
- Error rates
- Performance metrics
- Check: https://vercel.com/dashboard

### Cronos Testnet Explorer
- Monitor transactions
- Check contract interactions
- URL: https://explorer-cronostest.crypto.org/
- Search: `0xa22Db5E0d0df88424207B6fadE76ae7a6FAABE94` (agent wallet)

---

## 🐛 Common Issues & Fixes

### Issue: Agent doesn't start
**Fix:**
```bash
# Check Python installed on Railway
# Add nixpacks.toml with python311

# Check ai-agent folder accessible
# Ensure it's in repo root (it is ✅)

# Check environment variables
railway variables
```

### Issue: WebSocket not connecting
**Fix:**
```bash
# Frontend .env should use wss:// (not ws://)
# NEXT_PUBLIC_WS_URL=wss://backend.railway.app/ws

# Check CORS allows frontend domain
# railway variables set FRONTEND_URL=https://frontend.vercel.app
```

### Issue: Trades fail
**Fix:**
```bash
# Check agent wallet has CRO for gas
# Check SentinelClamp daily limit not exceeded
# Check RPC URL correct: https://evm-t3.cronos.org
```

---

## 📝 Final Pre-Launch Checklist

- [ ] Backend deployed to Railway ✅
- [ ] Frontend deployed to Vercel ✅
- [ ] All environment variables set correctly
- [ ] CORS configured (frontend URL in backend)
- [ ] Agent starts from dashboard button
- [ ] WebSocket connects and updates in real-time
- [ ] First test trade executed successfully (wait 15 min)
- [ ] All smart contracts verified on explorer
- [ ] Demo video recorded (optional)
- [ ] README updated with deployment URLs
- [ ] Hackathon submission ready

---

## 🎉 Deployment URLs

After deployment, record your URLs here:

```
Frontend:  https://___________________________.vercel.app
Backend:   https://___________________________.railway.app
Dashboard: https://___________________________.vercel.app/dashboard
```

---

## 📞 Support

If issues persist:
1. Check `DEPLOYMENT_GUIDE.md` for detailed troubleshooting
2. Review backend logs: `railway logs`
3. Check browser console for frontend errors
4. Verify all environment variables are set
5. Test each component individually

---

**Ready to deploy?** Follow the steps above and check off each item. Good luck! 🚀
