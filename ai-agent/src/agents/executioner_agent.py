"""
Executioner Agent - Autonomous Swap Execution
Handles trade execution with Sentinel safety checks
"""
import os
from typing import Dict, Any
from web3 import Web3
from dotenv import load_dotenv
from langchain_core.tools import tool

load_dotenv()

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
        "inputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
        "name": "simulateCheck",
        "outputs": [
            {"internalType": "bool", "name": "approved", "type": "bool"},
            {"internalType": "string", "name": "action", "type": "string"}
        ],
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

if not w3.is_connected():
    print("❌ Warning: Cannot connect to RPC")

from eth_account import Account
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


@tool
def execute_swap_autonomous(
    amount_cro: float,
    token_out: str,
    min_output: float,
    reason: str
) -> Dict[str, Any]:
    """
    Execute a swap autonomously after Sentinel approval.
    This function DOES NOT ask for user confirmation - it executes immediately!
    
    Args:
        amount_cro: Amount of CRO to swap (in CRO, not Wei)
        token_out: Output token symbol (e.g., 'USDC')
        min_output: Minimum acceptable output (slippage protection)
        reason: Trading reason for audit log
        
    Returns:
        Dict with execution status and transaction hash
    """
    try:
        if not w3.is_connected():
            return {
                "status": "error",
                "reason": "Cannot connect to blockchain RPC",
                "tx_hash": None
            }
        
        # Convert to Wei
        amount_wei = w3.to_wei(amount_cro, 'ether')
        min_output_wei = w3.to_wei(min_output, 'ether')
        
        # 1. CHECK SENTINEL APPROVAL (MANDATORY)
        try:
            approved, action = sentinel.functions.simulateCheck(amount_wei).call()
            if not approved:
                return {
                    "status": "rejected",
                    "reason": f"Sentinel blocked: {amount_cro} CRO exceeds daily limit. Action: {action}",
                    "tx_hash": None
                }
        except Exception as e:
            return {
                "status": "error",
                "reason": f"Sentinel check failed: {str(e)}",
                "tx_hash": None
            }
        
        # 2. CHECK WALLET BALANCE
        wcro = w3.eth.contract(
            address=Web3.to_checksum_address(os.getenv("WCRO_ADDRESS")),
            abi=ERC20_ABI
        )
        balance = wcro.functions.balanceOf(account.address).call()
        if balance < amount_wei:
            return {
                "status": "failed",
                "reason": f"Insufficient balance: {w3.from_wei(balance, 'ether')} CRO available",
                "tx_hash": None
            }
        
        # 3. APPROVE ROUTER (if needed)
        allowance = wcro.functions.allowance(account.address, router.address).call()
        if allowance < amount_wei:
            print("📝 Approving router...")
            approve_tx = wcro.functions.approve(
                router.address,
                2**256 - 1  # Max approval
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
        
        # 4. EXECUTE SWAP
        token_addresses = {
            'USDC': os.getenv("USDC_ADDRESS"),
            'CRO': os.getenv("WCRO_ADDRESS"),
        }
        
        path = [
            Web3.to_checksum_address(os.getenv("WCRO_ADDRESS")),
            Web3.to_checksum_address(token_addresses.get(token_out, os.getenv("USDC_ADDRESS")))
        ]
        
        deadline = w3.eth.get_block('latest')['timestamp'] + 300  # 5 min deadline
        
        print(f"🔄 Executing swap: {amount_cro} CRO → {token_out}")
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
        
        return {
            "status": "executed",
            "reason": reason,
            "amount_in": amount_cro,
            "token_out": token_out,
            "tx_hash": swap_hash.hex(),
            "gas_used": receipt['gasUsed'],
            "block": receipt['blockNumber'],
            "message": f"✅ Swap executed: {amount_cro} CRO → {token_out}"
        }
        
    except Exception as e:
        return {
            "status": "error",
            "reason": f"Execution failed: {str(e)}",
            "tx_hash": None
        }


@tool
def check_execution_feasibility(amount_cro: float, token_out: str = "USDC") -> Dict[str, Any]:
    """
    Pre-flight check before autonomous execution.
    Validates Sentinel approval, balance, and gas.
    
    Args:
        amount_cro: Proposed swap amount
        token_out: Target token
        
    Returns:
        Dict with feasibility status and recommendations
    """
    try:
        if not w3.is_connected():
            return {
                "feasible": False,
                "error": "Cannot connect to blockchain RPC"
            }
        
        amount_wei = w3.to_wei(amount_cro, 'ether')
        
        # Check Sentinel
        try:
            sentinel_ok, action = sentinel.functions.simulateCheck(amount_wei).call()
        except:
            sentinel_ok = False
            action = "ERROR"
        
        # Check balance
        wcro = w3.eth.contract(
            address=Web3.to_checksum_address(os.getenv("WCRO_ADDRESS")),
            abi=ERC20_ABI
        )
        balance = wcro.functions.balanceOf(account.address).call()
        balance_cro = float(w3.from_wei(balance, 'ether'))
        
        # Check gas (estimate ~0.01 CRO for swap)
        gas_reserve = 0.01
        
        can_execute = sentinel_ok and balance_cro >= (amount_cro + gas_reserve)
        
        return {
            "feasible": can_execute,
            "sentinel_approved": sentinel_ok,
            "sentinel_action": action,
            "balance_available": balance_cro,
            "gas_reserve": gas_reserve,
            "recommended_max": max(0, balance_cro - gas_reserve) if sentinel_ok else 0,
            "blocking_reason": None if can_execute else (
                f"Sentinel: {action}" if not sentinel_ok else "Insufficient balance"
            ),
            "message": f"✅ Feasible: {can_execute} | Sentinel: {sentinel_ok} | Balance: {balance_cro:.4f} CRO"
        }
        
    except Exception as e:
        return {
            "feasible": False,
            "error": str(e)
        }


# Tool collection for executioner agent
EXECUTIONER_TOOLS = [
    execute_swap_autonomous,
    check_execution_feasibility,
]
