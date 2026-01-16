#!/usr/bin/env python3
"""
Direct Trading Flow Test - Without LangChain
Tests Sentinel approval directly
"""
import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

print("\n" + "=" * 80)
print("🧪 DIRECT TRADING FLOW TEST")
print("=" * 80)

# Setup
w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
account = w3.eth.account.from_key(os.getenv("PRIVATE_KEY"))

sentinel_address = os.getenv("SENTINEL_CLAMP_ADDRESS")
router_address = os.getenv("MOCK_ROUTER_ADDRESS")
wcro_address = os.getenv("WCRO_ADDRESS")

print(f"\n📋 Configuration:")
print(f"   Agent: {account.address}")
print(f"   Sentinel: {sentinel_address}")
print(f"   Router: {router_address}")

# ABIs
sentinel_abi = [
    {
        "inputs": [
            {"name": "dapp", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "name": "simulateCheck",
        "outputs": [
            {"name": "approved", "type": "bool"},
            {"name": "reason", "type": "string"},
            {"name": "remainingLimit", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

wcro_abi = [
    {"inputs": [{"name": "owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}
]

# Contracts
sentinel = w3.eth.contract(
    address=Web3.to_checksum_address(sentinel_address),
    abi=sentinel_abi
)

wcro = w3.eth.contract(
    address=Web3.to_checksum_address(wcro_address),
    abi=wcro_abi
)

# Test 1: RPC Connection
print(f"\n1️⃣  RPC Connection")
try:
    block = w3.eth.block_number
    print(f"   ✅ Connected - Block: {block}")
except Exception as e:
    print(f"   ❌ Error: {e}")
    exit(1)

# Test 2: Check Balance
print(f"\n2️⃣  WCRO Balance")
try:
    balance = wcro.functions.balanceOf(account.address).call()
    balance_cro = float(w3.from_wei(balance, 'ether'))
    print(f"   Balance: {balance_cro:.4f} WCRO")
    
    if balance_cro >= 2:
        print(f"   ✅ Sufficient for 2 CRO trade")
    else:
        print(f"   ⚠️  Low balance (need 2+ CRO)")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 3: Test Sentinel Approval (CRITICAL)
print(f"\n3️⃣  Sentinel Approval Test")
test_amount = w3.to_wei(2, 'ether')  # 2 CRO

try:
    print(f"   Testing: 2 CRO swap via Router {router_address[:10]}...")
    
    # Call simulateCheck with BOTH parameters
    result = sentinel.functions.simulateCheck(
        Web3.to_checksum_address(router_address),  # dapp address
        test_amount  # amount
    ).call()
    
    approved = result[0]
    reason = result[1]
    remaining = float(w3.from_wei(result[2], 'ether'))
    
    print(f"\n   📊 Results:")
    print(f"      Approved: {approved}")
    print(f"      Reason: {reason}")
    print(f"      Remaining After: {remaining:.4f} CRO")
    
    if approved:
        print(f"\n   ✅ SENTINEL APPROVED!")
        print(f"   Trade will succeed when conditions met")
    else:
        print(f"\n   ❌ SENTINEL BLOCKED!")
        print(f"   Issue: {reason}")
        
except Exception as e:
    print(f"   ❌ Sentinel check failed: {e}")
    import traceback
    traceback.print_exc()

# Test 4: Complete Pre-Flight Check
print(f"\n4️⃣  Complete Pre-Flight Check")
print(f"   Simulating: BUY signal triggers 2 CRO trade")

all_checks_pass = True
errors = []

# Check 1: Sentinel
try:
    result = sentinel.functions.simulateCheck(
        Web3.to_checksum_address(router_address),
        test_amount
    ).call()
    
    if result[0]:  # approved
        print(f"   ✅ Sentinel: APPROVED")
    else:
        print(f"   ❌ Sentinel: BLOCKED ({result[1]})")
        all_checks_pass = False
        errors.append(f"Sentinel: {result[1]}")
except Exception as e:
    print(f"   ❌ Sentinel: ERROR ({e})")
    all_checks_pass = False
    errors.append(f"Sentinel error: {e}")

# Check 2: Balance
try:
    balance = wcro.functions.balanceOf(account.address).call()
    balance_cro = float(w3.from_wei(balance, 'ether'))
    
    if balance_cro >= 2.01:  # 2 CRO + gas
        print(f"   ✅ Balance: {balance_cro:.4f} CRO available")
    else:
        print(f"   ❌ Balance: Insufficient ({balance_cro:.4f} CRO)")
        all_checks_pass = False
        errors.append(f"Low balance: {balance_cro:.4f} CRO")
except Exception as e:
    print(f"   ❌ Balance: ERROR ({e})")
    all_checks_pass = False
    errors.append(f"Balance error: {e}")

# Check 3: Network
try:
    if w3.is_connected():
        print(f"   ✅ Network: Connected")
    else:
        print(f"   ❌ Network: Disconnected")
        all_checks_pass = False
        errors.append("Network disconnected")
except Exception as e:
    print(f"   ❌ Network: ERROR ({e})")
    all_checks_pass = False
    errors.append(f"Network error: {e}")

# Final Result
print(f"\n" + "=" * 80)
print(f"📊 FINAL RESULT")
print(f"=" * 80)

if all_checks_pass:
    print(f"\n✅ ✅ ✅ ALL SYSTEMS GO! ✅ ✅ ✅")
    print(f"\n🚀 Trading System Status: READY")
    print(f"\n   Next Steps:")
    print(f"   1. Start autonomous trader: python run_autonomous_trader.py")
    print(f"   2. Click 'Start Agent' in dashboard")
    print(f"   3. Wait for buy signal (strong_buy sentiment)")
    print(f"   4. Trade will execute automatically!")
    print(f"\n   ⚡ When buy signal triggers:")
    print(f"      → Sentinel will approve")
    print(f"      → 2 CRO will be swapped")
    print(f"      → Transaction will succeed")
    print(f"      → No payment blocked errors!")
else:
    print(f"\n❌ SYSTEM NOT READY - Issues Found:")
    for i, error in enumerate(errors, 1):
        print(f"   {i}. {error}")
    
    print(f"\n   🔧 Fix these issues and run test again")

print("")
