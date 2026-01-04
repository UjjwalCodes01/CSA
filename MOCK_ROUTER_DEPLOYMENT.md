# MockRouter Deployment Guide

## 📋 Overview

MockRouter is a testnet-only smart contract that simulates DEX swap behavior without moving actual tokens. It enables safe, deterministic demos with real on-chain transactions.

---

## 🎯 Purpose

- **Demo Safety**: Creates real blockchain transactions without risking funds
- **Sentinel Integration**: Works with SentinelClamp for safety enforcement
- **Event Logging**: Emits structured events for audit trail
- **Future-Proof**: Easy to swap with real VVS Router on mainnet

---

## 📦 What's Included

### Smart Contracts
- `contract/src/MockRouter.sol` - Main mock router contract
- `contract/test/MockRouter.t.sol` - Comprehensive test suite
- `contract/script/DeployMockRouter.s.sol` - Deployment script

### Backend Integration
- `backend/src/agents/execution/dex-executor.js` - Execution adapter
- `backend/src/agents/execution/dex-mock-executor.js` - Mock backend
- `backend/src/agents/execution/dex-vvs-executor.js` - VVS backend (future)

---

## 🚀 Deployment Instructions

### Prerequisites
```bash
# Ensure you have:
- Foundry installed (forge, cast, anvil)
- Private key in contract/.env
- Testnet TCRO for gas
```

### Step 1: Test Contract (Optional but Recommended)
```bash
cd contract
forge test --match-contract MockRouterTest -vv
```

Expected output:
```
✅ All tests pass
✅ test_Deployment
✅ test_GetAmountsOut
✅ test_SwapExactTokensForTokens
✅ test_SwapExactETHForTokens
✅ test_RevertWhen_Expired
```

### Step 2: Deploy to Cronos Testnet
```bash
cd contract

# Deploy
forge script script/DeployMockRouter.s.sol:DeployMockRouter \
  --rpc-url $CRONOS_TESTNET_RPC \
  --broadcast \
  --verify \
  --etherscan-api-key $CRONOSCAN_API_KEY \
  -vvvv
```

### Step 3: Copy Deployed Address
After deployment, you'll see:
```
MockRouter deployed at: 0x...
Add this to backend/.env:
MOCK_ROUTER_ADDRESS=0x...
```

**Copy this address!**

### Step 4: Update Backend Configuration
```bash
cd ../backend

# Edit .env
nano .env
```

Add/update these lines:
```bash
EXECUTION_MODE=mock
MOCK_ROUTER_ADDRESS=0x... # <- Paste deployed address here
```

### Step 5: Test Integration
```bash
cd backend

# Test approved trade demo
npm run demo:trade:approved

# Test blocked trade demo  
npm run demo:trade:blocked
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Contract deployed successfully
- [ ] Address added to `backend/.env`
- [ ] `EXECUTION_MODE=mock` set
- [ ] Demo approved trade works
- [ ] Demo blocked trade works
- [ ] Transactions visible on explorer
- [ ] Events emitted correctly

---

## 🔍 Contract Details

### Key Functions

**getAmountsOut()**
- Returns expected swap output
- Uses deterministic mock prices

**swapExactTokensForTokens()**
- Mimics VVS swap interface
- Creates real transaction
- Emits `MockTradeExecuted` event
- Does NOT move tokens

**swapExactETHForTokens()**
- Native CRO swap variant
- Accepts value with transaction

### Events

**MockTradeExecuted**
```solidity
event MockTradeExecuted(
    address indexed agent,
    address indexed tokenIn,
    address indexed tokenOut,
    uint256 amountIn,
    uint256 expectedOut,
    uint256 actualOut,
    string executionMode,
    uint256 timestamp
);
```

---

## 📊 Mock Prices

Default prices set in deployment:
- WCRO → USDC.e: 1 WCRO = 0.08 USDC
- USDC.e → WCRO: 1 USDC = 12.5 WCRO

These can be adjusted via `setMockPrice()` if needed.

---

## 🎭 Demo Flow

### Approved Trade Demo
1. Agent requests 0.05 TCRO swap
2. Sentinel simulates: 0.05 < 1.0 limit → ✅ APPROVED
3. Sentinel records approval (real tx)
4. MockRouter executes swap (real tx)
5. Event emitted with tx hash
6. Demo complete

### Blocked Trade Demo
1. Agent requests 3 TCRO swap
2. Sentinel simulates: 3.0 > 1.0 limit → ❌ BLOCKED
3. NO transaction sent
4. Funds remain safe
5. Proves blockchain enforcement

---

## 🔄 Switching to VVS (Future)

When ready for mainnet with real VVS:

1. Ensure on Cronos Mainnet RPC
2. Update `.env`:
   ```bash
   EXECUTION_MODE=vvs
   VVS_ROUTER_ADDRESS=0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae
   ```
3. Run same demos - will use real VVS Router
4. Real tokens will be swapped

No code changes needed!

---

## 🐛 Troubleshooting

### Contract Not Deployed
```
Error: MOCK_ROUTER_ADDRESS not configured
```
**Solution:** Add deployed address to `backend/.env`

### Wrong Execution Mode
```
Error: Router not found
```
**Solution:** Ensure `EXECUTION_MODE=mock` in `.env`

### Transaction Fails
- Check Sentinel hasn't paused
- Verify daily limit not exceeded
- Confirm agent is authorized

---

## 📞 Support

If deployment issues occur:
1. Check contract/.env has correct PRIVATE_KEY
2. Verify testnet TCRO balance
3. Confirm RPC URL is accessible
4. Review deployment logs for errors

---

## 🎯 Next Steps After Deployment

1. ✅ Deploy MockRouter
2. ✅ Test both demos (approved + blocked)
3. ✅ Record tx hashes for presentation
4. ✅ Prepare video showing Sentinel blocking
5. ✅ Push to GitHub branch
6. ✅ Document for hackathon submission

---

**Deployment Target Branch:** `rudra-day5-execution-layer`

**Estimated Deployment Time:** 5-10 minutes

**Gas Cost:** ~0.5 TCRO
