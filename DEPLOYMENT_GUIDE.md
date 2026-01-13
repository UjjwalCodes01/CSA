# 🚀 TESTNET PRODUCTION DEPLOYMENT GUIDE

Deploy your autonomous trading system to the cloud for 24/7 operation:
- **Frontend:** Vercel (free tier)
- **Backend:** Render (free tier)
- **AI Agent:** Render (free tier)

---

## 📋 **Pre-Deployment Checklist**

### **1. Remove Debug Logs**
Remove console.log statements from production code:

**File:** `frontend/app/dashboard/page.tsx`
```typescript
// REMOVE these lines (around line 291-301):
console.log('Wallet Debug:', {...});
console.log('Setting balances:', {...});
```

### **2. Create Root .gitignore**
```bash
cd C:\Users\DELL\OneDrive\Desktop\CSA
echo .env >> .gitignore
echo *.env >> .gitignore
echo .env.local >> .gitignore
echo node_modules/ >> .gitignore
echo .DS_Store >> .gitignore
```

### **3. Prepare Environment Variables**
You'll need to set these on Vercel and Render (DO NOT commit to git).

---

## 🌐 **PART 1: Deploy Frontend to Vercel**

### **Step 1: Prepare Frontend**

1. **Update `frontend/.env.local`** (for local testing only, don't commit):
```env
# Will be replaced by Vercel environment variables
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_WS_URL=wss://your-backend.onrender.com/ws
NEXT_PUBLIC_RPC_URL=https://evm-t3.cronos.org
NEXT_PUBLIC_SENTINEL_CLAMP_ADDRESS=0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
NEXT_PUBLIC_MOCK_ROUTER_ADDRESS=0x3796754AC5c3b1C866089cd686C84F625CE2e8a6
NEXT_PUBLIC_WCRO_ADDRESS=0x5C7F8a570d578ED84e63FdFA7b5a2f628d2B4d2A
NEXT_PUBLIC_TUSD_ADDRESS=0xc21223249CA28397B4B6541dfFaECc539BfF0c59
NEXT_PUBLIC_CHAIN_ID=338
```

2. **Check `frontend/package.json` has build script:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

### **Step 2: Deploy to Vercel**

1. **Push code to GitHub:**
```bash
cd C:\Users\DELL\OneDrive\Desktop\CSA
git init
git add .
git commit -m "Initial commit for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/CSA.git
git push -u origin main
```

2. **Go to [vercel.com](https://vercel.com)**
   - Sign up with GitHub
   - Click "Add New Project"
   - Import your CSA repository
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js (auto-detected)

3. **Configure Environment Variables in Vercel:**
   - Go to Project Settings → Environment Variables
   - Add these (production values):

```
NEXT_PUBLIC_API_URL = https://your-backend-name.onrender.com/api
NEXT_PUBLIC_WS_URL = wss://your-backend-name.onrender.com/ws
NEXT_PUBLIC_RPC_URL = https://evm-t3.cronos.org
NEXT_PUBLIC_SENTINEL_CLAMP_ADDRESS = 0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
NEXT_PUBLIC_MOCK_ROUTER_ADDRESS = 0x3796754AC5c3b1C866089cd686C84F625CE2e8a6
NEXT_PUBLIC_WCRO_ADDRESS = 0x5C7F8a570d578ED84e63FdFA7b5a2f628d2B4d2A
NEXT_PUBLIC_TUSD_ADDRESS = 0xc21223249CA28397B4B6541dfFaECc539BfF0c59
NEXT_PUBLIC_CHAIN_ID = 338
```

4. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your frontend will be live at `https://your-app.vercel.app`

---

## ⚙️ **PART 2: Deploy Backend to Render**

### **Step 1: Prepare Backend**

1. **Update `backend/src/index.js` CORS configuration:**
```javascript
// Find this line (around line 74):
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Make sure FRONTEND_URL accepts your Vercel domain
```

2. **Create `backend/package.json` start script** (already exists):
```json
{
  "scripts": {
    "start": "node src/index.js"
  }
}
```

3. **Create `backend/render.yaml` (optional but recommended):**
```yaml
services:
  - type: web
    name: csa-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
```

### **Step 2: Deploy to Render**

1. **Go to [render.com](https://render.com)**
   - Sign up with GitHub
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - **Root Directory:** `backend`

2. **Configure Service:**
   - **Name:** `csa-backend`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

3. **Add Environment Variables:**
   - Click "Environment" tab
   - Add these:

```
NODE_ENV = production
PORT = 3001
FRONTEND_URL = https://your-app.vercel.app
RPC_URL = https://evm-t3.cronos.org
CHAIN_ID = 338
SENTINEL_CLAMP_ADDRESS = 0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
MOCK_ROUTER_ADDRESS = 0x3796754AC5c3b1C866089cd686C84F625CE2e8a6
WCRO_ADDRESS = 0x5C7F8a570d578ED84e63FdFA7b5a2f628d2B4d2A
TUSD_ADDRESS = 0xc21223249CA28397B4B6541dfFaECc539BfF0c59
AGENT_PRIVATE_KEY = 0x350e478db22043664e5934808a431762694206420aaa705fd3baabaeebc27024
```

4. **Deploy:**
   - Click "Create Web Service"
   - Wait 5-10 minutes
   - Backend will be live at `https://csa-backend.onrender.com`

5. **Copy Backend URL:**
   - Go back to Vercel
   - Update environment variables with your Render backend URL
   - Redeploy frontend

---

## 🤖 **PART 3: Deploy AI Agent to Render**

### **Step 1: Prepare AI Agent**

1. **Create `ai-agent/requirements.txt`** (should already exist):
```txt
python-dotenv
web3
requests
langchain-core
langchain-google-genai
praw
feedparser
```

2. **Create `ai-agent/start.sh`:**
```bash
#!/bin/bash
python run_autonomous_trader.py
```

3. **Make it executable:**
```bash
chmod +x ai-agent/start.sh
```

### **Step 2: Deploy to Render as Background Worker**

1. **Go to [render.com](https://render.com)**
   - Click "New +" → "Background Worker"
   - Connect your GitHub repository
   - **Root Directory:** `ai-agent`

2. **Configure Worker:**
   - **Name:** `csa-ai-agent`
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python run_autonomous_trader.py`
   - **Plan:** Free

3. **Add Environment Variables:**

```
GEMINI_API_KEY = AIzaSyDKwT3vlZm4XcYBvJkbJtiRkQVLeZuBcaU
DEVELOPER_PLATFORM_API_KEY = sk-proj-ac1846188201c59d4a594ba7e1d3b247:75fc216f88826874127b5f67a84781f4d8374e2758891999eb53eca09ed1e767d9faccefc21d14d116a5c641551dbf5a
PRIVATE_KEY = 0x350e478db22043664e5934808a431762694206420aaa705fd3baabaeebc27024
RPC_URL = https://evm-t3.cronos.org
CHAIN_ID = 338
SENTINEL_CLAMP_ADDRESS = 0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
MOCK_ROUTER_ADDRESS = 0x3796754AC5c3b1C866089cd686C84F625CE2e8a6
WCRO_ADDRESS = 0x7D7c0E58a280e70B52c8299d9056e0394Fb65750
USDC_ADDRESS = 0xc21223249CA28397B4B6541dfFaECc539BfF0c59
BACKEND_URL = https://csa-backend.onrender.com/api
```

4. **Deploy:**
   - Click "Create Background Worker"
   - Agent will run 24/7 in background

---

## 🔧 **Post-Deployment Configuration**

### **1. Update Backend Client in AI Agent**

The AI agent needs to know the production backend URL.

**File:** `ai-agent/backend_client.py` (line 10)
```python
def __init__(self, base_url=None):
    # Use environment variable or default to Render backend
    self.base_url = base_url or os.getenv("BACKEND_URL", "http://localhost:3001/api")
    self.session = requests.Session()
```

### **2. Update Backend CORS**

Make sure backend accepts requests from Vercel domain.

**File:** `backend/src/index.js`
```javascript
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({
  origin: [FRONTEND_URL, 'https://your-app.vercel.app'],
  credentials: true
}));
```

### **3. Test Everything**

1. **Check Backend Health:**
```bash
curl https://csa-backend.onrender.com/api/health
```

2. **Check Frontend:**
   - Open `https://your-app.vercel.app`
   - Connect wallet
   - Check dashboard loads

3. **Check AI Agent Logs:**
   - Go to Render dashboard
   - Click on "csa-ai-agent"
   - Check logs for "✅ Backend is online, sending updates..."

---

## ⚠️ **IMPORTANT: Free Tier Limitations**

### **Render Free Tier:**
- **Backend:** Spins down after 15 minutes of inactivity
- **AI Agent:** Runs continuously (stays active)
- **Solution:** AI agent keeps backend alive by sending requests every 15 min

### **Vercel Free Tier:**
- **Bandwidth:** 100GB/month (plenty for this app)
- **Build Time:** 6000 minutes/month
- **No limitations** for your use case

### **Keep Backend Alive:**
The AI agent already sends requests every 15 minutes, which will keep the backend from sleeping!

---

## 🎯 **Deployment Checklist**

- [ ] Remove debug console.logs from frontend
- [ ] Create root .gitignore
- [ ] Push code to GitHub
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Render (Web Service)
- [ ] Deploy AI agent to Render (Background Worker)
- [ ] Update Vercel env vars with Render backend URL
- [ ] Update backend CORS with Vercel frontend URL
- [ ] Test complete flow (frontend → backend → agent)
- [ ] Monitor logs for 1 hour to ensure stability

---

## 📊 **Expected Costs**

| Service | Plan | Cost |
|---------|------|------|
| Vercel (Frontend) | Free | $0/month |
| Render (Backend) | Free | $0/month |
| Render (AI Agent) | Free | $0/month |
| **Total** | | **$0/month** |

**Upgrade options if needed:**
- Render Pro: $7/month (faster, no sleep)
- Vercel Pro: $20/month (custom domains, analytics)

---

## 🚀 **Go Live!**

Once deployed, your system will be accessible at:
- **Frontend:** `https://your-app.vercel.app`
- **Backend:** `https://csa-backend.onrender.com`
- **Agent:** Running 24/7 in background

Your autonomous trading agent will make decisions every 15 minutes, executing trades on Cronos Testnet automatically! 🎉

---

## 🔍 **Monitoring Production**

### **Check Agent Status:**
```bash
curl https://csa-backend.onrender.com/api/agent/status
```

### **Check Recent Decisions:**
```bash
curl https://csa-backend.onrender.com/api/agent/decisions
```

### **View Logs:**
- Vercel: Project → Deployments → Click deployment → Runtime Logs
- Render Backend: Dashboard → csa-backend → Logs
- Render Agent: Dashboard → csa-ai-agent → Logs

---

**🎉 Your testnet autonomous trading system is now production-ready and running 24/7!**
