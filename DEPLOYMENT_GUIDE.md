# 🚀 Deployment Guide - CSA Trading System

Complete step-by-step guide to deploy the autonomous trading system to production.

---

## 📋 Pre-Deployment Checklist

- [ ] All smart contracts deployed to Cronos Testnet ✅ (Already done)
- [ ] `.env` files configured with production values
- [ ] Backend tested locally
- [ ] Frontend tested locally
- [ ] AI agent tested with start/stop button
- [ ] All dependencies installed

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   DEPLOYMENT STACK                      │
├─────────────────────────────────────────────────────────┤
│  Frontend (Next.js)     → Vercel                       │
│  Backend (Node.js)      → Railway/Render/DigitalOcean  │
│  AI Agent (Python)      → Runs on same server as backend│
│  Smart Contracts        → Cronos Testnet (deployed ✅)  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Deployment Steps

### Step 1: Deploy Backend (with AI Agent)

The backend and AI agent run on the same server since the backend spawns the Python process.

#### Option A: Railway (Recommended - Easy & Free Tier)

1. **Create Railway Account**
   ```bash
   # Visit: https://railway.app
   # Sign up with GitHub
   ```

2. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

3. **Prepare Backend for Deployment**
   ```bash
   cd backend
   
   # Create railway.json
   cat > railway.json << 'EOF'
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "node src/index.js",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   EOF
   
   # Ensure package.json has start script
   # Already has: "start": "node src/index.js"
   ```

4. **Deploy to Railway**
   ```bash
   # Initialize project
   railway init
   
   # Add environment variables (Railway dashboard)
   railway variables set NODE_ENV=production
   railway variables set PORT=3001
   railway variables set RPC_URL=https://evm-t3.cronos.org
   railway variables set SENTINEL_CLAMP_ADDRESS=0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
   railway variables set WCRO_ADDRESS=0x7D7c0E58a280e70B52c8299d9056e0394Fb65750
   railway variables set SIMPLE_AMM_ADDRESS=0x70a021E9A1C1A503A77e3279941793c017b06f46
   railway variables set MOCK_ROUTER_ADDRESS=0x3796754AC5c3b1C866089cd686C84F625CE2e8a6
   railway variables set X402_ENABLED=true
   railway variables set X402_DEV_MODE=false
   
   # Add your private keys (IMPORTANT: Keep these secret!)
   railway variables set BACKEND_PRIVATE_KEY=your_backend_wallet_private_key
   railway variables set AGENT_PRIVATE_KEY=your_agent_wallet_private_key
   
   # Add API keys
   railway variables set CDC_AGENT_API_KEY=your_crypto_com_key
   railway variables set GEMINI_API_KEY=your_google_gemini_key
   railway variables set COINGECKO_API_KEY=your_coingecko_key
   railway variables set NEWS_API_KEY=your_news_api_key
   
   # Deploy
   railway up
   
   # Get deployment URL
   railway domain
   # Example output: https://csa-backend-production.up.railway.app
   ```

5. **Install Python on Railway**
   
   Railway uses Nixpacks which auto-detects languages. Since you have both Node.js and Python:
   
   ```bash
   # Create nixpacks.toml in backend/
   cat > nixpacks.toml << 'EOF'
   [phases.setup]
   nixPkgs = ["nodejs_20", "python311", "python311Packages.pip"]
   
   [phases.install]
   cmds = [
     "npm install",
     "cd ../ai-agent && pip install -r requirements.txt"
   ]
   
   [start]
   cmd = "node src/index.js"
   EOF
   ```

6. **Copy AI Agent to Backend Directory**
   ```bash
   # Railway needs ai-agent accessible from backend
   # Already configured in backend: ../../ai-agent/run_autonomous_trader.py
   # Make sure ai-agent folder is in the repository root (it is ✅)
   ```

#### Option B: Render.com (Alternative - Free Tier)

1. **Visit Render.com**
   - Sign up at https://render.com
   - Connect your GitHub repo

2. **Create Web Service**
   - Select: CSA repository
   - Root Directory: `backend`
   - Build Command: `npm install && cd ../ai-agent && pip install -r requirements.txt`
   - Start Command: `node src/index.js`

3. **Add Environment Variables** (same as Railway above)

4. **Deploy**

#### Option C: DigitalOcean App Platform

1. **Create App**
   - Go to https://cloud.digitalocean.com/apps
   - Select GitHub repo
   - Choose "backend" directory

