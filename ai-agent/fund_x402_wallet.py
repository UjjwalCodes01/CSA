"""
Fund the x402 micropayment wallet from the main agent wallet
"""

import os
import sys
from web3 import Web3
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../backend/.env')

def fund_x402_wallet():
    """Transfer TCRO from main agent wallet to x402 wallet"""
    
    # Connect to Cronos testnet
    rpc_url = os.getenv('RPC_URL', 'https://evm-t3.cronos.org')
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    
    if not w3.is_connected():
        print("❌ Failed to connect to Cronos testnet")
        return False
    
    print("✅ Connected to Cronos Testnet")
    
    # Get wallet addresses
    agent_private_key = os.getenv('AGENT_PRIVATE_KEY')
    x402_wallet_address = os.getenv('AGENT_WALLET_ADDRESS')
    
    if not agent_private_key or not x402_wallet_address:
        print("❌ Missing wallet configuration in .env")
        return False
    
    # Create account from private key
    agent_account = w3.eth.account.from_key(agent_private_key)
    
    print(f"\n📊 Wallet Status:")
    print(f"   Main Agent:  {agent_account.address}")
    print(f"   X402 Wallet: {x402_wallet_address}")
    
    # Check balances
    agent_balance = w3.eth.get_balance(agent_account.address)
    x402_balance = w3.eth.get_balance(x402_wallet_address)
    
    print(f"\n💰 Current Balances:")
    print(f"   Main Agent:  {w3.from_wei(agent_balance, 'ether')} TCRO")
    print(f"   X402 Wallet: {w3.from_wei(x402_balance, 'ether')} TCRO")
    
    # Amount to send (0.1 TCRO for x402 micropayments)
    amount_to_send = w3.to_wei(0.1, 'ether')
    
    if agent_balance < amount_to_send + w3.to_wei(0.01, 'ether'):  # Keep 0.01 for gas
        print("\n❌ Insufficient balance in main agent wallet")
        print(f"   Need at least {w3.from_wei(amount_to_send + w3.to_wei(0.01, 'ether'), 'ether')} TCRO")
        return False
    
    # Confirm transfer
    print(f"\n💸 Preparing to transfer:")
    print(f"   Amount: {w3.from_wei(amount_to_send, 'ether')} TCRO")
    print(f"   From:   {agent_account.address}")
    print(f"   To:     {x402_wallet_address}")
    
    response = input("\n   Proceed with transfer? (yes/no): ")
    if response.lower() != 'yes':
        print("❌ Transfer cancelled")
        return False
    
    try:
        # Build transaction
        tx = {
            'from': agent_account.address,
            'to': x402_wallet_address,
            'value': amount_to_send,
            'gas': 21000,
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(agent_account.address),
            'chainId': 338  # Cronos testnet
        }
        
        # Sign transaction
        signed_tx = w3.eth.account.sign_transaction(tx, agent_private_key)
        
        # Send transaction
        print("\n📡 Sending transaction...")
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        print(f"   Transaction Hash: {tx_hash.hex()}")
        print(f"   Explorer: https://explorer.cronos.org/testnet/tx/{tx_hash.hex()}")
        
        # Wait for confirmation
        print("\n⏳ Waiting for confirmation...")
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] == 1:
            print("✅ Transfer successful!")
            
            # Check new balances
            new_agent_balance = w3.eth.get_balance(agent_account.address)
            new_x402_balance = w3.eth.get_balance(x402_wallet_address)
            
            print(f"\n💰 New Balances:")
            print(f"   Main Agent:  {w3.from_wei(new_agent_balance, 'ether')} TCRO")
            print(f"   X402 Wallet: {w3.from_wei(new_x402_balance, 'ether')} TCRO")
            
            print(f"\n✅ X402 wallet is now funded!")
            print(f"   This wallet has enough for ~{int(0.1 / 0.002)} x402 payments")
            return True
        else:
            print("❌ Transaction failed")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("X402 Wallet Funding Script")
    print("=" * 60)
    
    success = fund_x402_wallet()
    
    if success:
        print("\n🎉 Setup complete! You can now:")
        print("   1. Restart the backend: cd ../backend && npm start")
        print("   2. Test x402 payments: python test_x402_integration.py")
        print("   3. Run autonomous trader: python run_autonomous_trader.py")
        sys.exit(0)
    else:
        print("\n❌ Setup failed")
        sys.exit(1)
