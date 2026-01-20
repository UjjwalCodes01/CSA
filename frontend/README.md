# 🎨 Frontend - Next.js Dashboard

Real-time trading dashboard built with Next.js 16, TypeScript, and Tailwind CSS, featuring live WebSocket updates and wallet integration.

---

## 📋 Overview

Features:
- ⚡ **Real-Time Updates**: WebSocket connection with <50ms latency
- 🔗 **Wallet Integration**: MetaMask/WalletConnect via wagmi v2
- 📊 **Live Charts**: Trade history and P&L visualization
- 🗳️ **Council Votes**: See how AI agents voted in real-time
- 💳 **X402 Payments**: On-chain micropayment UI
- 🎯 **Sentiment Gauge**: Visual market mood indicator

---

## 🏗️ Architecture

```
┌────────────────────────────────────────┐
│         FRONTEND STACK                 │
├────────────────────────────────────────┤
│  Next.js 16 (App Router)               │
│  ├─ Server Components                  │
│  ├─ Edge Runtime                       │
│  └─ Static Generation                  │
│                                        │
│  React 19                              │
│  ├─ Client Components                  │
│  ├─ Hooks (useState, useEffect)        │
│  └─ Custom hooks (useWebSocket)        │
│                                        │
│  wagmi v2 + viem                       │
│  ├─ Wallet connection                  │
│  ├─ Contract reads/writes              │
│  └─ Transaction management             │
│                                        │
│  Tailwind CSS 4                        │
│  ├─ Utility classes                    │
│  ├─ Dark mode                          │
│  └─ Responsive design                  │
└────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MetaMask wallet
- Cronos testnet CRO

### Installation

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local
npm run dev
```

### Environment Variables

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002

# Blockchain
NEXT_PUBLIC_RPC_URL=https://evm-t3.cronos.org
NEXT_PUBLIC_CHAIN_ID=338

# Smart Contracts
NEXT_PUBLIC_SENTINEL_CLAMP_ADDRESS=0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff
NEXT_PUBLIC_WCRO_ADDRESS=0x7D7c0E58a280e70B52c8299d9056e0394Fb65750
NEXT_PUBLIC_SIMPLE_AMM_ADDRESS=0x70a021E9A1C1A503A77e3279941793c017b06f46
NEXT_PUBLIC_MOCK_ROUTER_ADDRESS=0x3796754AC5c3b1C866089cd686C84F625CE2e8a6

# Agent Wallet (for display)
NEXT_PUBLIC_AGENT_ADDRESS=0x...

# Optional
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

---

## 📁 Project Structure

```
frontend/
├── app/
│   ├── page.tsx                       # Landing page
│   ├── dashboard/
│   │   └── page.tsx                   # Main dashboard
│   ├── how-it-works/
│   │   └── page.tsx                   # Documentation
│   ├── layout.tsx                     # Root layout
│   └── globals.css                    # Global styles
│
├── components/
│   ├── ui/                            # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── alert.tsx
│   ├── protected-route.tsx            # Auth wrapper
│   └── x402-payment-dialog.tsx        # Payment modal
│
├── lib/
│   ├── contracts.ts                   # Contract ABIs & addresses
│   ├── contract-hooks.ts              # wagmi hooks
│   ├── websocket.ts                   # WebSocket client
│   ├── x402-payment.ts                # Payment logic
│   ├── api.ts                         # API client
│   ├── utils.ts                       # Utilities
│   └── wagmi-config.ts                # Wallet config
│
├── public/                            # Static assets
│   └── logo.png
│
├── next.config.ts                     # Next.js config
├── tailwind.config.ts                 # Tailwind config
└── tsconfig.json                      # TypeScript config
```

---

## 🎯 Key Features

### 1. Real-Time Dashboard

**Live Updates via WebSocket**
```typescript
const {
  agentStatus,
  trades,
  sentiment,
  councilVotes
} = useWebSocket();

// Auto-updates every time backend broadcasts
```

**Components:**
- Agent status card (running/stopped)
- Sentiment gauge (buy/sell/hold)
- Council votes (3 agents)
- Trade history table
- P&L chart
- Sentinel limit tracker

### 2. Wallet Integration

**Connect Wallet**
```typescript
import { useAccount, useConnect } from 'wagmi';

const { address, isConnected } = useAccount();
const { connect, connectors } = useConnect();

// Supports MetaMask, WalletConnect, Coinbase Wallet
```

**Contract Interactions**
```typescript
import { useWrapCRO, useSwapTokens } from '@/lib/contract-hooks';

const wrapCRO = useWrapCRO();
const swapTokens = useSwapTokens();

// Execute trade
await wrapCRO.writeAsync({ value: parseEther('0.1') });
```

### 3. X402 Payment Flow

