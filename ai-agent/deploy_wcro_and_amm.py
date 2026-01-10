#!/usr/bin/env python3
"""
Deploy WCRO and new SimpleAMM with WCRO/tUSD pair
Then wrap CRO into WCRO and fund the pool
"""
import os
from web3 import Web3
from solcx import compile_source, install_solc, set_solc_version
from dotenv import load_dotenv

load_dotenv()

# Setup
w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
private_key = os.getenv("PRIVATE_KEY")
account = w3.eth.account.from_key(private_key)

print("\n🚀 Deploying WCRO and SimpleAMM with WCRO/tUSD pair")
print("=" * 80)
print(f"Deployer: {account.address}")
print(f"Network: Cronos Testnet (Chain ID: {w3.eth.chain_id})")
print(f"Balance: {w3.from_wei(w3.eth.get_balance(account.address), 'ether'):.2f} TCRO")
print("")

# Install and set Solidity version
print("📦 Setting up Solidity compiler...")
install_solc('0.8.20')
set_solc_version('0.8.20')

def deploy_contract(contract_source, contract_name, constructor_args=None):
    """Compile and deploy a contract"""
    print(f"\n📝 Compiling {contract_name}...")
    
    compiled = compile_source(
        contract_source,
        output_values=['abi', 'bin'],
        solc_version='0.8.20'
    )
    
    contract_id = f'<stdin>:{contract_name}'
    abi = compiled[contract_id]['abi']
    bytecode = compiled[contract_id]['bin']
    
    print(f"✅ Compiled {contract_name}")
    
    # Deploy
    print(f"📤 Deploying {contract_name}...")
    
    contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    nonce = w3.eth.get_transaction_count(account.address)
    
    if constructor_args:
        transaction = contract.constructor(*constructor_args).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 3000000,
            'gasPrice': w3.eth.gas_price,
            'chainId': w3.eth.chain_id
        })
    else:
        transaction = contract.constructor().build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 3000000,
            'gasPrice': w3.eth.gas_price,
            'chainId': w3.eth.chain_id
        })
    
    signed_tx = account.sign_transaction(transaction)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    
    print(f"   TX: {tx_hash.hex()}")
    print(f"   Waiting for confirmation...")
    
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    deployed_address = receipt['contractAddress']
    
    print(f"   ✅ {contract_name} deployed at: {deployed_address}")
    print(f"   Gas Used: {receipt['gasUsed']:,}")
    
    return deployed_address, abi

# Read contract sources
print("\n📖 Reading contract sources...")

with open('C:/Users/DELL/OneDrive/Desktop/CSA/contract/src/WCRO.sol', 'r') as f:
    wcro_source = f.read()

with open('C:/Users/DELL/OneDrive/Desktop/CSA/contract/src/SimpleAMM.sol', 'r') as f:
    amm_source = f.read()

# Deploy WCRO
wcro_address, wcro_abi = deploy_contract(wcro_source, 'WCRO')

# Use existing tUSD
tusd_address = os.getenv("TEST_USD_ADDRESS")
print(f"\n📋 Using existing tUSD: {tusd_address}")

# Deploy new SimpleAMM with WCRO/tUSD
amm_address, amm_abi = deploy_contract(
    amm_source, 
    'SimpleAMM',
    [wcro_address, tusd_address]
)

print("\n" + "=" * 80)
print("✅ DEPLOYMENT COMPLETE")
print("=" * 80)
print(f"\n📝 Contract Addresses:")
print(f"   WCRO:      {wcro_address}")
print(f"   tUSD:      {tusd_address}")
print(f"   SimpleAMM: {amm_address}")
print(f"\n💡 Next steps:")
print(f"   1. Update .env with WCRO_ADDRESS={wcro_address}")
print(f"   2. Update .env with WCRO_AMM_ADDRESS={amm_address}")
print(f"   3. Run wrap_and_fund_wcro_pool.py to wrap CRO and fund the pool")
print("=" * 80 + "\n")
