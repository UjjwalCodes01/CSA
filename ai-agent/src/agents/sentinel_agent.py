"""
Sentinel Agent - Custom Tools for SentinelClamp Integration
Wraps our smart contract safety checks with AI-accessible tools
"""
from crypto_com_agent_client import tool
from web3 import Web3
from typing import Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

# Load configuration
RPC_URL = os.getenv("RPC_URL", "https://evm-t3.cronos.org")
SENTINEL_ADDRESS = os.getenv("SENTINEL_CLAMP_ADDRESS")
MOCK_ROUTER_ADDRESS = os.getenv("MOCK_ROUTER_ADDRESS")

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(RPC_URL))

# RPC Connection Guard
if not w3.is_connected():
    print("❌ Critical Error: Could not connect to Cronos RPC. Check your .env and RPC_URL.")
    print(f"Attempted RPC: {RPC_URL}")

# SentinelClamp ABI (simplified - only functions we need)
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
            {"internalType": "uint256", "name": "remainingAfter", "type": "uint256"}
        ],
        "stateMutability": "view",
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


@tool
def check_sentinel_approval(amount_cro: float, dapp_address: str = None) -> Dict[str, Any]:
    """
    Check if Sentinel will approve a transaction BEFORE executing it.
    This is the KEY SAFETY FEATURE - prevents unsafe trades!
    
    Args:
        amount_cro (float): Amount of CRO to spend (e.g., 0.05)
        dapp_address (str, optional): DEX router address. Defaults to MockRouter.
    
    Returns:
        dict: Approval status with reason and remaining limit
        
    Example:
        check_sentinel_approval(0.05)
        Returns: {"approved": True, "reason": "Within limit", "remaining": 0.95}
    """
    try:
        if dapp_address is None:
            dapp_address = MOCK_ROUTER_ADDRESS
        
        # Convert CRO to Wei
        amount_wei = w3.to_wei(amount_cro, 'ether')
        
        # Create contract instance
        sentinel = w3.eth.contract(
            address=Web3.to_checksum_address(SENTINEL_ADDRESS),
            abi=SENTINEL_ABI
        )
        
        # Call simulateCheck (read-only, no gas cost)
        approved, reason, remaining_wei = sentinel.functions.simulateCheck(
            Web3.to_checksum_address(dapp_address),
            amount_wei
        ).call()
        
        remaining_cro = w3.from_wei(remaining_wei, 'ether')
        
        return {
            "approved": approved,
            "reason": reason,
            "amount_requested": amount_cro,
            "remaining_after": float(remaining_cro),
            "dapp": dapp_address,
            "action_required": "PROCEED" if approved else "HALT_AND_NOTIFY",
            "status": "✅ APPROVED" if approved else "❌ BLOCKED",
            "message": f"Sentinel Status: {reason}. Balance after trade: {remaining_cro} CRO."
        }
        
    except Exception as e:
        return {
            "approved": False,
            "reason": f"Error checking Sentinel: {str(e)}",
            "status": "❌ ERROR",
            "message": f"Failed to check Sentinel approval: {str(e)}"
        }


@tool
def get_sentinel_status() -> Dict[str, Any]:
    """
    Get current Sentinel status including daily limit and spending.
    
    Returns:
        dict: Current daily limit, spent amount, remaining, and transaction count
        
    Example:
        get_sentinel_status()
        Returns: {"daily_limit": 1.0, "spent": 0.05, "remaining": 0.95, "tx_count": 1}
    """
    try:
        sentinel = w3.eth.contract(
            address=Web3.to_checksum_address(SENTINEL_ADDRESS),
            abi=SENTINEL_ABI
        )
        
        daily_limit_wei, spent_wei, remaining_wei, tx_count = sentinel.functions.getStatus().call()
        
        daily_limit = w3.from_wei(daily_limit_wei, 'ether')
        spent = w3.from_wei(spent_wei, 'ether')
        remaining = w3.from_wei(remaining_wei, 'ether')
        
        return {
            "daily_limit": float(daily_limit),
            "daily_spent": float(spent),
            "remaining_today": float(remaining),
            "total_transactions": int(tx_count),
            "percentage_used": (float(spent) / float(daily_limit) * 100) if daily_limit > 0 else 0,
            "message": f"Daily limit: {daily_limit} CRO | Spent: {spent} CRO | Remaining: {remaining} CRO | Transactions: {tx_count}"
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "message": f"Failed to get Sentinel status: {str(e)}"
        }


