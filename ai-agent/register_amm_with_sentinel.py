#!/usr/bin/env python3
"""
Register SimpleAMM with SentinelClamp
This enables daily limit enforcement for autonomous trading
"""
import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Setup
w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
private_key = os.getenv("PRIVATE_KEY")
account = w3.eth.account.from_key(private_key)

# Addresses
sentinel_address = os.getenv("SENTINEL_CLAMP_ADDRESS")
amm_address = os.getenv("SIMPLE_AMM_ADDRESS")

print("\n🔐 Registering SimpleAMM with SentinelClamp")
print("=" * 80)
print(f"Agent: {account.address}")
print(f"Sentinel: {sentinel_address}")
print(f"SimpleAMM: {amm_address}")
print("")

# Sentinel ABI for whitelist function
sentinel_abi = [
    {
        "inputs": [
            {"name": "dapp", "type": "address"},
            {"name": "status", "type": "bool"}
        ],
        "name": "setDappWhitelist",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "dapp", "type": "address"}],
        "name": "whitelistedDapps",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
]

sentinel = w3.eth.contract(
    address=Web3.to_checksum_address(sentinel_address),
    abi=sentinel_abi
)

try:
    # Check current whitelist status
    is_whitelisted = sentinel.functions.whitelistedDapps(
        Web3.to_checksum_address(amm_address)
    ).call()
    
    print(f"📋 Current Status: {'✅ Whitelisted' if is_whitelisted else '❌ Not Whitelisted'}")
    
    if is_whitelisted:
        print(f"   SimpleAMM is already registered!")
        print(f"   Daily 1 TCRO limit is being enforced")
    else:
        # Register SimpleAMM as whitelisted dApp
        print(f"\n📝 Whitelisting SimpleAMM with Sentinel...")
        nonce = w3.eth.get_transaction_count(account.address)
        
        # Build registration transaction
        register_tx = sentinel.functions.setDappWhitelist(
            Web3.to_checksum_address(amm_address),
            True  # status = true to whitelist
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 100000,
            'gasPrice': w3.eth.gas_price,
            'chainId': w3.eth.chain_id
        })
        
        signed_tx = account.sign_transaction(register_tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        print(f"   TX: {tx_hash.hex()}")
        print(f"   Waiting for confirmation...")
        
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] == 1:
            print(f"   ✅ SimpleAMM whitelisted with Sentinel!")
            print(f"   Gas Used: {receipt['gasUsed']:,}")
            
            # Verify whitelisting
            is_whitelisted = sentinel.functions.whitelistedDapps(
                Web3.to_checksum_address(amm_address)
            ).call()
            print(f"   Verified: {'✅ Whitelisted' if is_whitelisted else '❌ Failed'}")
            
            if is_whitelisted:
                print(f"\n   🎉 All set! Daily 1 TCRO limit now enforced on SimpleAMM")
        else:
            print(f"   ❌ Whitelisting transaction failed")
        
except Exception as e:
    print(f"   ❌ Error: {e}")

print("\n" + "=" * 80 + "\n")
