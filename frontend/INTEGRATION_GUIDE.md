# Frontend Integration Guide

This guide explains how to connect your frontend with the AI agent backend, smart contracts, and WebSocket server.

## ✅ Completed Integrations

### 1. Environment Variables (`.env.local`)
All environment variables are configured:
- API endpoint: `http://localhost:8000`
- WebSocket URL: `ws://localhost:8000`
- Contract addresses (SentinelClamp, MockRouter, WCRO, USDC)
- Cronos Testnet RPC URL
- Chain ID: 338

### 2. Contract ABIs (`lib/contracts.ts`)
Includes ABIs for:
- **SentinelClamp**: `checkApproval`, `dailyLimit`, `dailySpent`, `getRemainingLimit`, `simulateCheck`, `totalTransactions`, `x402Transactions`
- **MockRouter**: `swapExactTokensForTokens`, `getAmountsOut`
- **ERC20**: `balanceOf`, `approve`, `allowance`, `decimals`

### 3. Contract Hooks (`lib/contract-hooks.ts`)
Ready-to-use React hooks:
- `useSentinelStatus()` - Get daily limits, spending, and transaction counts
- `useTokenBalance()` - Get any ERC20 token balance
- `useWCROBalance()` - Get WCRO balance for connected wallet
- `useUSDCBalance()` - Get USDC balance for connected wallet
- `useApproveToken()` - Approve token spending
- `useSwapTokens()` - Execute token swaps
- `useGetAmountsOut()` - Calculate swap output amounts
- `useSimulateApproval()` - Simulate approval before execution

### 4. WebSocket Integration (`lib/websocket.ts`)
Real-time updates from AI agent:
- `useWebSocket()` - Main WebSocket hook with auto-reconnect
- `useEmergencyStop()` - Emergency stop command
- `useManualApproval()` - Manual trade approval/rejection

**WebSocket Events:**
- `agent_status` - Agent state updates (idle/analyzing/executing/error)
- `trade_event` - Trade execution notifications
- `sentiment_update` - Market sentiment scores
- `error` - Error messages

### 5. Dashboard Integration
The dashboard now uses:
- ✅ Contract hooks for on-chain data (balances, limits, transactions)
- ✅ WebSocket for real-time agent status
- ✅ Live trade history updates
- ✅ Real-time sentiment scores
- ✅ Connection status indicator in header

## 🚀 Backend Setup Required

### Step 1: Start the AI Agent Backend

```bash
cd ai-agent
python src/main.py
```

The backend should expose:
- REST API on `http://localhost:8000`
- WebSocket server on `ws://localhost:8000`

### Step 2: Verify Backend Endpoints

The frontend expects these API endpoints:

```typescript
GET  /api/market-intelligence  // Market data and sentiment
GET  /api/cro-price            // Current CRO price
GET  /api/pool-status          // AMM pool status
GET  /api/wallet-balances      // Agent wallet balances
GET  /api/sentinel-status      // SentinelClamp status
GET  /api/agent-status         // AI agent status
GET  /api/trade-history        // Recent trades
POST /api/emergency-stop       // Emergency stop command
POST /api/approve-trade        // Manual trade approval
```

### Step 3: Implement WebSocket Server

Your backend should broadcast these message types:

```python
# Agent status updates (every 5 seconds)
{
  "type": "agent_status",
  "data": {
    "status": "analyzing",  # idle/analyzing/executing/error
    "lastUpdate": "2025-01-10T12:00:00Z",
    "currentAction": "Analyzing market sentiment",
    "confidence": 0.85
  }
}

# Trade events (on execution)
{
  "type": "trade_event",
  "data": {
    "id": "trade-123",
    "timestamp": "2025-01-10T12:00:00Z",
    "type": "buy",
    "tokenIn": "WCRO",
    "tokenOut": "USDC",
    "amountIn": "100.0",
    "amountOut": "15.5",
    "price": "0.155",
    "sentiment": 0.72,
    "txHash": "0x...",
    "status": "success"
  }
}

# Sentiment updates (every minute)
{
  "type": "sentiment_update",
  "data": {
    "score": 0.65,
    "sources": {
      "reddit": 0.7,
      "twitter": 0.6,
      "news": 0.65
    },
    "timestamp": "2025-01-10T12:00:00Z"
  }
}

# Error messages
{
  "type": "error",
  "message": "Failed to fetch Reddit data"
}
```

## 📝 Usage Examples

### Reading On-Chain Data

