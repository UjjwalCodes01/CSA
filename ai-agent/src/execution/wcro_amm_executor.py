"""
WCRO SimpleAMM Integration for Autonomous Agent
Real token swaps using WCRO/tUSD pair
"""
import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Contract addresses
WCRO_AMM_ADDRESS = os.getenv("WCRO_AMM_ADDRESS")
WCRO_ADDRESS = os.getenv("WCRO_ADDRESS")
TEST_USD_ADDRESS = os.getenv("TEST_USD_ADDRESS")

# SimpleAMM ABI
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
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getReserves",
        "outputs": [
            {"name": "reserveA", "type": "uint256"},
            {"name": "reserveB", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

# ERC20 ABI
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
        "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
]


def swap_wcro_to_tusd(amount_wcro: float, max_slippage: float = 0.01) -> dict:
    """
    Swap WCRO to tUSD on SimpleAMM
    
    Args:
        amount_wcro: Amount of WCRO to swap (in WCRO units, not wei)
        max_slippage: Maximum acceptable slippage (default 1%)
    
    Returns:
        dict with success, tx_hash, and other details
    """
    try:
        w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
        private_key = os.getenv("PRIVATE_KEY")
        account = w3.eth.account.from_key(private_key)
        
        # Convert to wei
        amount_in_wei = w3.to_wei(amount_wcro, 'ether')
        
        # Get contracts
        amm = w3.eth.contract(
            address=Web3.to_checksum_address(WCRO_AMM_ADDRESS),
            abi=SIMPLE_AMM_ABI
        )
        wcro = w3.eth.contract(
            address=Web3.to_checksum_address(WCRO_ADDRESS),
            abi=ERC20_ABI
        )
        
        # Get expected output
        expected_out = amm.functions.getAmountOut(
            Web3.to_checksum_address(WCRO_ADDRESS),
            amount_in_wei
        ).call()
        
        # Calculate minimum output with slippage
        min_out = int(expected_out * (1 - max_slippage))
        
        # Check and approve if needed
        allowance = wcro.functions.allowance(
            account.address,
            Web3.to_checksum_address(WCRO_AMM_ADDRESS)
        ).call()
        
        if allowance < amount_in_wei:
            print(f"   Approving {amount_wcro} WCRO...")
            nonce = w3.eth.get_transaction_count(account.address, 'pending')  # Use 'pending'
            approve_tx = wcro.functions.approve(
                Web3.to_checksum_address(WCRO_AMM_ADDRESS),
                amount_in_wei
            ).build_transaction({
                'from': account.address,
                'nonce': nonce,
                'gas': 100000,
                'gasPrice': w3.eth.gas_price,
                'chainId': w3.eth.chain_id
            })
            
            signed_tx = account.sign_transaction(approve_tx)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            approve_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            if approve_receipt['status'] != 1:
                return {
                    'success': False,
                    'error': 'Approval transaction failed'
                }
            print(f"   ✅ Approved (nonce {nonce})")
        
        # Execute swap - get fresh nonce
        print(f"   Executing swap...")
        nonce = w3.eth.get_transaction_count(account.address, 'pending')  # Fresh nonce
        
        swap_tx = amm.functions.swap(
            Web3.to_checksum_address(WCRO_ADDRESS),
            amount_in_wei,
            min_out,
            account.address
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 300000,
            'gasPrice': w3.eth.gas_price,
            'chainId': w3.eth.chain_id
        })
        
        signed_tx = account.sign_transaction(swap_tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] != 1:
            return {
                'success': False,
                'error': 'Swap transaction failed'
            }
        
        print(f"   ✅ Swap completed (nonce {nonce})")
        
        return {
            'success': True,
            'tx_hash': tx_hash.hex(),
            'amount_in': amount_wcro,
            'expected_out': w3.from_wei(expected_out, 'ether'),
            'min_out': w3.from_wei(min_out, 'ether'),
            'gas_used': receipt['gasUsed']
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def get_wcro_pool_info() -> dict:
    """Get WCRO/tUSD pool information"""
    try:
        w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
        
        amm = w3.eth.contract(
            address=Web3.to_checksum_address(WCRO_AMM_ADDRESS),
            abi=SIMPLE_AMM_ABI
        )
        
        reserves = amm.functions.getReserves().call()
        reserve_wcro = w3.from_wei(reserves[0], 'ether')
        reserve_tusd = w3.from_wei(reserves[1], 'ether')
        price = reserve_tusd / reserve_wcro if reserve_wcro > 0 else 0
        
        return {
            'success': True,
            'reserve_wcro': float(reserve_wcro),
            'reserve_tusd': float(reserve_tusd),
            'price': float(price)
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