@tool
def can_afford_swap(amount_cro: float) -> Dict[str, Any]:
    """
    Check if agent can afford a swap based on BOTH Sentinel limits AND wallet balance.
    Combines wallet balance check with Sentinel approval.
    
    Args:
        amount_cro (float): Amount of CRO for the swap
    
    Returns:
        dict: Affordability analysis with recommendations
    """
    # Get Sentinel status using invoke
    status = get_sentinel_status.invoke({})
    
    if "error" in status:
        return {
            "can_afford": False,
            "reason": "Failed to check Sentinel status",
            "recommendation": "Cannot verify safety limits"
        }
    
    remaining = status["remaining_today"]
    
    # Check actual wallet balance
    try:
        private_key = os.getenv("PRIVATE_KEY")
        if private_key:
            from eth_account import Account
            account = Account.from_key(private_key)
            wallet_balance_wei = w3.eth.get_balance(account.address)
            wallet_balance = float(w3.from_wei(wallet_balance_wei, 'ether'))
        else:
            wallet_balance = float('inf')  # Skip check if no private key
    except Exception as e:
        wallet_balance = float('inf')  # Skip check on error
    
    # Check Sentinel limit
    if amount_cro > remaining:
        return {
            "can_afford": False,
            "reason": f"Exceeds daily Sentinel limit by {amount_cro - remaining:.4f} CRO",
            "requested": amount_cro,
            "sentinel_available": remaining,
            "wallet_balance": wallet_balance if wallet_balance != float('inf') else "Unknown",
            "recommendation": f"Maximum safe amount (Sentinel): {remaining} CRO"
        }
    
    # Check wallet balance
    if wallet_balance != float('inf') and amount_cro > wallet_balance:
        return {
            "can_afford": False,
            "reason": f"Insufficient wallet balance. Need {amount_cro} CRO but only have {wallet_balance:.4f} CRO",
            "requested": amount_cro,
            "sentinel_available": remaining,
            "wallet_balance": wallet_balance,
            "recommendation": f"Maximum wallet amount: {wallet_balance:.4f} CRO"
        }
    
    # Both checks passed
    return {
        "can_afford": True,
        "reason": "Within daily limit AND sufficient wallet balance",
        "requested": amount_cro,
        "sentinel_available": remaining,
        "wallet_balance": wallet_balance if wallet_balance != float('inf') else "Unknown",
        "remaining_after": remaining - amount_cro,
        "recommendation": f"✅ Safe to proceed. Will have {remaining - amount_cro:.4f} CRO Sentinel limit remaining after swap."
        }


@tool
def recommend_safe_swap_amount() -> Dict[str, Any]:
    """
    Recommend a safe swap amount based on current Sentinel limits.
    Useful for suggesting amounts to users.
    
    Returns:
        dict: Recommended amounts (conservative, moderate, maximum)
    """
    status = get_sentinel_status.invoke({})
    
    if "error" in status:
        return {"error": "Cannot get recommendations", "reason": status["error"]}
    
    remaining = status["remaining_today"]
    
    return {
        "remaining_limit": remaining,
        "conservative": remaining * 0.25,  # Use 25% of remaining
        "moderate": remaining * 0.50,      # Use 50% of remaining
        "maximum": remaining * 0.95,       # Use 95% of remaining (leave buffer)
        "message": f"Based on {remaining} CRO remaining, safe amounts: Conservative={remaining*0.25:.4f}, Moderate={remaining*0.5:.4f}, Max={remaining*0.95:.4f}"
    }


# Export all Sentinel tools
SENTINEL_TOOLS = [
    check_sentinel_approval,
    get_sentinel_status,
    can_afford_swap,
    recommend_safe_swap_amount,
]
