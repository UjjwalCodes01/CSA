# 📜 Smart Contracts - Solidity on Cronos

Secure smart contracts powering the CSA trading system with on-chain safety and micropayment verification.

---

## 📋 Deployed Contracts (Cronos Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| **SentinelClamp** | `0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff` | Daily spending limits |
| **WCRO** | `0x7D7c0E58a280e70B52c8299d9056e0394Fb65750` | Wrapped CRO token |
| **SimpleAMM** | `0x70a021E9A1C1A503A77e3279941793c017b06f46` | Token swap pool |
| **MockRouter** | `0x3796754AC5c3b1C866089cd686C84F625CE2e8a6` | Swap router (testnet) |

---

## 🏗️ Architecture

```
AI Agent → SentinelClamp (check limit)
         → WCRO (approve)
         → SimpleAMM (execute swap)
         
X402Protocol → verifyPayment(txHash)
```

---

## 🚀 Quick Start

### Prerequisites
- Foundry (forge, cast, anvil)
- Cronos testnet CRO

### Setup

```bash
cd contract
forge install
cp .env.example .env
# Edit .env with private key
forge build
```

### Run Tests

```bash
forge test
forge coverage  # Should be >95%
```

---

## 📁 Project Structure

```
contract/
├── src/
│   ├── SentinelClamp.sol          # Daily limits
│   ├── WCRO.sol                   # Wrapped token
│   ├── SimpleAMM.sol              # AMM pool
│   └── X402Protocol.sol           # Payments
├── script/                        # Deployment
├── test/                          # Unit tests
└── foundry.toml                   # Config
```

---

## 🛡️ SentinelClamp

**Daily Spending Limits**
```solidity
// Check if trade allowed
function checkAndApprove(address agent, uint256 amount)
    external returns (bool)

// Set limit (owner only)
function setDailyLimit(uint256 newLimit) external

// Emergency controls
function pause() external onlyOwner
function unpause() external onlyOwner
```

**Features:**
- ✅ Automatic 24-hour reset
- ✅ Whitelist system
- ✅ Emergency pause
- ✅ Immutable enforcement

---

## 💎 WCRO

**Wrapped CRO Token**
```solidity
function deposit() external payable      // Wrap CRO
function withdraw(uint256) external      // Unwrap
```

**Features:**
- ✅ ERC20 standard
- ✅ 1:1 CRO backing
- ✅ Gas optimized

---

## 💱 SimpleAMM

**Constant Product AMM**
```solidity
function swap(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut
) external returns (uint256)

function addLiquidity(uint256, uint256) external
function removeLiquidity(uint256) external
```

**Formula:** `x * y = k`  
**Fee:** 0.3% per swap

---

## 💳 X402Protocol

**Payment Verification**
```solidity
function verifyPayment(
    bytes32 txHash,
    address payer,
    string memory service
) external view returns (bool)
```

**Features:**
- ✅ On-chain verification
- ✅ Double-spend prevention
- ✅ Service pricing

---

## 🔨 Development

**Compile**
```bash
forge build
```

**Test**
```bash
forge test -vvv
forge coverage
```

**Deploy**
```bash
forge script script/DeploySentinelClamp.s.sol \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast
```

---

## 🔐 Security

- ✅ OpenZeppelin v5.1.0
- ✅ 95%+ test coverage
- ✅ Slither analysis passed
- ✅ Reentrancy guards
- ✅ Access controls

---

## 📊 Gas Costs

- checkAndApprove: ~45,000 gas
- deposit (WCRO): ~28,000 gas
- swap: ~65,000 gas
- Total trade: ~140,000 gas (~$0.03)

---

**Built with ❤️ using Foundry & OpenZeppelin**