2. **Configure**
   - Type: Web Service
   - Build Command: `npm install`
   - Run Command: `node src/index.js`

3. **Add Environment Variables** (same as above)

---

### Step 2: Deploy Frontend (Next.js)

#### Vercel (Recommended - Built for Next.js)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Configure Frontend**
   ```bash
   cd frontend
   
   # Update .env.production
   cat > .env.production << 'EOF'
   # Backend API (UPDATE WITH YOUR RAILWAY/RENDER URL)
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-backend-url.railway.app/ws
   
   # Blockchain
   NEXT_PUBLIC_RPC_URL=https://evm-t3.cronos.org
   NEXT_PUBLIC_CHAIN_ID=338
   
   # Smart Contracts (Cronos Testnet)
   NEXT_PUBLIC_SENTINEL_CLAMP_ADDRESS=0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
   NEXT_PUBLIC_WCRO_ADDRESS=0x7D7c0E58a280e70B52c8299d9056e0394Fb65750
   NEXT_PUBLIC_SIMPLE_AMM_ADDRESS=0x70a021E9A1C1A503A77e3279941793c017b06f46
   NEXT_PUBLIC_MOCK_ROUTER_ADDRESS=0x3796754AC5c3b1C866089cd686C84F625CE2e8a6
   
   # Agent Wallet (for display)
   NEXT_PUBLIC_AGENT_ADDRESS=0xa22Db5E0d0df88424207B6fadE76ae7a6FAABE94
   EOF
   ```

3. **Deploy to Vercel**
   ```bash
   # Deploy
   vercel
   
   # Or deploy to production
   vercel --prod
   
   # Get URL
   # Example: https://csa-trading.vercel.app
   ```

4. **Configure Environment Variables in Vercel Dashboard**
   - Go to: https://vercel.com/dashboard
   - Select your project → Settings → Environment Variables
   - Add all `NEXT_PUBLIC_*` variables from `.env.production`

5. **Update Backend CORS**
   
   After deploying frontend, update backend's `FRONTEND_URL`:
   ```bash
   # On Railway
   railway variables set FRONTEND_URL=https://your-frontend-url.vercel.app
   
   # Redeploy backend
   railway up
   ```

---

### Step 3: Verify Deployment

1. **Test Backend**
   ```bash
   curl https://your-backend-url.railway.app/api/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

2. **Test Frontend**
   - Open: https://your-frontend-url.vercel.app
   - Connect MetaMask wallet
   - Click "Start Agent" button
   - Verify agent status changes to "Running"
   - Check console for WebSocket connection

3. **Test AI Agent**
   - After clicking "Start Agent"
   - Wait 1-2 minutes
   - Check dashboard for:
     - ✅ Agent status: "Running"
     - ✅ Sentiment gauge updating
     - ✅ Council votes appearing
     - ✅ First trade decision (after 15 min cycle)

4. **Check Backend Logs**
   ```bash
   # Railway
   railway logs
   
   # Look for:
   # "🚀 Starting AI agent..."
   # "[AI Agent] 🤖 AUTONOMOUS TRADER..."
   # "📊 Sentiment aggregation complete"
   ```

---

## 🔐 Security Checklist

- [ ] **Never commit** `.env` files to GitHub
- [ ] Use **environment variables** for all secrets
- [ ] Backend private key has **only necessary CRO** (for gas)
- [ ] Agent wallet **whitelisted** with SentinelClamp
- [ ] **Daily limits** configured on SentinelClamp contract
- [ ] Frontend uses **HTTPS** (Vercel default)
- [ ] Backend uses **HTTPS** (Railway/Render default)
- [ ] **CORS** configured to allow only frontend domain

---

## 🐛 Troubleshooting

### Agent Not Starting

**Issue:** Click "Start Agent" but status stays "Idle"

**Solutions:**
```bash
# Check backend logs
railway logs

# Common issues:
# 1. Python not installed on server
#    → Add python to nixpacks.toml

# 2. AI agent dependencies missing
#    → Ensure pip install runs in build step

# 3. .env missing on server
#    → Add all variables via Railway dashboard

# 4. Path issues
#    → Check aiAgentPath in backend/src/index.js
```

### WebSocket Not Connecting

**Issue:** Frontend shows "Disconnected" or no live updates

**Solutions:**
```bash
# 1. Check WebSocket URL
# Frontend .env should have:
NEXT_PUBLIC_WS_URL=wss://your-backend-url.railway.app/ws
# (Note: wss:// for production, ws:// for local)

