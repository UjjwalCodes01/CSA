"""
Reset Sentinel Clamp Configuration
Sets daily limit and resets spent amount
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
            {"internalType": "uint256", "name": "dailyLimit", "type": "uint256"},
            {"internalType": "uint256", "name": "dailySpent", "type": "uint256"},
            {"internalType": "uint256", "name": "remainingToday", "type": "uint256"},
            {"internalType": "uint256", "name": "totalTransactions", "type": "uint256"}
        ],
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
    print("🛡️  SENTINEL CLAMP CONFIGURATION")
    print("="*60)
    
    # Check current status
    print("\n📊 Current Status:")
    try:
        daily_limit, daily_spent, remaining, total_tx = sentinel.functions.getStatus().call()
        print(f"   Daily Limit: {w3.from_wei(daily_limit, 'ether')} TCRO")
        print(f"   Spent Today: {w3.from_wei(daily_spent, 'ether')} TCRO")
        print(f"   Remaining: {w3.from_wei(remaining, 'ether')} TCRO")
        print(f"   Total Transactions: {total_tx}")
    except Exception as e:
        print(f"❌ Error reading status: {e}")
        return
    
    # Get new limit from user
    print("\n" + "-"*60)
    new_limit = input("Enter new daily limit in TCRO (e.g., 1.0): ").strip()
    try:
        new_limit_float = float(new_limit)
        if new_limit_float <= 0:
            print("❌ Limit must be positive!")
            return
    except ValueError:
        print("❌ Invalid limit!")
        return
    
    # Confirm
    print("\n" + "-"*60)
    print("📋 Proposed Changes:")
    print(f"   New Daily Limit: {new_limit_float} TCRO")
    print(f"   Reset Spent: 0 TCRO")
    print("-"*60)
    
    confirm = input("\n⚠️  Apply these changes? (yes/no): ").strip().lower()
    if confirm != 'yes':
        print("❌ Cancelled")
        return
    
    # Update daily limit
    print("\n🔄 Updating daily limit...")
    try:
        new_limit_wei = w3.to_wei(new_limit_float, 'ether')
        
        tx = sentinel.functions.updateDailyLimit(new_limit_wei).build_transaction({
            'from': account.address,
            'gas': 100000,
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(account.address),
        })
        
        signed = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        print(f"✅ Daily limit updated!")
        print(f"   TX: {tx_hash.hex()}")
        
    except Exception as e:
        print(f"❌ Error updating limit: {e}")
        return
    
    # Reset daily spent
    print("\n🔄 Resetting daily spent...")
    try:
        tx = sentinel.functions.manualReset().build_transaction({
            'from': account.address,
            'gas': 100000,
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(account.address),
        })
        
        signed = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        print(f"✅ Daily spent reset!")
        print(f"   TX: {tx_hash.hex()}")
        
    except Exception as e:
        print(f"❌ Error resetting spent: {e}")
        return
    
    # Show new status
    print("\n" + "="*60)
    print("📊 Updated Status:")
    daily_limit, daily_spent, remaining, total_tx = sentinel.functions.getStatus().call()
    print(f"   Daily Limit: {w3.from_wei(daily_limit, 'ether')} TCRO")
    print(f"   Spent Today: {w3.from_wei(daily_spent, 'ether')} TCRO")
    print(f"   Remaining: {w3.from_wei(remaining, 'ether')} TCRO")
    print(f"   Total Transactions: {total_tx}")
    print("="*60)
    
    print("\n✅ Sentinel configuration updated successfully!")
    print("\n📝 Note: The Sentinel contract automatically resets daily spent")
    print("   every 24 hours. You can now execute trades up to the new limit.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Cancelled by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
