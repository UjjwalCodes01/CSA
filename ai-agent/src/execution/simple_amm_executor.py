"""
SimpleAMM Integration Tools for Autonomous Agent
Real token swaps using deployed tCRO and tUSD
"""
import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Contract addresses
SIMPLE_AMM_ADDRESS = os.getenv("SIMPLE_AMM_ADDRESS")
TEST_CRO_ADDRESS = os.getenv("TEST_CRO_ADDRESS")
TEST_USD_ADDRESS = os.getenv("TEST_USD_ADDRESS")

# SimpleAMM ABI (minimal for swap function)
SIMPLE_AMM_ABI = [
    {
        "inputs": [
            {"name": "tokenIn", "type": "address"},
            {"name": "amountIn", "type": "uint256"},
            {"name": "minAmountOut", "type": "uint256"},
            {"name": "to", "type": "address"}
        ],
        "name": "swap",
        "outputs": [{"name": "amountOut", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "tokenIn", "type": "address"},
            {"name": "amountIn", "type": "uint256"}
        ],
        "name": "getAmountOut",
        "outputs": [{"name": "amountOut", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getReserves",
        "outputs": [
            {"name": "", "type": "uint256"},
            {"name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

# ERC20 ABI for approve
ERC20_ABI = [
    {
        "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]

def swap_on_simple_amm(
    w3: Web3,
    account,
    token_in: str,
    amount_in: int,
    min_amount_out: int,
    max_slippage: float = 0.01
) -> dict:
    """
    Execute swap on SimpleAMM
    
    Args:
        w3: Web3 instance
        account: Account object with address and private key
        token_in: Address of input token
        amount_in: Amount to swap (in wei)
        min_amount_out: Minimum output amount (in wei)
        max_slippage: Maximum slippage tolerance (default 1%)
    
    Returns:
        dict with transaction details
    """
    try:
        # Contracts
        amm = w3.eth.contract(
            address=Web3.to_checksum_address(SIMPLE_AMM_ADDRESS),
            abi=SIMPLE_AMM_ABI
        )
        token_in_contract = w3.eth.contract(
            address=Web3.to_checksum_address(token_in),
            abi=ERC20_ABI
        )
        
        # Check balance
        balance = token_in_contract.functions.balanceOf(account.address).call()
        if balance < amount_in:
            return {
                "success": False,
                "error": f"Insufficient balance. Have {balance / 1e18:.2f}, need {amount_in / 1e18:.2f}"
            }
        
        # Get quote
        expected_out = amm.functions.getAmountOut(token_in, amount_in).call()
        
        # Apply slippage
        min_out_with_slippage = int(expected_out * (1 - max_slippage))
        if min_amount_out < min_out_with_slippage:
            min_amount_out = min_out_with_slippage
        
        # Approve token
        print(f"   Approving {amount_in / 1e18:.2f} tokens...")
        nonce = w3.eth.get_transaction_count(account.address, 'pending')  # Use 'pending' to get latest nonce
        approve_tx = token_in_contract.functions.approve(
            SIMPLE_AMM_ADDRESS,
            amount_in
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 100000,
            'gasPrice': w3.eth.gas_price,
            'chainId': w3.eth.chain_id
        })
        
        signed_approve = account.sign_transaction(approve_tx)
        approve_hash = w3.eth.send_raw_transaction(signed_approve.raw_transaction)
        approve_receipt = w3.eth.wait_for_transaction_receipt(approve_hash, timeout=120)
        
        # Verify approval succeeded
        if approve_receipt['status'] != 1:
            return {
                "success": False,
                "error": "Approval transaction failed"
            }
        print(f"   ✅ Approved (nonce {nonce})")
        
        # Execute swap - get fresh nonce after approval confirmed
        print(f"   Executing swap...")
        nonce = w3.eth.get_transaction_count(account.address, 'pending')  # Fresh nonce after approval
        swap_tx = amm.functions.swap(
            token_in,
            amount_in,
            min_amount_out,
            account.address
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 300000,
            'gasPrice': w3.eth.gas_price,
            'chainId': w3.eth.chain_id
        })
        
        signed_swap = account.sign_transaction(swap_tx)
        swap_hash = w3.eth.send_raw_transaction(signed_swap.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(swap_hash, timeout=120)
        
        # Verify swap succeeded
        if receipt['status'] != 1:
            return {
                "success": False,
                "error": "Swap transaction failed"
            }
        
        print(f"   ✅ Swap completed (nonce {nonce})")
        
        return {
            "success": True,
            "tx_hash": swap_hash.hex(),
            "amount_in": amount_in / 1e18,
            "expected_out": expected_out / 1e18,
            "min_out": min_amount_out / 1e18,
            "gas_used": receipt['gasUsed']
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def get_pool_info(w3: Web3) -> dict:
    """Get current pool reserves and price"""
    try:
        amm = w3.eth.contract(
            address=Web3.to_checksum_address(SIMPLE_AMM_ADDRESS),
            abi=SIMPLE_AMM_ABI
        )
        
        reserves = amm.functions.getReserves().call()
        
        return {
            "reserve_tcro": reserves[0] / 1e18,
            "reserve_tusd": reserves[1] / 1e18,
            "price_usd_per_cro": reserves[1] / reserves[0] if reserves[0] > 0 else 0
        }
    except Exception as e:
        return {"error": str(e)}
