"""
VVS Finance Executor - Production-Ready DEX Integration
Compatible with VVS Finance on Cronos Mainnet

This executor can work with:
- VVS Finance (Cronos Mainnet): 0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae
- MockRouter (Cronos Testnet): 0x3796754AC5c3b1C866089cd686C84F625CE2e8a6

The same code works for both - just change the router address in .env
"""

import os
import time
from web3 import Web3
from typing import Dict, Tuple
from dotenv import load_dotenv

load_dotenv()


class VVSExecutor:
    """
    Production-ready executor for VVS Finance (Uniswap V2 compatible)
    Also works with MockRouter for testnet demos
    """
    
    # Uniswap V2 Router ABI (VVS Finance compatible)
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
            "outputs": [
                {"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}
            ],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
                {"internalType": "address[]", "name": "path", "type": "address[]"}
            ],
            "name": "getAmountsOut",
            "outputs": [
                {"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]
    
    # ERC20 Token ABI
    TOKEN_ABI = [
        {
            "constant": True,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
        },
        {
            "constant": False,
            "inputs": [
                {"name": "_spender", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        },
        {
            "constant": True,
            "inputs": [
                {"name": "_owner", "type": "address"},
                {"name": "_spender", "type": "address"}
            ],
            "name": "allowance",
            "outputs": [{"name": "", "type": "uint256"}],
            "type": "function"
        }
    ]
    
    def __init__(self):
        # Connect to blockchain
        self.rpc_url = os.getenv("RPC_URL", "https://evm-t3.cronos.org")
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        self.chain_id = int(os.getenv("CHAIN_ID", "338"))
        
        # Load wallet
        private_key = os.getenv("PRIVATE_KEY")
        if not private_key:
            raise ValueError("PRIVATE_KEY not found in .env")
        
        self.account = self.w3.eth.account.from_key(private_key)
        self.address = self.account.address
        
        # Router address (works for both VVS and MockRouter)
        self.router_address = os.getenv("MOCK_ROUTER_ADDRESS")
        if not self.router_address:
            raise ValueError("MOCK_ROUTER_ADDRESS not found in .env (use VVS or MockRouter)")
        
        self.router_address = Web3.to_checksum_address(self.router_address)
        self.router = self.w3.eth.contract(
            address=self.router_address,
            abi=self.ROUTER_ABI
        )
        
        # Token addresses
        self.wcro_address = Web3.to_checksum_address(os.getenv("WCRO_ADDRESS"))
        self.usdc_address = Web3.to_checksum_address(os.getenv("USDC_ADDRESS"))
        
        print(f"✅ VVSExecutor initialized")
        print(f"   Router: {self.router_address}")
        print(f"   Wallet: {self.address}")
        print(f"   Network: {self._get_network_name()}")
    
    def _get_network_name(self) -> str:
        """Get network name based on chain ID"""
        networks = {
            25: "Cronos Mainnet",
            338: "Cronos Testnet",
            1: "Ethereum Mainnet"
        }
        return networks.get(self.chain_id, f"Chain ID {self.chain_id}")
    
    def is_mainnet(self) -> bool:
        """Check if connected to mainnet"""
        return self.chain_id == 25
    
    def is_vvs_finance(self) -> bool:
        """Check if using real VVS Finance router"""
        vvs_mainnet = "0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae".lower()
        return self.router_address.lower() == vvs_mainnet
    
    def get_token_balance(self, token_address: str) -> float:
        """Get token balance for agent wallet"""
        try:
            token_address = Web3.to_checksum_address(token_address)
            token = self.w3.eth.contract(address=token_address, abi=self.TOKEN_ABI)
            balance_wei = token.functions.balanceOf(self.address).call()
            balance = self.w3.from_wei(balance_wei, 'ether')
            return float(balance)
        except Exception as e:
            print(f"   ⚠️  Balance check failed: {e}")
            return 0.0
    
    def check_and_approve_token(self, token_address: str, amount_wei: int) -> bool:
        """
        Check allowance and approve if needed
        Essential for VVS Finance (and any real DEX)
        """
        try:
            token_address = Web3.to_checksum_address(token_address)
            token = self.w3.eth.contract(address=token_address, abi=self.TOKEN_ABI)
            
            # Check current allowance
            allowance = token.functions.allowance(
                self.address,
                self.router_address
            ).call()
            
            if allowance >= amount_wei:
                print(f"   ✓ Token already approved (allowance: {self.w3.from_wei(allowance, 'ether')})")
                return True
            
            # Need approval
            print(f"   📝 Approving {self.w3.from_wei(amount_wei, 'ether')} tokens...")
            
            approve_tx = token.functions.approve(
                self.router_address,
                amount_wei
            ).build_transaction({
                'from': self.address,
                'nonce': self.w3.eth.get_transaction_count(self.address),
                'gas': 100000,
                'gasPrice': self.w3.eth.gas_price,
                'chainId': self.chain_id
            })
            
            # Sign and send
            signed_tx = self.w3.eth.account.sign_transaction(approve_tx, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            print(f"   ⏳ Waiting for approval tx: {tx_hash.hex()}")
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
            
            if receipt['status'] == 1:
                print(f"   ✅ Token approved!")
                return True
            else:
                print(f"   ❌ Approval failed")
                return False
                
        except Exception as e:
            print(f"   ❌ Approval error: {e}")
            return False
    
    def get_quote(self, token_in: str, token_out: str, amount_in: float) -> Tuple[float, str]:
        """
        Get swap quote from router
        Works for both VVS Finance and MockRouter
        """
        try:
            token_in = Web3.to_checksum_address(token_in)
            token_out = Web3.to_checksum_address(token_out)
            amount_in_wei = self.w3.to_wei(amount_in, 'ether')
            
            path = [token_in, token_out]
            amounts_out = self.router.functions.getAmountsOut(
                amount_in_wei,
                path
            ).call()
            
            amount_out = self.w3.from_wei(amounts_out[-1], 'ether')
            
            return float(amount_out), "success"
            
        except Exception as e:
            return 0.0, f"Quote failed: {str(e)[:100]}"
    
    def execute_swap(
        self,
        token_in: str,
        token_out: str,
        amount_in: float,
        slippage: float = 0.005  # 0.5% slippage tolerance
    ) -> Dict:
        """
        Execute swap on VVS Finance or MockRouter
        Handles approvals, slippage protection, and transaction submission
        """
        try:
            print(f"\n🔄 Executing Swap")
            print(f"   {'VVS Finance' if self.is_vvs_finance() else 'Mock DEX'} on {self._get_network_name()}")
            print(f"   Amount: {amount_in}")
            print(f"   Slippage: {slippage * 100}%")
            
            token_in = Web3.to_checksum_address(token_in)
            token_out = Web3.to_checksum_address(token_out)
            amount_in_wei = self.w3.to_wei(amount_in, 'ether')
            
            # Step 1: Check balance
            balance = self.get_token_balance(token_in)
            if balance < amount_in:
                return {
                    "success": False,
                    "error": f"Insufficient balance: {balance} < {amount_in}"
                }
            
            # Step 2: Get quote
            amount_out, quote_error = self.get_quote(token_in, token_out, amount_in)
            if amount_out == 0:
                return {
                    "success": False,
                    "error": quote_error
                }
            
            # Calculate minimum output with slippage
            amount_out_min = amount_out * (1 - slippage)
            amount_out_min_wei = self.w3.to_wei(amount_out_min, 'ether')
            
            print(f"   Expected out: {amount_out:.6f}")
            print(f"   Minimum out: {amount_out_min:.6f}")
            
            # Step 3: Approve token if needed
            if not self.check_and_approve_token(token_in, amount_in_wei):
                return {
                    "success": False,
                    "error": "Token approval failed"
                }
            
            # Step 4: Build swap transaction
            deadline = int(time.time()) + 1800  # 30 minutes
            path = [token_in, token_out]
            
            swap_tx = self.router.functions.swapExactTokensForTokens(
                amount_in_wei,
                amount_out_min_wei,
                path,
                self.address,
                deadline
            ).build_transaction({
                'from': self.address,
                'nonce': self.w3.eth.get_transaction_count(self.address),
                'gas': 300000,
                'gasPrice': self.w3.eth.gas_price,
                'chainId': self.chain_id
            })
            
            # Step 5: Sign and send
            print(f"   📤 Submitting swap transaction...")
            signed_tx = self.w3.eth.account.sign_transaction(swap_tx, self.account.key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            print(f"   ⏳ Waiting for confirmation: {tx_hash.hex()}")
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            if receipt['status'] == 1:
                gas_used = receipt['gasUsed']
                gas_cost = self.w3.from_wei(gas_used * swap_tx['gasPrice'], 'ether')
                
                return {
                    "success": True,
                    "tx_hash": tx_hash.hex(),
                    "amount_in": amount_in,
                    "amount_out": amount_out,
                    "amount_out_min": amount_out_min,
                    "gas_used": gas_used,
                    "gas_cost": float(gas_cost),
                    "network": self._get_network_name(),
                    "router": "VVS Finance" if self.is_vvs_finance() else "MockRouter"
                }
            else:
                return {
                    "success": False,
                    "error": "Transaction failed (reverted)"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


def main():
    """Test VVS executor"""
    print("🚀 VVS Finance Executor Test")
    print("=" * 60)
    
    executor = VVSExecutor()
    
    print(f"\n📊 Network Info:")
    print(f"   Mainnet: {executor.is_mainnet()}")
    print(f"   VVS Finance: {executor.is_vvs_finance()}")
    
    # Check balances
    print(f"\n💰 Token Balances:")
    wcro_balance = executor.get_token_balance(executor.wcro_address)
    usdc_balance = executor.get_token_balance(executor.usdc_address)
    print(f"   WCRO: {wcro_balance:.6f}")
    print(f"   USDC: {usdc_balance:.6f}")
    
    # Get quote
    print(f"\n💱 Swap Quote:")
    amount_out, error = executor.get_quote(executor.wcro_address, executor.usdc_address, 1.0)
    if error == "success":
        print(f"   1 WCRO = {amount_out:.6f} USDC")
    else:
        print(f"   Error: {error}")
    
    print("=" * 60)


if __name__ == "__main__":
    main()
