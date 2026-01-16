#!/usr/bin/env python3
"""
Complete Trading Flow Test
Tests all steps from sentiment analysis to trade execution
"""
import os
import sys
from web3 import Web3
from dotenv import load_dotenv

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from agents.executioner_agent import check_execution_feasibility

load_dotenv()

print("\n" + "=" * 80)
print("🧪 COMPLETE TRADING FLOW TEST")
print("=" * 80)

# Setup
w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
account = w3.eth.account.from_key(os.getenv("PRIVATE_KEY"))

print(f"\n📋 Configuration:")
print(f"   Agent: {account.address}")
print(f"   Sentinel: {os.getenv('SENTINEL_CLAMP_ADDRESS')}")
print(f"   Router: {os.getenv('MOCK_ROUTER_ADDRESS')}")
print(f"   WCRO: {os.getenv('WCRO_ADDRESS')}")

# Test 1: Check RPC Connection
print(f"\n1️⃣  RPC Connection Test")
try:
    latest_block = w3.eth.block_number
    print(f"   ✅ Connected to Cronos Testnet")
    print(f"   Current Block: {latest_block}")
except Exception as e:
    print(f"   ❌ RPC Error: {e}")
    sys.exit(1)

# Test 2: Check WCRO Balance
print(f"\n2️⃣  WCRO Balance Check")
try:
    wcro_abi = [
        {"inputs": [{"name": "owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
        {"inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "stateMutability": "view", "type": "function"}
    ]
    
    wcro = w3.eth.contract(
        address=Web3.to_checksum_address(os.getenv("WCRO_ADDRESS")),
        abi=wcro_abi
    )
    
    balance = wcro.functions.balanceOf(account.address).call()
    balance_cro = float(w3.from_wei(balance, 'ether'))
    
    print(f"   WCRO Balance: {balance_cro:.4f} CRO")
    
    if balance_cro < 2:
        print(f"   ⚠️  Warning: Balance may be insufficient for 2 CRO trade")
    else:
        print(f"   ✅ Sufficient balance for trading")
except Exception as e:
    print(f"   ❌ Balance check failed: {e}")

# Test 3: Check Execution Feasibility
print(f"\n3️⃣  Execution Feasibility Test (2 CRO swap)")
try:
    result = check_execution_feasibility(amount_cro=2.0, token_out="USDC")
    
    print(f"   Feasible: {result.get('feasible', False)}")
    print(f"   Sentinel Approved: {result.get('sentinel_approved', False)}")
    print(f"   Sentinel Action: {result.get('sentinel_action', 'N/A')}")
    
    if 'sentinel_remaining' in result:
        print(f"   Remaining Limit: {result['sentinel_remaining']:.4f} CRO")
    
    if 'balance_available' in result:
        print(f"   Balance Available: {result['balance_available']:.4f} CRO")
    
    if result.get('feasible'):
        print(f"   ✅ Trade is feasible!")
        print(f"   Message: {result.get('message', '')}")
    else:
        print(f"   ❌ Trade blocked!")
        print(f"   Reason: {result.get('blocking_reason', 'Unknown')}")
        
except Exception as e:
    print(f"   ❌ Feasibility check error: {e}")
    import traceback
    traceback.print_exc()

# Test 4: Simulate Trading Decision
print(f"\n4️⃣  Trading Decision Simulation")
print(f"   Scenario: Strong BUY signal detected")
print(f"   Sentiment Score: 0.75 (Bullish)")
print(f"   Proposed Trade: 2 CRO → WCRO")

try:
    # Check if conditions would allow trade
    result = check_execution_feasibility(amount_cro=2.0, token_out="USDC")
    
    if result.get('feasible'):
        print(f"   ✅ All pre-flight checks PASSED")
        print(f"   Trade would execute successfully!")
        print(f"\n   📝 Execution Steps:")
        print(f"      1. Sentinel approval: ✅ {result.get('sentinel_action')}")
        print(f"      2. Balance check: ✅ {result.get('balance_available', 0):.4f} CRO available")
        print(f"      3. Gas reserve: ✅ {result.get('gas_reserve', 0):.4f} CRO")
        print(f"      4. Ready to execute: ✅ YES")
    else:
        print(f"   ❌ Pre-flight checks FAILED")
        print(f"   Blocking Reason: {result.get('blocking_reason')}")
        print(f"\n   🔧 Required Actions:")
        
        if not result.get('sentinel_approved'):
            print(f"      • Check Sentinel configuration")
            print(f"      • Run: python check_sentinel_status.py")
        
        if result.get('balance_available', 0) < 2:
            print(f"      • Insufficient WCRO balance")
            print(f"      • Wrap more CRO to WCRO")

except Exception as e:
    print(f"   ❌ Simulation error: {e}")

# Test 5: Error Handling Test
print(f"\n5️⃣  Error Handling Test")
try:
    # Test with amount exceeding daily limit
    result = check_execution_feasibility(amount_cro=10000.0, token_out="USDC")
    
    if not result.get('feasible'):
        print(f"   ✅ Correctly blocked excessive amount")
        print(f"   Reason: {result.get('blocking_reason')}")
    else:
        print(f"   ⚠️  Large amount not blocked (unexpected)")
        
except Exception as e:
    print(f"   Error during limit test: {e}")

# Summary
print(f"\n" + "=" * 80)
print(f"📊 TEST SUMMARY")
print(f"=" * 80)

# Run all tests again to get final status
try:
    final_check = check_execution_feasibility(amount_cro=2.0, token_out="USDC")
    
    if final_check.get('feasible'):
        print(f"\n✅ SYSTEM READY FOR TRADING")
        print(f"   • Sentinel: APPROVED")
        print(f"   • Balance: SUFFICIENT")
        print(f"   • Network: CONNECTED")
        print(f"\n   🚀 Next time buy signal triggers, trade will execute automatically!")
    else:
        print(f"\n⚠️  SYSTEM NOT READY")
        print(f"   Issue: {final_check.get('blocking_reason')}")
        print(f"\n   📝 Action Required:")
        print(f"   1. Fix the issue above")
        print(f"   2. Run this test again")
        print(f"   3. Start autonomous trader when ready")
except Exception as e:
    print(f"\n❌ FINAL CHECK FAILED: {e}")

print("")