# 2. Check backend CORS
# Should allow frontend domain in ws.on('connection')

# 3. Check Railway/Render WebSocket support
# Both support WebSockets by default ✅
```

### Trades Not Executing

**Issue:** Agent makes decisions but trades fail

**Solutions:**
```bash
# 1. Check wallet balances
# Agent wallet needs CRO for gas + trades

# 2. Check SentinelClamp
# Ensure daily limit not exceeded

# 3. Check RPC connection
# Verify RPC_URL is correct for Cronos Testnet

# 4. Check smart contract addresses
# All addresses must match deployed contracts
```

### Python Process Crashes

**Issue:** Agent starts then immediately stops

**Solutions:**
```bash
# Check backend logs for Python errors
railway logs | grep "AI Agent"

# Common issues:
# 1. Missing dependencies
#    → pip install -r requirements.txt

# 2. Import errors
#    → Check Python path and module imports

# 3. API key errors
#    → Verify all API keys are set in env vars
```

---

## 📊 Monitoring Production

### Backend Health
```bash
# Railway
railway logs --tail

# Render
# Check logs in dashboard

# What to watch:
# ✅ "[AI Agent] 🤖 Starting cycle..."
# ✅ "📊 Sentiment aggregation complete"
# ✅ "🗳️ Multi-Agent Council Vote"
# ✅ "💰 Trade executed successfully"
```

### Frontend Analytics
```bash
# Vercel automatically provides:
# - Page views
# - Error rates
# - Performance metrics
# - Real-time visitor count

# Access at: vercel.com/dashboard → your-project → Analytics
```

### Smart Contract Events
```bash
# Monitor Cronos Testnet:
# https://explorer-cronostest.crypto.org/

# Search for your contracts:
# - SentinelClamp: 0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
# - WCRO: 0x7D7c0E58a280e70B52c8299d9056e0394Fb65750
# - SimpleAMM: 0x70a021E9A1C1A503A77e3279941793c017b06f46
```

---

## 🎉 Final Steps

1. **Update Main README**
   ```bash
   # Add deployment URLs to README.md
   # Replace [TO BE UPDATED] with actual URLs
   ```

2. **Test End-to-End**
   - [ ] Frontend loads
   - [ ] Wallet connects
   - [ ] Dashboard shows data
   - [ ] Start/Stop agent works
   - [ ] WebSocket updates in real-time
   - [ ] Manual trades execute
   - [ ] AI agent makes autonomous trades

3. **Create Demo Video** (Optional for Hackathon)
   - Record agent starting
   - Show sentiment analysis
   - Show council votes
   - Show trade execution
   - Show dashboard updates

4. **Submit to Hackathon**
   - [ ] Add deployment URLs to submission
   - [ ] Include demo video link
   - [ ] Verify all sponsor integrations working:
     - ✅ Crypto.com SDK (Agent Client)
     - ✅ Google Gemini AI
     - ✅ CoinGecko API
     - ✅ Cronos Testnet
     - ✅ Smart contracts deployed

---

## 🚀 Quick Deploy Commands

```bash
# 1. Deploy Backend to Railway
cd backend
railway init
railway variables set ... # (all env vars from above)
railway up
railway domain  # Get URL

# 2. Update Frontend .env
cd ../frontend
# Edit .env.production with backend URL
vercel --prod

# 3. Update Backend CORS
cd ../backend
railway variables set FRONTEND_URL=https://your-vercel-url.app
railway up

# 4. Test
curl https://your-backend.railway.app/api/health
open https://your-frontend.vercel.app

# 5. Verify
# Click "Start Agent" → Check logs → Wait for first trade (15 min)
```

---

## 📝 Production URLs Template

After deployment, update these in your hackathon submission:

```
🌐 Live Demo: https://csa-trading.vercel.app
🔧 Backend API: https://csa-backend.railway.app
📊 Dashboard: https://csa-trading.vercel.app/dashboard
📖 How It Works: https://csa-trading.vercel.app/how-it-works

🔗 Smart Contracts (Cronos Testnet):
- SentinelClamp: 0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
- WCRO: 0x7D7c0E58a280e70B52c8299d9056e0394Fb65750
- SimpleAMM: 0x70a021E9A1C1A503A77e3279941793c017b06f46
- MockRouter: 0x3796754AC5c3b1C866089cd686C84F625CE2e8a6

📹 Demo Video: [Your YouTube/Loom link]
💻 GitHub: https://github.com/your-username/CSA
```

---

**Built for the love of the game** 🎮❤️
