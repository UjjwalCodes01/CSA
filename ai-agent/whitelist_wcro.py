#!/usr/bin/env python3
"""
Whitelist WCRO contract with SentinelClamp
This allows the AI agent to wrap CRO → WCRO within daily limits
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
wcro_address = os.getenv("WCRO_ADDRESS")

print("\n🔐 Whitelisting WCRO with SentinelClamp")
print("=" * 80)
print(f"Agent: {account.address}")
print(f"Sentinel: {sentinel_address}")
print(f"WCRO: {wcro_address}")
print("")

# Sentinel ABI
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
        Web3.to_checksum_address(wcro_address)
    ).call()
    
    print(f"📋 Current Status: {'✅ Whitelisted' if is_whitelisted else '❌ Not Whitelisted'}")
    
    if is_whitelisted:
        print(f"   WCRO is already whitelisted!")
        print(f"   AI agent can wrap CRO → WCRO within daily limits")
    else:
        # Whitelist WCRO
        print(f"\n📝 Whitelisting WCRO with Sentinel...")
        nonce = w3.eth.get_transaction_count(account.address)
        
        # Build transaction
        whitelist_tx = sentinel.functions.setDappWhitelist(
            Web3.to_checksum_address(wcro_address),
            True  # status = true to whitelist
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 100000,
            'gasPrice': w3.eth.gas_price,
            'chainId': w3.eth.chain_id
        })
        
        signed_tx = account.sign_transaction(whitelist_tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        print(f"   TX: {tx_hash.hex()}")
        print(f"   Waiting for confirmation...")
        
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] == 1:
            print(f"\n   ✅ WCRO whitelisted successfully!")
            print(f"   Gas Used: {receipt['gasUsed']:,}")
            
            # Verify
            is_whitelisted = sentinel.functions.whitelistedDapps(
                Web3.to_checksum_address(wcro_address)
            ).call()
            print(f"   Verified: {'✅ Whitelisted' if is_whitelisted else '❌ Failed'}")
            
            if is_whitelisted:
                print(f"\n🎉 Setup Complete!")
                print(f"   AI agent can now wrap CRO to WCRO")
                print(f"   Sentinel will enforce 1000 CRO daily limit")
        else:
            print(f"   ❌ Transaction failed!")
            
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
