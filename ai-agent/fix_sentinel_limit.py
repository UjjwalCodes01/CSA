"""
Quick Fix: Set Sentinel Daily Limit to 1000 CRO
Run this ONCE to enable trading
"""
import os
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

load_dotenv()

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
account = Account.from_key(os.getenv("PRIVATE_KEY"))

# Sentinel ABI
SENTINEL_ABI = [
    {
        "inputs": [{"internalType": "uint256", "name": "_newLimit", "type": "uint256"}],
        "name": "updateDailyLimit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "manualReset",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getStatus",
        "outputs": [
            {"internalType": "uint256", "name": "currentSpent", "type": "uint256"},
            {"internalType": "uint256", "name": "remaining", "type": "uint256"},
            {"internalType": "uint256", "name": "timeUntilReset", "type": "uint256"},
            {"internalType": "bool", "name": "isPaused", "type": "bool"},
            {"internalType": "uint256", "name": "txCount", "type": "uint256"},
            {"internalType": "uint256", "name": "x402TxCount", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "dailyLimit",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

sentinel = w3.eth.contract(
    address=Web3.to_checksum_address(os.getenv("SENTINEL_CLAMP_ADDRESS")),
    abi=SENTINEL_ABI
)

def main():
    print("\n" + "="*60)
    print("🛡️  FIXING SENTINEL DAILY LIMIT")
    print("="*60)
    
    # Check current status
    print("\n📊 Current Status:")
    try:
        current_spent, remaining, time_until_reset, is_paused, tx_count, x402_count = sentinel.functions.getStatus().call()
        daily_limit = sentinel.functions.dailyLimit().call()
        
        print(f"   Daily Limit: {w3.from_wei(daily_limit, 'ether')} TCRO")
        print(f"   Spent Today: {w3.from_wei(current_spent, 'ether')} TCRO")
        print(f"   Remaining: {w3.from_wei(remaining, 'ether')} TCRO")
        print(f"   Total Transactions: {tx_count}")
        print(f"   Is Paused: {is_paused}")
    except Exception as e:
        print(f"❌ Error reading status: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Set new limit automatically
    new_limit_tcro = 1000.0  # 1000 TCRO daily limit
    new_limit_wei = w3.to_wei(new_limit_tcro, 'ether')
    
    print(f"\n🔄 Setting daily limit to {new_limit_tcro} TCRO...")
    
    try:
        # Update daily limit
        tx = sentinel.functions.updateDailyLimit(new_limit_wei).build_transaction({
            'from': account.address,
            'gas': 150000,
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(account.address),
        })
        
        signed = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        print(f"⏳ Waiting for confirmation...")
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        print(f"\n✅ Daily limit updated!")
        print(f"   TX: {tx_hash.hex()}")
        
    except Exception as e:
        print(f"\n❌ Error updating limit: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Reset daily spent
    print(f"\n🔄 Resetting spent amount to 0...")
    
    try:
        tx = sentinel.functions.manualReset().build_transaction({
            'from': account.address,
            'gas': 150000,
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(account.address),
        })
        
        signed = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        print(f"⏳ Waiting for confirmation...")
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        print(f"\n✅ Spent amount reset!")
        print(f"   TX: {tx_hash.hex()}")
        
    except Exception as e:
        print(f"\n❌ Error resetting: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Verify new status
    print("\n" + "="*60)
    print("📊 New Status:")
    try:
        current_spent, remaining, time_until_reset, is_paused, tx_count, x402_count = sentinel.functions.getStatus().call()
        daily_limit = sentinel.functions.dailyLimit().call()
        
        print(f"   Daily Limit: {w3.from_wei(daily_limit, 'ether')} TCRO")
        print(f"   Spent Today: {w3.from_wei(current_spent, 'ether')} TCRO")
        print(f"   Remaining: {w3.from_wei(remaining, 'ether')} TCRO")
        print(f"   Total Transactions: {tx_count}")
        print("="*60)
        
        if daily_limit > 0:
            print("\n🎉 SUCCESS! Sentinel configured for ALL wallets:")
            print(f"   → Daily limit: {w3.from_wei(daily_limit, 'ether')} TCRO (applies to all users)")
            print(f"   → Remaining today: {w3.from_wei(remaining, 'ether')} TCRO")
            print("\n💡 NOTE: This is a GLOBAL limit shared by all wallets")
            print("   Manual trades bypass this limit (no restrictions)")
            print("   Automatic agent trades use this limit (protection)")
            print("\n   Refresh your dashboard to see the updated limit")
        else:
            print("\n⚠️  Warning: Limit is still 0, checking contract...")
            print("   This might be a contract issue - check if you're the owner")
            
    except Exception as e:
        print(f"❌ Error verifying status: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
