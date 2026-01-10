#!/usr/bin/env python3
"""
Wrap CRO into WCRO and fund the SimpleAMM pool with WCRO/tUSD
"""
import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Setup
w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
private_key = os.getenv("PRIVATE_KEY")
account = w3.eth.account.from_key(private_key)

WCRO_ADDRESS = os.getenv("WCRO_ADDRESS")
TUSD_ADDRESS = os.getenv("TEST_USD_ADDRESS")
AMM_ADDRESS = os.getenv("WCRO_AMM_ADDRESS")

print("\n💰 Wrapping CRO and Funding WCRO/tUSD Pool")
print("=" * 80)
print(f"Account: {account.address}")
print(f"WCRO: {WCRO_ADDRESS}")
print(f"tUSD: {TUSD_ADDRESS}")
print(f"AMM: {AMM_ADDRESS}")
print("")

# ABIs
wcro_abi = [
    {"inputs": [], "name": "deposit", "outputs": [], "stateMutability": "payable", "type": "function"},
    {"inputs": [{"name": "guy", "type": "address"}, {"name": "wad", "type": "uint256"}], "name": "approve", "outputs": [{"name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"name": "", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}
]

erc20_abi = [
    {"inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}], "name": "approve", "outputs": [{"name": "", "type": "bool"}], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}
]

amm_abi = [
    {"inputs": [{"name": "amountA", "type": "uint256"}, {"name": "amountB", "type": "uint256"}], "name": "addLiquidity", "outputs": [{"name": "liquidity", "type": "uint256"}], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [], "name": "getReserves", "outputs": [{"name": "reserveA", "type": "uint256"}, {"name": "reserveB", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"name": "amountIn", "type": "uint256"}], "name": "getAmountOut", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}
]

# Contracts
wcro = w3.eth.contract(address=Web3.to_checksum_address(WCRO_ADDRESS), abi=wcro_abi)
tusd = w3.eth.contract(address=Web3.to_checksum_address(TUSD_ADDRESS), abi=erc20_abi)
amm = w3.eth.contract(address=Web3.to_checksum_address(AMM_ADDRESS), abi=amm_abi)

# Step 1: Wrap 120 CRO into WCRO (100 for pool, 20 for agent trading)
print("🔄 Step 1: Wrapping CRO into WCRO...")
wrap_amount = w3.to_wei(120, 'ether')
nonce = w3.eth.get_transaction_count(account.address)

deposit_tx = wcro.functions.deposit().build_transaction({
    'from': account.address,
    'value': wrap_amount,
    'nonce': nonce,
    'gas': 100000,
    'gasPrice': w3.eth.gas_price,
    'chainId': w3.eth.chain_id
})

signed_tx = account.sign_transaction(deposit_tx)
tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
print(f"   TX: {tx_hash.hex()}")
receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

if receipt['status'] == 1:
    wcro_balance = wcro.functions.balanceOf(account.address).call()
    print(f"   ✅ Wrapped {w3.from_wei(wrap_amount, 'ether')} CRO → WCRO")
    print(f"   WCRO Balance: {w3.from_wei(wcro_balance, 'ether')} WCRO")
else:
    print(f"   ❌ Wrap failed")
    exit(1)

# Step 2: Approve WCRO for AMM
print("\n🔐 Step 2: Approving WCRO for AMM...")
approve_amount = w3.to_wei(100, 'ether')
nonce = w3.eth.get_transaction_count(account.address)

approve_tx = wcro.functions.approve(
    Web3.to_checksum_address(AMM_ADDRESS),
    approve_amount
).build_transaction({
    'from': account.address,
    'nonce': nonce,
    'gas': 100000,
    'gasPrice': w3.eth.gas_price,
    'chainId': w3.eth.chain_id
})

signed_tx = account.sign_transaction(approve_tx)
tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
print(f"   TX: {tx_hash.hex()}")
receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
print(f"   ✅ Approved {w3.from_wei(approve_amount, 'ether')} WCRO")

# Step 3: Approve tUSD for AMM
print("\n🔐 Step 3: Approving tUSD for AMM...")
tusd_amount = w3.to_wei(80, 'ether')
nonce = w3.eth.get_transaction_count(account.address)

approve_tx = tusd.functions.approve(
    Web3.to_checksum_address(AMM_ADDRESS),
    tusd_amount
).build_transaction({
    'from': account.address,
    'nonce': nonce,
    'gas': 100000,
    'gasPrice': w3.eth.gas_price,
    'chainId': w3.eth.chain_id
})

signed_tx = account.sign_transaction(approve_tx)
tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
print(f"   TX: {tx_hash.hex()}")
receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
print(f"   ✅ Approved {w3.from_wei(tusd_amount, 'ether')} tUSD")

# Step 4: Add liquidity to pool
print("\n💧 Step 4: Adding liquidity to WCRO/tUSD pool...")
nonce = w3.eth.get_transaction_count(account.address)

add_liquidity_tx = amm.functions.addLiquidity(
    approve_amount,  # 100 WCRO
    tusd_amount      # 80 tUSD
).build_transaction({
    'from': account.address,
    'nonce': nonce,
    'gas': 500000,
    'gasPrice': w3.eth.gas_price,
    'chainId': w3.eth.chain_id
})

signed_tx = account.sign_transaction(add_liquidity_tx)
tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
print(f"   TX: {tx_hash.hex()}")
receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

if receipt['status'] == 1:
    print(f"   ✅ Liquidity added!")
    print(f"   Gas Used: {receipt['gasUsed']:,}")
else:
    print(f"   ❌ Add liquidity failed")
    exit(1)

# Step 5: Check pool state
print("\n📊 Pool Status:")
reserves = amm.functions.getReserves().call()
reserve_wcro = w3.from_wei(reserves[0], 'ether')
reserve_tusd = w3.from_wei(reserves[1], 'ether')
price = reserve_tusd / reserve_wcro if reserve_wcro > 0 else 0

print(f"   Reserve WCRO: {reserve_wcro:.2f}")
print(f"   Reserve tUSD: {reserve_tusd:.2f}")
print(f"   Price: ${price:.6f} per WCRO")

# Test quote
quote = amm.functions.getAmountOut(w3.to_wei(1, 'ether')).call()
print(f"\n   Example: 1 WCRO → {w3.from_wei(quote, 'ether'):.4f} tUSD (0.3% fee)")

# Final balances
print("\n💼 Agent Balances (for trading):")
wcro_balance = wcro.functions.balanceOf(account.address).call()
tusd_balance = tusd.functions.balanceOf(account.address).call()
tcro_balance = w3.eth.get_balance(account.address)

print(f"   TCRO: {w3.from_wei(tcro_balance, 'ether'):.2f} (native gas)")
print(f"   WCRO: {w3.from_wei(wcro_balance, 'ether'):.2f} (for swaps)")
print(f"   tUSD: {w3.from_wei(tusd_balance, 'ether'):.2f} (for swaps)")

print("\n" + "=" * 80)
print("✅ WCRO/tUSD Pool is ready for autonomous trading!")
print("=" * 80 + "\n")
