# Day 5-7: VVS Finance Integration Roadmap

**Timeline:** January 3-5, 2026  
**Estimated Time:** 6-8 hours total  
**Status:** Ready to start  

---

## 🎯 End Goal

By end of Day 7, your system will:
1. ✅ Agent requests CRO → USDC swap on VVS DEX
2. ✅ SentinelClamp validates trade within daily limit
3. ✅ VVS Router executes swap on Cronos blockchain
4. ✅ Demo shows: "User wants $100 swap" → Agent trades safely → Shows receipt

**Proof of Milestone:**
```
Swap Request: 0.1 CRO → USDC
↓
SentinelClamp: ✅ Approved (within limit)
↓
VVS Router: ✅ Swap executed (Block XXXXX)
↓
Result: 0.0952 USDC received
```

---

## 📋 Day-by-Day Breakdown

### **Day 5: VVS Router Integration (2-3 hours)**

**Task 1: Understand VVS Finance**
- [ ] Read VVS Router ABI (already whitelisted on testnet)
- [ ] Understand swap function: `swapExactTokensForTokens()`
- [ ] Know token addresses:
  - WCRO: `0x5C7F8A570d578ED84E63fdFA7b5A2f628d2b4D2a`
  - USDC: `0xc21223249CA28397B4B6541dfFaECc539BfF0c59`
  - VVS Router: `0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae` (already whitelisted!)

**Task 2: Create VVS Trade Agent** (`src/agents/vvs-trader.js`)
```javascript
// Structure:
export class VVSTraderAgent {
  // Get swap quote (how much USDC for 0.1 CRO?)
  async getQuote(tokenIn, tokenOut, amountIn) { }
  
  // Execute swap via SentinelClamp
  async executeSwap(tokenIn, tokenOut, amountIn, minAmountOut) { }
  
  // Check token balances
  async getTokenBalance(token) { }
}
```

**Acceptance Criteria:**
- ✅ Agent can call VVS Router
- ✅ Agent can get swap quotes
- ✅ Agent can build swap transaction

---

### **Day 6: SentinelClamp + VVS Integration (2-3 hours)**

**Task 1: Update Executioner for DEX Routes**
- [ ] Add VVS Router support to `checkAndApprove()`
- [ ] VVS is already whitelisted ✅
- [ ] Ensure all DEX swaps go through Sentinel

**Task 2: Build Complete Swap Flow**
```javascript
// Flow:
1. requestSwap(amountIn, minAmountOut)
2. → getQuote() // Show user what they'll get
3. → checkAndApprove(VVS_ROUTER, amountIn) // Via Sentinel
4. → executeSwap() // If approved
5. → verifyReceipt() // Check blockchain
```

**Task 3: Create Swap Demo** (`src/test/demo-vvs-swap.js`)

**Acceptance Criteria:**
- ✅ Mock swap can execute
- ✅ Sentinel approval logs shown
- ✅ Receipt data returned

---

### **Day 7: Testing & Polish (1-2 hours)**

**Task 1: Write Tests**
- [ ] Test successful swap (within limit)
- [ ] Test blocked swap (exceeds limit)
- [ ] Test slippage protection
- [ ] Test insufficient balance

**Task 2: Integration Demo** (`npm run demo-swap`)
- [ ] Run mock service (x402 optional for this demo)
- [ ] Agent makes 3 test swaps:
  1. Small swap: 0.01 CRO → USDC (✅ approved)
  2. Medium swap: 0.04 CRO → USDC (✅ approved)
  3. Large swap: 0.5 CRO → USDC (❌ blocked, exceeds limit)
- [ ] Show SentinelClamp daily limit protection

**Task 3: Commit to GitHub**

**Acceptance Criteria:**
- ✅ All 3 tests pass
- ✅ Demo shows approval/blocking
- ✅ Code pushed to GitHub

---

## 📁 Files You'll Create

```
backend/
├── src/
│   ├── agents/
│   │   └── vvs-trader.js        ← NEW: VVS swap logic
│   ├── services/
│   │   └── mock-swap-service.js ← NEW: Mock VVS (optional)
│   ├── test/
│   │   ├── demo-vvs-swap.js     ← NEW: Full swap demo
│   │   └── test-vvs-integration.js ← NEW: Unit tests
│   └── abi/
│       ├── VVSRouter.js          ← NEW: Router ABI
│       └── ERC20.js              ← NEW: Token ABI
├── package.json (update)
└── README.md (update)
```

---

## 🔑 Key Contract Addresses (Cronos Testnet)

| Contract | Address | Status |
|----------|---------|--------|
| SentinelClamp | `0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff` | ✅ Deployed |
| VVS Router | `0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae` | ✅ Whitelisted |
| WCRO (wrapped CRO) | `0x5C7F8A570d578ED84E63fdFA7b5A2f628d2b4D2a` | ✅ Standard |
| USDC | `0xc21223249CA28397B4B6541dfFaECc539BfF0c59` | ✅ Standard |

---

## 💡 Implementation Tips

### **Tip 1: Use ethers.js Contract Interface**
```javascript
const vvsRouter = new ethers.Contract(
  VVS_ROUTER_ADDRESS,
  VVS_ROUTER_ABI,
  signer
);

// Get swap amount
const amountOut = await vvsRouter.getAmountsOut(
  ethers.parseEther('0.1'), // 0.1 CRO
  [WCRO, USDC]
);
```

### **Tip 2: Test on Cronos Explorer**
After each swap, check: https://explorer.cronos.org/testnet  
Filter by contract address to verify transaction

### **Tip 3: Handle Slippage**
```javascript
// Request 100 USDC, accept min 95 USDC (5% slippage)
const minAmountOut = (amountOut * 95n) / 100n;
```

### **Tip 4: Token Approvals**
Before swapping, must approve router to spend tokens:
```javascript
const token = new ethers.Contract(WCRO, ERC20_ABI, signer);
await token.approve(VVS_ROUTER, amount);
```

---

## ✅ Completion Checklist

### Day 5
- [ ] VVS Router ABI created
- [ ] VVSTraderAgent class implemented
- [ ] getQuote() function working
- [ ] Tested on testnet (at least via logs)

### Day 6
- [ ] ExecutionerAgent updated for DEX routes
- [ ] Full swap flow implemented
- [ ] SentinelClamp integration confirmed
- [ ] Demo script working

### Day 7
- [ ] Unit tests written (3+ tests)
- [ ] Integration demo running successfully
- [ ] All code committed to GitHub
- [ ] README updated with VVS info

---

## 📊 Success Metrics

By end of Day 7:
- **Code Quality:** 4+ test cases passing
- **Functionality:** Agent can execute swaps via Sentinel
- **Safety:** Daily limit enforced on swaps
- **Demo:** Shows "safe trade" and "blocked trade" scenarios
- **Documentation:** Commit message + README explains flow

---

## 🚀 Ready to Start Tomorrow?

**Yes, push your current work!** ✅ Done

**Prepare tonight:**
- Review VVS Finance docs: https://docs.vvs.finance/
- Look at Cronos testnet explorer examples
- Ensure you have the contract addresses saved

**First thing tomorrow morning:**
1. Create `src/agents/vvs-trader.js`
2. Implement `getQuote()` function
3. Test with mock data

---

## 💬 Questions Before Starting?

All set for Day 5-7? You have:
- ✅ Smart contract deployed
- ✅ x402 handshake working
- ✅ Git repository ready
- ✅ Daily limit safety mechanism
- ✅ Clear roadmap

**You're 2 days ahead of schedule!** 🚀
