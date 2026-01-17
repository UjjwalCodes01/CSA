# User Wallet Trading Guide

## 🎉 What Changed

**ALL transactions now use YOUR connected MetaMask wallet!**

### Manual Trades (Dashboard Button)
✅ **REAL blockchain transactions**
- Click "Execute Trade" → MetaMask popup appears
- You sign the transaction with your wallet
- Amount deducts from YOUR pool (TCRO/WCRO balance)
- No more simulations!

### AI Autonomous Trades
⚠️ **Two Options:**

#### Option A: Current Setup (Agent's Wallet)
- AI agent uses its own wallet (0xa22D...E94)
- Autonomous trades execute without your approval
- You watch but don't sign transactions

#### Option B: User Approval Mode (NEW!)
- AI agent **proposes** transactions
- Dashboard shows notification: "AI wants to buy 0.5 WCRO"
- You approve → MetaMask popup → You sign
- You reject → Trade doesn't execute

## 🔧 How It Works Now

### Manual Trading Flow

```
1. You: Enter amount (e.g., 0.5 CRO)
2. You: Click "Execute Trade"
3. Frontend: Checks your TCRO balance
4. Frontend: Calls wrap/unwrap contract function
5. MetaMask: Shows transaction popup
6. You: Click "Confirm" and pay gas
7. Blockchain: Executes transaction
8. Your Balance: Updates immediately
9. Backend: Records transaction for history
```

### Contract Functions Used

**BUY (CRO → WCRO)**
```solidity
WCRO.deposit() payable
// Wraps native CRO into WCRO token
```

**SELL (WCRO → CRO)**
```solidity
WCRO.withdraw(amount)
// Unwraps WCRO back to native CRO
```

## 💰 Balance Changes

All transactions now affect YOUR wallet:

| Action | Your TCRO | Your WCRO | Gas Paid |
|--------|-----------|-----------|----------|
| Buy 0.5 WCRO | -0.5 | +0.5 | ~0.0001 CRO |
| Sell 0.3 WCRO | +0.3 | -0.3 | ~0.0001 CRO |

## 🤖 AI Agent Integration

### To Make AI Use YOUR Wallet:

The AI agent needs to be modified to **propose** instead of **execute**:

#### In `autonomous_trader.py`:

**Before (executes autonomously):**
```python
execute_swap_autonomous.invoke({
    "amount_cro": 0.1,
    "token_out": "WCRO",
    ...
})
```

**After (proposes for approval):**
```python
# Send proposal to backend
requests.post('http://localhost:3001/api/agent/propose-transaction', json={
    "type": "wrap",
    "amount": 0.1,
    "tokenIn": "CRO",
    "tokenOut": "WCRO",
    "reason": f"AI Decision: {decision_reason}",
    "decision": "BUY",
    "councilVotes": council_votes,
    "userAddress": USER_WALLET_ADDRESS  # From frontend via WebSocket
})
```

#### In Dashboard (Frontend):

Add WebSocket listener for proposals:
```typescript
useEffect(() => {
  if (wsMessage?.type === 'transaction_proposal') {
    const proposal = wsMessage.data;
    
    // Show notification
    toast.info(`AI wants to ${proposal.type} ${proposal.amount} ${proposal.tokenIn}`, {
      action: {
        label: 'Approve',
        onClick: () => approveAIProposal(proposal)
      }
    });
  }
}, [wsMessage]);

const approveAIProposal = async (proposal) => {
  // Execute transaction from user's wallet
  if (proposal.type === 'wrap') {
    wrapCRO.wrap(proposal.amount.toString());
  } else if (proposal.type === 'unwrap') {
    unwrapWCRO.unwrap(proposal.amount.toString());
  }
  
  // Notify backend
  await fetch(`${API_BASE}/agent/proposal-response`, {
    method: 'POST',
    body: JSON.stringify({
      proposalId: proposal.id,
      approved: true,
      txHash: wrapCRO.hash
    })
  });
};
```

## 🚀 Quick Start

### Test Manual Trading

1. **Connect MetaMask** to Cronos Testnet (Chain ID: 338)
2. **Get Test CRO** from faucet: https://cronos.org/faucet
3. **Open Dashboard**: http://localhost:3000
4. **Enter amount**: 0.1 CRO
5. **Click "Execute Trade"**
6. **Confirm in MetaMask**
7. **Watch your balance update**

### Check Your Balances

```bash
# TCRO (Native CRO)
# Check in MetaMask

# WCRO (Wrapped CRO)
# Dashboard shows: "WCRO Balance: X.XXX"
```

## 🔐 Security Notes

- ✅ You control all transactions
- ✅ You see every transaction in MetaMask
- ✅ You can reject any transaction
- ✅ Your private key never leaves MetaMask
- ✅ AI can only **propose**, not execute (with Option B)

## 📊 Current State

| Feature | Status | Uses User's Wallet |
|---------|--------|-------------------|
| Manual Trades | ✅ REAL | ✅ YES |
| AI Autonomous | ⚠️ Agent Wallet | ❌ NO (can be changed) |
| Balance Deduction | ✅ REAL | ✅ YES (manual trades) |
| Transaction Broadcast | ✅ Real | ✅ YES |
| Sentinel Approval | ✅ Working | ⚠️ Agent only |

## 🛠️ Next Steps

**To make AI use YOUR wallet:**

1. Modify `autonomous_trader.py` to send proposals instead of executing
2. Add proposal listener in dashboard WebSocket
3. Add approval UI (notification with Accept/Reject buttons)
4. Connect approval → contract execution
5. Remove agent's private key from autonomous trades

**Benefits:**
- ✅ Full control over AI trades
- ✅ No autonomous execution without approval
- ✅ All transactions from YOUR wallet
- ✅ AI acts as advisor, you decide

**Trade-off:**
- ⚠️ Requires user interaction (not fully autonomous)
- ⚠️ User must be online to approve trades

## 📝 Summary

**Current Implementation:**
- ✅ Manual trades: REAL, uses YOUR wallet
- ⚠️ AI trades: Uses agent's wallet (autonomous)

**Recommended Next Step:**
Implement proposal system so AI also uses YOUR wallet with your approval.
