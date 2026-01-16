"""
Manual Trade Execution - CLI Tool
Execute a test trade to verify dashboard updates
"""
import os
import asyncio
from datetime import datetime
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

load_dotenv()

from backend_client import BackendClient
from src.services.x402_payment import get_x402_client

# Initialize x402 payment client
x402 = get_x402_client()

# Contract ABIs
ROUTER_ABI = [
    {
        "inputs": [
            {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
            {"internalType": "uint256", "name": "amountOutMin", "type": "uint256"},
            {"internalType": "address[]", "name": "path", "type": "address[]"},
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "uint256", "name": "deadline", "type": "uint256"}
        ],
        "name": "swapExactTokensForTokens",
        "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

SENTINEL_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "dapp", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "simulateCheck",
        "outputs": [
            {"internalType": "bool", "name": "approved", "type": "bool"},
            {"internalType": "string", "name": "reason", "type": "string"},
            {"internalType": "uint256", "name": "remainingLimit", "type": "uint256"}
        ],
        "stateMutability": "view",
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

ERC20_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "spender", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "owner", "type": "address"},
            {"internalType": "address", "name": "spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
account = Account.from_key(os.getenv("PRIVATE_KEY"))

# Contracts
sentinel = w3.eth.contract(
    address=Web3.to_checksum_address(os.getenv("SENTINEL_CLAMP_ADDRESS")),
    abi=SENTINEL_ABI
)
router = w3.eth.contract(
    address=Web3.to_checksum_address(os.getenv("MOCK_ROUTER_ADDRESS")),
    abi=ROUTER_ABI
)

def main():
    print("\n" + "="*60)
    print("🔄 MANUAL TRADE EXECUTION TOOL")
    print("="*60)
    
    # Initialize backend client
    backend = BackendClient()
    
    # Check backend connection
    print("\n📡 Checking backend connection...")
    if backend.ping():
        print("✅ Backend is online!")
    else:
        print("⚠️  Backend is offline - trade will execute but dashboard won't update")
        proceed = input("Continue anyway? (y/n): ")
        if proceed.lower() != 'y':
            print("Aborting...")
            return
    
    # Get user input
    print("\n" + "-"*60)
    print("Select trade type:")
    print("1. Buy WCRO (swap TCRO → WCRO)")
    print("2. Sell WCRO (swap WCRO → TCRO)")
    choice = input("Enter choice (1 or 2): ").strip()
    
    if choice == '1':
        token_in = "TCRO"
        token_out = "WCRO"
        direction = "buy"
    elif choice == '2':
        token_in = "WCRO"
        token_out = "TCRO"
        direction = "sell"
    else:
        print("❌ Invalid choice!")
        return
    
    # Get amount
    amount = input(f"\nEnter amount of {token_in} to swap: ").strip()
    try:
        amount_float = float(amount)
        if amount_float <= 0:
            print("❌ Amount must be positive!")
            return
    except ValueError:
        print("❌ Invalid amount!")
        return
    
    # Get slippage tolerance
    slippage = input("Enter slippage tolerance % (default 20): ").strip() or "20"
    try:
        slippage_float = float(slippage)
        min_output = amount_float * (1 - slippage_float / 100)
    except ValueError:
        print("❌ Invalid slippage!")
        return
    
    # Confirmation
    print("\n" + "-"*60)
    print("📋 TRADE SUMMARY:")
    print(f"   Direction: {direction.upper()}")
    print(f"   Amount In: {amount_float} {token_in}")
    print(f"   Min Output: {min_output:.4f} {token_out}")
    print(f"   Slippage: {slippage_float}%")
    print("-"*60)
    
    confirm = input("\n⚠️  Execute this trade? (yes/no): ").strip().lower()
    if confirm != 'yes':
        print("❌ Trade cancelled")
        return
    
    # Check Sentinel status first
    print("\n🛡️  Checking Sentinel status...")
    try:
        daily_limit = sentinel.functions.dailyLimit().call()
        current_spent, remaining, time_until_reset, is_paused, tx_count, x402_count = sentinel.functions.getStatus().call()
        
        daily_limit_cro = w3.from_wei(daily_limit, 'ether')
        current_spent_cro = w3.from_wei(current_spent, 'ether')
        remaining_cro = w3.from_wei(remaining, 'ether')
        
        print(f"   Daily Limit: {daily_limit_cro} TCRO")
        print(f"   Spent Today: {current_spent_cro} TCRO")
        print(f"   Remaining: {remaining_cro} TCRO")
        
        if remaining_cro < amount_float:
            print(f"\n⚠️  WARNING: Trade amount ({amount_float} TCRO) exceeds remaining limit!")
            print("   Trade may be blocked by Sentinel.")
            proceed = input("   Continue anyway? (y/n): ")
            if proceed.lower() != 'y':
                print("❌ Trade cancelled")
                return
    except Exception as e:
        print(f"⚠️  Could not check Sentinel: {e}")
        remaining_cro = 0
    
    # Execute trade
    print("\n🔄 Executing trade...")
    print("-"*60)
    
    # 💳 X402 Payment: Pay for trade execution service
    print("\n💳 Processing x402 payment for trade execution...")
    trade_payment = asyncio.run(x402.pay_for_trade_execution({
        'direction': direction,
        'amount': amount_float,
        'tokenIn': token_in,
        'tokenOut': token_out,
    }))
    
    if not x402.is_authorized(trade_payment):
        print(f"❌ X402 payment failed - trade execution not authorized")
        print(f"   Error: {trade_payment.get('error', 'Payment processing failed')}")
        return
    
    print(f"✅ X402 payment successful!")
    print(f"   Cost: {trade_payment.get('cost', 0)} CRO")
    print(f"   TX: {trade_payment.get('payment', {}).get('txHash', 'N/A')[:16]}...")
    
    try:
        # Convert to Wei
        amount_wei = w3.to_wei(amount_float, 'ether')
        min_output_wei = w3.to_wei(min_output, 'ether')
        
        # 1. CHECK SENTINEL
        router_address = Web3.to_checksum_address(os.getenv("MOCK_ROUTER_ADDRESS"))
        approved, reason, remaining_limit = sentinel.functions.simulateCheck(router_address, amount_wei).call()
        if not approved:
            print(f"🛡️  Trade Blocked by Sentinel: {reason}")
            return
        
        # 2. GET TOKEN CONTRACTS
        wcro = w3.eth.contract(
            address=Web3.to_checksum_address(os.getenv("WCRO_ADDRESS")),
            abi=ERC20_ABI
        )
        
        # 3. CHECK BALANCE
        balance = wcro.functions.balanceOf(account.address).call()
        if balance < amount_wei:
            print(f"❌ Insufficient balance: {w3.from_wei(balance, 'ether')} WCRO available")
            return
        
        # 4. APPROVE ROUTER (if needed)
        allowance = wcro.functions.allowance(account.address, router.address).call()
        if allowance < amount_wei:
            print("📝 Approving router...")
            approve_tx = wcro.functions.approve(
                router.address,
                2**256 - 1
            ).build_transaction({
                'from': account.address,
                'gas': 100000,
                'gasPrice': w3.eth.gas_price,
                'nonce': w3.eth.get_transaction_count(account.address),
            })
            signed = account.sign_transaction(approve_tx)
            tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
            w3.eth.wait_for_transaction_receipt(tx_hash)
            print("✅ Router approved")
        
        # 5. EXECUTE SWAP
        path = [
            Web3.to_checksum_address(os.getenv("WCRO_ADDRESS")),
            Web3.to_checksum_address(os.getenv("USDC_ADDRESS"))
        ]
        
        deadline = w3.eth.get_block('latest')['timestamp'] + 300
        
        print(f"🔄 Swapping {amount_float} WCRO → {token_out}...")
        swap_tx = router.functions.swapExactTokensForTokens(
            amount_wei,
            min_output_wei,
            path,
            account.address,
            deadline
        ).build_transaction({
            'from': account.address,
            'gas': 300000,
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(account.address),
        })
        
        signed_swap = account.sign_transaction(swap_tx)
        swap_hash = w3.eth.send_raw_transaction(signed_swap.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(swap_hash)
        
        print("\n" + "="*60)
        print("📊 EXECUTION RESULT:")
        print("="*60)
        print(f"✅ Trade Successful!")
        print(f"   Amount In: {amount_float} {token_in}")
        print(f"   Token Out: {token_out}")
        print(f"   TX Hash: {swap_hash.hex()}")
        print(f"   Gas Used: {receipt['gasUsed']}")
        print(f"   Block: {receipt['blockNumber']}")
        
        # Send updates to backend
        print("\n📡 Sending updates to backend...")
        
        reason = f"Manual test trade via CLI - {direction} {amount_float} {token_in}"
        market_data = f"Manual trade: {amount_float} {token_in} → {token_out}"
        
        # Send trade execution
        backend.send_trade(
            tx_hash=swap_hash.hex(),
            token_in=token_in,
            token_out=token_out,
            amount_in=amount_float,
            amount_out=min_output,
            direction=direction.upper()
        )
        
        backend.send_agent_decision(
            market_data=market_data,
            sentinel_status=f"Trade executed, {remaining_cro:.4f} TCRO remaining",
            decision=f"{direction.upper()}",
            reason=reason
        )
        
        backend.send_agent_status(
            status="executing",
            action=f"Executed manual {direction}",
            confidence=1.0
        )
        
        print("✅ Backend updated!")
        print("\n🎉 Check your dashboard - it should update within 30 seconds!")
        print(f"   Transaction: https://explorer.cronos.org/testnet3/tx/{swap_hash.hex()}")
        
    except Exception as e:
        print(f"\n❌ Error executing trade: {e}")
        import traceback
        traceback.print_exc()
    
    print("="*60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Cancelled by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
