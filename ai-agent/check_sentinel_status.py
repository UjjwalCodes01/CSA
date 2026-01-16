#!/usr/bin/env python3
"""
Check Sentinel Configuration Status
Diagnoses why trades are being blocked
"""
import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Setup
w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
account = w3.eth.account.from_key(os.getenv("PRIVATE_KEY"))

# Addresses
sentinel_address = os.getenv("SENTINEL_CLAMP_ADDRESS")
router_address = os.getenv("MOCK_ROUTER_ADDRESS")

print("\n🔍 Sentinel Configuration Diagnostic")
print("=" * 80)
print(f"Agent Address:    {account.address}")
print(f"Sentinel Address: {sentinel_address}")
print(f"Router Address:   {router_address}")
print("")

# Sentinel ABI
sentinel_abi = [
    {
        "inputs": [],
        "name": "dailyLimit",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "dailySpent",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "lastResetTime",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "dapp", "type": "address"}],
        "name": "whitelistedDapps",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
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
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
]

sentinel = w3.eth.contract(
    address=Web3.to_checksum_address(sentinel_address),
    abi=sentinel_abi
)

try:
    # 1. Check ownership
    owner = sentinel.functions.owner().call()
    is_owner = (owner.lower() == account.address.lower())
    print(f"1️⃣  Ownership Check:")
    print(f"   Contract Owner: {owner}")
    print(f"   Your Address:   {account.address}")
    print(f"   Status: {'✅ You are owner' if is_owner else '⚠️ You are NOT owner'}")
    print("")
    
    # 2. Check daily limit configuration
    daily_limit = sentinel.functions.dailyLimit().call()
    daily_spent = sentinel.functions.dailySpent().call()
    last_reset = sentinel.functions.lastResetTime().call()
    
    daily_limit_cro = float(w3.from_wei(daily_limit, 'ether'))
    daily_spent_cro = float(w3.from_wei(daily_spent, 'ether'))
    remaining_cro = daily_limit_cro - daily_spent_cro
    
    print(f"2️⃣  Daily Limit Configuration:")
    print(f"   Daily Limit:   {daily_limit_cro:.4f} CRO")
    print(f"   Already Spent: {daily_spent_cro:.4f} CRO")
    print(f"   Remaining:     {remaining_cro:.4f} CRO")
    print(f"   Last Reset:    {last_reset} (timestamp)")
    
    import time
    time_since_reset = int(time.time()) - last_reset
    hours_since_reset = time_since_reset / 3600
    print(f"   Hours Since Reset: {hours_since_reset:.2f} hours")
    
    if time_since_reset >= 86400:  # 24 hours
        print(f"   ⏰ Daily limit should reset on next transaction!")
    print("")
    
    # 3. Check if router is whitelisted
    is_whitelisted = sentinel.functions.whitelistedDapps(
        Web3.to_checksum_address(router_address)
    ).call()
    
    print(f"3️⃣  AMM Router Whitelist Status:")
    print(f"   Router: {router_address}")
    print(f"   Status: {'✅ Whitelisted' if is_whitelisted else '❌ NOT WHITELISTED'}")
    
    if not is_whitelisted:
        print(f"\n   🚨 PROBLEM FOUND: Router is not whitelisted!")
        print(f"   Run: python register_amm_with_sentinel.py")
    print("")
    
    # 4. Test simulateCheck for 2 CRO swap
    test_amount = w3.to_wei(2, 'ether')
    
    print(f"4️⃣  Simulating 2 CRO Swap:")
    try:
        approved, reason, remaining = sentinel.functions.simulateCheck(
            Web3.to_checksum_address(router_address),
            test_amount
        ).call()
        
        remaining_after = float(w3.from_wei(remaining, 'ether'))
        
        print(f"   Test Amount:   2.0 CRO")
        print(f"   Approved:      {'✅ YES' if approved else '❌ NO'}")
        print(f"   Reason:        {reason}")
        print(f"   Remaining After: {remaining_after:.4f} CRO")
        
        if not approved:
            print(f"\n   🚨 BLOCKING ISSUE: {reason}")
            
            if "not whitelisted" in reason.lower():
                print(f"   ⚡ FIX: Run 'python register_amm_with_sentinel.py'")
            elif "limit exceeded" in reason.lower():
                print(f"   ⚡ FIX: Wait for daily reset or reduce trade size")
                print(f"   ⚡ FIX: Or run 'python reset_sentinel.py' to reset manually")
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        print(f"   This usually means the contract doesn't support simulateCheck")
    
    print("")
    print("=" * 80)
    print("📊 DIAGNOSIS COMPLETE")
    print("")
    
    if not is_whitelisted:
        print("⚠️  ACTION REQUIRED:")
        print("   1. Run: python register_amm_with_sentinel.py")
        print("   2. Then restart your trading agent")
    elif remaining_cro <= 0:
        print("⚠️  ACTION REQUIRED:")
        print("   1. Daily limit exhausted")
        print("   2. Run: python reset_sentinel.py")
        print("   3. Or wait for automatic daily reset")
    else:
        print("✅ Sentinel is configured correctly!")
        print("   You can execute trades up to {:.4f} CRO".format(remaining_cro))
    
except Exception as e:
    print(f"\n❌ Error reading Sentinel contract:")
    print(f"   {str(e)}")
    print(f"\nPossible causes:")
    print(f"   1. Wrong contract address in .env")
    print(f"   2. Contract not deployed")
    print(f"   3. RPC connection issue")
