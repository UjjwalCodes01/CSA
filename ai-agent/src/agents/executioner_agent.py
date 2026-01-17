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
    Execute a swap autonomously: Native CRO → WCRO (wrapping).
    This function DOES NOT ask for user confirmation - it executes immediately!
    
    For BUY trades: Wraps native CRO into WCRO token.
    For SELL trades: Use different function (unwrap WCRO to CRO).
    
    Args:
        amount_cro: Amount of CRO to swap (in CRO, not Wei)
        token_out: Output token symbol - must be 'WCRO' for wrapping
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
        
        # Only support CRO → WCRO wrapping for now
        if token_out.upper() != 'WCRO':
            return {
                "status": "error",
                "reason": f"Only WCRO wrapping supported. Got: {token_out}",
                "tx_hash": None
            }
        
        # Convert to Wei
        amount_wei = w3.to_wei(amount_cro, 'ether')
        
        # 1. CHECK SENTINEL APPROVAL (MANDATORY)
        wcro_address = Web3.to_checksum_address(os.getenv("WCRO_ADDRESS"))
        try:
            # simulateCheck requires (dapp_address, amount)
            sentinel_check = sentinel.functions.simulateCheck(
                wcro_address,    # WCRO contract is the "dapp"
                amount_wei       # amount to wrap
            ).call()
            
            # Parse response: (bool approved, string reason, uint256 remainingLimit)
            approved = sentinel_check[0]
            action = sentinel_check[1]
            
            if not approved:
                return {
                    "status": "rejected",
                    "reason": f"Sentinel blocked: {action}",
                    "tx_hash": None
                }
        except Exception as e:
            return {
                "status": "error",
                "reason": f"Sentinel check failed: {str(e)}",
                "tx_hash": None
            }
        
        # 2. CHECK NATIVE CRO BALANCE
        balance = w3.eth.get_balance(account.address)
        if balance < amount_wei:
            return {
                "status": "failed",
                "reason": f"Insufficient CRO balance: {w3.from_wei(balance, 'ether')} CRO available, need {amount_cro}",
                "tx_hash": None
            }
        
        # 3. WRAP CRO → WCRO (deposit function)
        wcro = w3.eth.contract(
            address=wcro_address,
            abi=[
                {
                    "inputs": [],
                    "name": "deposit",
                    "outputs": [],
                    "stateMutability": "payable",
                    "type": "function"
                }
            ]
        )
        
        print(f"🔄 Wrapping {amount_cro} CRO → WCRO...")
        wrap_tx = wcro.functions.deposit().build_transaction({
            'from': account.address,
            'value': amount_wei,
            'gas': 100000,
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(account.address),
        })
        
        signed_wrap = account.sign_transaction(wrap_tx)
        wrap_hash = w3.eth.send_raw_transaction(signed_wrap.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(wrap_hash)
        
        if receipt['status'] == 1:
            return {
                "status": "success",
                "reason": reason,
                "amount_in": amount_cro,
                "token_out": "WCRO",
                "tx_hash": wrap_hash.hex(),
                "gas_used": receipt['gasUsed'],
                "block": receipt['blockNumber'],
                "message": f"✅ Wrapped {amount_cro} CRO → WCRO"
            }
        else:
            return {
                "status": "failed",
                "reason": "Transaction reverted on blockchain",
                "tx_hash": wrap_hash.hex()
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
        
        # Check Sentinel approval (dapp = AMM router address)
        router_address = Web3.to_checksum_address(os.getenv("MOCK_ROUTER_ADDRESS"))
        try:
            sentinel_check = sentinel.functions.simulateCheck(
                router_address,  # dapp address (AMM router)
                amount_wei       # amount to swap
            ).call()
            
            # Parse response: (bool approved, string reason, uint256 remainingLimit)
            sentinel_ok = sentinel_check[0]
            action = sentinel_check[1]
            remaining_limit = float(w3.from_wei(sentinel_check[2], 'ether'))
        except Exception as e:
            sentinel_ok = False
            action = f"ERROR: {str(e)}"
            remaining_limit = 0
        
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
            "sentinel_remaining": remaining_limit,
            "balance_available": balance_cro,
            "gas_reserve": gas_reserve,
            "recommended_max": max(0, balance_cro - gas_reserve) if sentinel_ok else 0,
            "blocking_reason": None if can_execute else (
                f"Sentinel: {action}" if not sentinel_ok else "Insufficient balance"
            ),
            "message": f"✅ Feasible: {can_execute} | Sentinel: {action} | Remaining Limit: {remaining_limit:.4f} CRO | Balance: {balance_cro:.4f} CRO"
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