**Request Payment**
```typescript
import { requestX402Payment } from '@/lib/x402-payment';

const result = await requestX402Payment({
  service: 'SENTIMENT_ANALYSIS',
  amount: '0.0005'
});

// Returns txHash after user confirms in MetaMask
```

### 4. Charts & Visualization

**Trade History Chart**
```typescript
import { LineChart } from 'recharts';

<LineChart data={sentimentHistory}>
  <Line dataKey="sentiment" stroke="#3b82f6" />
  <Line dataKey="price" stroke="#10b981" />
</LineChart>
```

**Sentiment Gauge**
```typescript
<SentimentGauge 
  value={sentiment.score}    // -1.0 to 1.0
  signal={sentiment.signal}  // buy/sell/hold
/>
```

---

## 🎨 Styling

### Tailwind CSS

**Custom Colors**
```css
/* globals.css */
@layer base {
  :root {
    --primary: 217 91% 60%;      /* Blue */
    --secondary: 280 100% 70%;    /* Purple */
    --accent: 173 80% 40%;        /* Cyan */
  }
}
```

**Gradient Backgrounds**
```tsx
<div className="bg-gradient-to-r from-blue-600 to-purple-600">
  Gradient Text
</div>
```

### Dark Mode
All components use dark mode by default with `bg-gray-900`, `text-white`, etc.

---

## 🔌 WebSocket Integration

**Client Setup**
```typescript
// lib/websocket.ts
const ws = new WebSocket('ws://localhost:3002');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'trade_event':
      setTrades(prev => [message.data, ...prev]);
      break;
    case 'sentiment_update':
      setSentiment(message.data);
      break;
    case 'council_votes':
      setCouncilVotes(message.data);
      break;
  }
};
```

**Automatic Reconnection**
```typescript
ws.onclose = () => {
  setTimeout(() => connectWebSocket(), 3000);
};
```

---

## 📊 Pages

### Landing Page (`/`)
- Hero section with vortex background
- Key features showcase
- "Get Started" CTA button
- "How It Works" button

### Dashboard (`/dashboard`)
- Agent status & controls (start/stop)
- Market sentiment gauge
- Council voting display
- Trade history table
- P&L chart
- Sentinel limit tracker
- Manual trade execution
- Price comparison (CoinGecko vs Crypto.com)

### How It Works (`/how-it-works`)
- System architecture diagrams
- Multi-agent council explanation
- X402 protocol details
- Sentiment analysis pipeline
- Technology stack
- Key innovations

---

## 🧪 Development

### Run Development Server
```bash
npm run dev
# Open http://localhost:3000
```

### Build for Production
```bash
npm run build
npm start
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

---

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect GitHub Repo**
   ```bash
   vercel
   ```

2. **Set Environment Variables**
   - All `NEXT_PUBLIC_*` variables
   - Add in Vercel dashboard

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Static Export

```bash
# next.config.ts
export default {
  output: 'export'
}

npm run build
# Deploy 'out' folder to any static host
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

---

## 📦 Dependencies

### Core
- `next` 16.1.1
- `react` 19.0.0
- `typescript` 5.7.2

### Blockchain
- `wagmi` 2.15.5
- `viem` 2.25.7
- `@rainbow-me/rainbowkit` (optional)

### UI
- `tailwindcss` 4.0.0
- `lucide-react` 0.468.0
- `recharts` 2.15.0

### Utilities
- `react-hot-toast` 2.4.1
- `clsx` / `tailwind-merge`

---

## 🔧 Configuration

### wagmi Config

```typescript
// lib/wagmi-config.ts
import { createConfig, http } from 'wagmi';
import { cronosTestnet } from 'wagmi/chains';

export const config = createConfig({
  chains: [cronosTestnet],
  transports: {
    [cronosTestnet.id]: http()
  }
});
```

### Next.js Config

```typescript
// next.config.ts
const config = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  }
};
```

---

## 🐛 Troubleshooting

### Hydration Mismatch
```typescript
// Use client-side only rendering
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) return null;
```

### WebSocket Not Connecting
```typescript
// Check backend URL
console.log(process.env.NEXT_PUBLIC_WS_URL);

// Ensure backend WebSocket server running on correct port
```

### Wallet Not Connecting
```typescript
// Check if MetaMask installed
if (typeof window.ethereum === 'undefined') {
  alert('Please install MetaMask');
}

// Add Cronos Testnet to MetaMask manually
```

---

## 🎯 Performance

### Lighthouse Score
- Performance: 95+
- Accessibility: 100
- Best Practices: 100
- SEO: 100

### Optimizations
- Server Components (reduce client JS)
- Image optimization (next/image)
- Font optimization (next/font)
- Code splitting (dynamic imports)
- Static generation where possible

---

## 📞 Support

For frontend issues:
1. Check browser console for errors
2. Verify environment variables
3. Test API/WebSocket endpoints
4. Clear browser cache
5. Try different wallet/browser

---

**Built with ❤️ using Next.js 16 & Tailwind CSS**