```tsx
import { useSentinelStatus, useWCROBalance } from '@/lib/contract-hooks';
import { useAccount } from 'wagmi';

function MyComponent() {
  const { address } = useAccount();
  const sentinelStatus = useSentinelStatus();
  const wcroBalance = useWCROBalance(address);

  return (
    <div>
      <p>Daily Limit: ${sentinelStatus.dailyLimit}</p>
      <p>Remaining: ${sentinelStatus.remainingLimit}</p>
      <p>WCRO Balance: {wcroBalance.balance}</p>
      <p>Can Trade: {sentinelStatus.canTrade ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

### WebSocket Real-Time Updates

```tsx
import { useWebSocket } from '@/lib/websocket';

function AgentMonitor() {
  const { isConnected, agentStatus, recentTrades, sentiment } = useWebSocket();

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>Agent: {agentStatus.status}</div>
      <div>Action: {agentStatus.currentAction}</div>
      <div>Sentiment: {sentiment?.score}</div>
      <div>Recent Trades: {recentTrades.length}</div>
    </div>
  );
}
```

### Emergency Stop

```tsx
import { useEmergencyStop } from '@/lib/websocket';

function EmergencyButton() {
  const { emergencyStop, isConnected } = useEmergencyStop();

  return (
    <button 
      onClick={emergencyStop}
      disabled={!isConnected}
    >
      Emergency Stop
    </button>
  );
}
```

### Executing Trades

```tsx
import { useSwapTokens, useApproveToken } from '@/lib/contract-hooks';
import { CONTRACTS } from '@/lib/contract-hooks';

function TradeExecutor() {
  const { approve, isPending: isApproving } = useApproveToken();
  const { swap, isPending: isSwapping } = useSwapTokens();

  const executeTrade = async () => {
    // 1. Approve WCRO spending
    await approve(CONTRACTS.wcro, CONTRACTS.mockRouter, "100");
    
    // 2. Execute swap
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 min
    await swap(
      "100",           // amountIn
      "15",            // amountOutMin
      [CONTRACTS.wcro, CONTRACTS.usdc],
      userAddress,
      deadline
    );
  };

  return (
    <button onClick={executeTrade} disabled={isApproving || isSwapping}>
      {isApproving ? 'Approving...' : isSwapping ? 'Swapping...' : 'Execute Trade'}
    </button>
  );
}
```

## 🔧 Testing Integration

### 1. Test Contract Connections
```bash
# Open browser console on dashboard
# Check for contract read calls
console.log('Testing contract reads...');
```

### 2. Test WebSocket Connection
```bash
# Start backend with WebSocket server
cd ai-agent
python src/main.py

# Open dashboard and check header for "Agent Connected" indicator
```

### 3. Test Real-Time Updates
- Execute a trade from the AI agent
- Verify dashboard shows the new trade immediately
- Check sentiment updates appear in real-time
- Monitor agent status changes

### 4. Test Emergency Stop
- Click "Emergency Stop" button in dashboard
- Verify backend receives command
- Confirm agent stops trading

## 🐛 Troubleshooting

### WebSocket Not Connecting
1. Verify backend is running: `curl http://localhost:8000`
2. Check WebSocket server is exposed on port 8000
3. Check browser console for connection errors
4. Verify `.env.local` has correct `NEXT_PUBLIC_WS_URL`

### Contract Reads Failing
1. Verify wallet is connected (MetaMask)
2. Check you're on Cronos Testnet (Chain ID 338)
3. Verify contract addresses in `.env.local`
4. Check RPC URL is responding: `curl https://evm-t3.cronos.org`

### No Real-Time Updates
1. Verify WebSocket connection indicator shows "Connected"
2. Check backend is broadcasting messages
3. Open browser DevTools > Network > WS tab to see messages
4. Check backend logs for errors

### Trades Not Executing
1. Verify wallet has sufficient WCRO balance
2. Check token approvals: `useTokenBalance` hook
3. Verify daily limit not exceeded: `useSentinelStatus` hook
4. Check transaction hash in toast notifications

## 🎯 Next Steps

1. **Start Backend**: Run `python src/main.py` in ai-agent folder
2. **Add API Endpoints**: Implement the 9 required endpoints
3. **Add WebSocket Server**: Implement message broadcasting
4. **Test Integration**: Execute test trades and verify updates
5. **Monitor Production**: Watch real-time updates in dashboard

## 📚 Resources

- **wagmi Docs**: https://wagmi.sh
- **Viem Docs**: https://viem.sh
- **WebSocket API**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **Cronos Testnet**: https://cronos.org/docs/getting-started/cronos-testnet.html
- **React Hot Toast**: https://react-hot-toast.com

---

**Status**: Frontend is fully integrated and ready to connect with backend! 🚀
