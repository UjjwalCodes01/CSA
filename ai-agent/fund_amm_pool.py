#!/usr/bin/env python3
"""
Fund SimpleAMM Pool with Liquidity
"""
import os
import time
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Setup
w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
private_key = os.getenv("PRIVATE_KEY")
account = w3.eth.account.from_key(private_key)

# Addresses from .env
tcro_address = Web3.to_checksum_address(os.getenv("TEST_CRO_ADDRESS"))
tusd_address = Web3.to_checksum_address(os.getenv("TEST_USD_ADDRESS"))
amm_address = Web3.to_checksum_address(os.getenv("SIMPLE_AMM_ADDRESS"))

print("\n💰 Funding SimpleAMM Pool")
print("=" * 80)
print(f"Deployer: {account.address}")
print(f"tCRO: {tcro_address}")
print(f"tUSD: {tusd_address}")
print(f"AMM: {amm_address}")
print("")

# ERC20 ABI
erc20_abi = [
    {"inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}], "name": "approve", "outputs": [{"name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}], "name": "transfer", "outputs": [{"name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function"}
]

# SimpleAMM ABI
amm_abi = [
    {"inputs": [{"name": "amountA", "type": "uint256"}, {"name": "amountB", "type": "uint256"}], "name": "addLiquidity", "outputs": [{"name": "liquidityMinted", "type": "uint256"}], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [], "name": "getReserves", "outputs": [{"name": "", "type": "uint256"}, {"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"name": "tokenIn", "type": "address"}, {"name": "amountIn", "type": "uint256"}], "name": "getAmountOut", "outputs": [{"name": "amountOut", "type": "uint256"}], "stateMutability": "view", "type": "function"}
]

# Create contract instances
tcro = w3.eth.contract(address=tcro_address, abi=erc20_abi)
tusd = w3.eth.contract(address=tusd_address, abi=erc20_abi)
amm = w3.eth.contract(address=amm_address, abi=amm_abi)

try:
    # Check balances
    print("1️⃣  Checking token balances...")
    tcro_balance = tcro.functions.balanceOf(account.address).call()
    tusd_balance = tusd.functions.balanceOf(account.address).call()
    print(f"   tCRO balance: {tcro_balance / 1e18:,.0f} tokens")
    print(f"   tUSD balance: {tusd_balance / 1e18:,.0f} tokens")
    print("")
    
    # Amounts to add (1000 tCRO and 80 tUSD = ~$0.08 per CRO)
    tcro_amount = 1000 * 10**18
    tusd_amount = 80 * 10**18
    
    print("2️⃣  Approving AMM to spend tokens...")
    
    # Approve tCRO
    nonce = w3.eth.get_transaction_count(account.address)
    approve_tcro = tcro.functions.approve(amm_address, tcro_amount).build_transaction({
        'from': account.address,
        'nonce': nonce,
        'gas': 100000,
        'gasPrice': w3.eth.gas_price,
        'chainId': w3.eth.chain_id
    })
    signed_approve_tcro = account.sign_transaction(approve_tcro)
    tx_hash = w3.eth.send_raw_transaction(signed_approve_tcro.raw_transaction)
    print(f"   Approving tCRO... TX: {tx_hash.hex()}")
    w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    print(f"   ✅ tCRO approved")
    time.sleep(3)
    
    # Approve tUSD
    nonce = w3.eth.get_transaction_count(account.address)
    approve_tusd = tusd.functions.approve(amm_address, tusd_amount).build_transaction({
        'from': account.address,
        'nonce': nonce,
        'gas': 100000,
        'gasPrice': w3.eth.gas_price,
        'chainId': w3.eth.chain_id
    })
    signed_approve_tusd = account.sign_transaction(approve_tusd)
    tx_hash = w3.eth.send_raw_transaction(signed_approve_tusd.raw_transaction)
    print(f"   Approving tUSD... TX: {tx_hash.hex()}")
    w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    print(f"   ✅ tUSD approved")
    print("")
    time.sleep(3)
    
    # Add liquidity
    print("3️⃣  Adding liquidity to pool...")
    print(f"   Adding {tcro_amount / 1e18:,.0f} tCRO")
    print(f"   Adding {tusd_amount / 1e18:,.0f} tUSD")
    
    nonce = w3.eth.get_transaction_count(account.address)
    add_liq = amm.functions.addLiquidity(tcro_amount, tusd_amount).build_transaction({
        'from': account.address,
        'nonce': nonce,
        'gas': 500000,
        'gasPrice': w3.eth.gas_price,
        'chainId': w3.eth.chain_id
    })
    signed_add_liq = account.sign_transaction(add_liq)
    tx_hash = w3.eth.send_raw_transaction(signed_add_liq.raw_transaction)
    print(f"   TX: {tx_hash.hex()}")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    print(f"   ✅ Liquidity added!")
    print("")
    time.sleep(3)
    
    # Check pool state
    print("4️⃣  Pool Status:")
    print("-" * 80)
    reserves = amm.functions.getReserves().call()
    print(f"   Reserve tCRO: {reserves[0] / 1e18:,.2f}")
    print(f"   Reserve tUSD: {reserves[1] / 1e18:,.2f}")
    print(f"   Price: ${reserves[1] / reserves[0]:.6f} per tCRO")
    print("")
    
    # Test swap quote
    print("5️⃣  Testing Swap Quotes:")
    print("-" * 80)
    swap_amount = 10 * 10**18  # 10 tCRO
    expected_out = amm.functions.getAmountOut(tcro_address, swap_amount).call()
    print(f"   10 tCRO → {expected_out / 1e18:.4f} tUSD (0.3% fee)")
    print("")
    
    # Transfer some tokens to agent for trading
    print("6️⃣  Transferring tokens to agent for trading...")
    agent_amount = 100 * 10**18
    
    nonce = w3.eth.get_transaction_count(account.address)
    transfer_tcro = tcro.functions.transfer(account.address, agent_amount).build_transaction({
        'from': account.address,
        'nonce': nonce,
        'gas': 100000,
        'gasPrice': w3.eth.gas_price,
        'chainId': w3.eth.chain_id
    })
    signed_transfer = account.sign_transaction(transfer_tcro)
    tx_hash = w3.eth.send_raw_transaction(signed_transfer.raw_transaction)
    w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    print(f"   ✅ Agent has {agent_amount / 1e18:,.0f} tCRO")
    time.sleep(3)
    
    nonce = w3.eth.get_transaction_count(account.address)
    transfer_tusd = tusd.functions.transfer(account.address, agent_amount).build_transaction({
        'from': account.address,
        'nonce': nonce,
        'gas': 100000,
        'gasPrice': w3.eth.gas_price,
        'chainId': w3.eth.chain_id
    })
    signed_transfer = account.sign_transaction(transfer_tusd)
    tx_hash = w3.eth.send_raw_transaction(signed_transfer.raw_transaction)
    w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    print(f"   ✅ Agent has {agent_amount / 1e18:,.0f} tUSD")
    print("")
    
    print("=" * 80)
    print("🎉 POOL FUNDED SUCCESSFULLY!")
    print("=" * 80)
    print("Pool has real liquidity and is ready for trading!")
    print("Your agent can now execute real swaps with actual token transfers.")
    print("")
    print("📊 Pool Stats:")
    print(f"   Liquidity: {reserves[0] / 1e18:,.0f} tCRO + {reserves[1] / 1e18:,.0f} tUSD")
    print(f"   Price: ${reserves[1] / reserves[0]:.6f} per tCRO")
    print(f"   Trading Fee: 0.3%")
    print("")
    print("🔄 Ready for autonomous trading!")
    print("")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
