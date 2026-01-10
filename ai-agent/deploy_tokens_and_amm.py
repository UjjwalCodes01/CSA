#!/usr/bin/env python3
"""
Deploy TestToken and SimpleAMM using Web3.py
Handles nonces properly and deploys step-by-step
"""
import os
import json
import time
from web3 import Web3
from solcx import compile_source, install_solc
from dotenv import load_dotenv

load_dotenv()

# Setup
w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
private_key = os.getenv("PRIVATE_KEY")
account = w3.eth.account.from_key(private_key)

print("\n🚀 Deploying Test Tokens and Simple AMM")
print("=" * 80)
print(f"Deployer: {account.address}")
print(f"Balance: {w3.from_wei(w3.eth.get_balance(account.address), 'ether'):.2f} TCRO")
print(f"Chain ID: {w3.eth.chain_id}")
print("")

# Install Solidity compiler
print("📦 Installing Solidity compiler...")
install_solc('0.8.20')
print("✅ Compiler ready")
print("")

# Read contract source
test_token_source = '''
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TestToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(string memory _name, string memory _symbol, uint256 _initialSupply) {
        name = _name;
        symbol = _symbol;
        totalSupply = _initialSupply;
        balanceOf[msg.sender] = _initialSupply;
        emit Transfer(address(0), msg.sender, _initialSupply);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
}
'''

# Compile TestToken
print("🔨 Compiling TestToken...")
compiled_token = compile_source(test_token_source, output_values=['abi', 'bin'], solc_version='0.8.20')
token_interface = compiled_token['<stdin>:TestToken']
print("✅ TestToken compiled")
print("")

def deploy_contract(contract_interface, constructor_args, contract_name):
    """Deploy a contract with proper nonce management"""
    print(f"📤 Deploying {contract_name}...")
    
    # Get current nonce
    nonce = w3.eth.get_transaction_count(account.address)
    print(f"   Using nonce: {nonce}")
    
    # Build transaction
    contract = w3.eth.contract(abi=contract_interface['abi'], bytecode=contract_interface['bin'])
    
    # Estimate gas
    try:
        gas_estimate = contract.constructor(*constructor_args).estimate_gas({'from': account.address})
        gas_limit = int(gas_estimate * 1.2)  # Add 20% buffer
    except:
        gas_limit = 3000000  # Fallback
    
    print(f"   Gas limit: {gas_limit:,}")
    
    # Build transaction
    transaction = contract.constructor(*constructor_args).build_transaction({
        'from': account.address,
        'nonce': nonce,
        'gas': gas_limit,
        'gasPrice': w3.eth.gas_price,
        'chainId': w3.eth.chain_id
    })
    
    # Sign transaction
    signed_txn = account.sign_transaction(transaction)
    
    # Send transaction
    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
    print(f"   TX hash: {tx_hash.hex()}")
    
    # Wait for receipt
    print(f"   Waiting for confirmation...")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    
    if receipt['status'] == 1:
        print(f"   ✅ {contract_name} deployed at: {receipt['contractAddress']}")
        return receipt['contractAddress']
    else:
        print(f"   ❌ Deployment failed!")
        return None

try:
    # Deploy tCRO
    print("1️⃣  Deploying Test CRO (tCRO)")
    print("-" * 80)
    tcro_address = deploy_contract(
        token_interface,
        ["Test Cronos", "tCRO", 1000000 * 10**18],
        "tCRO"
    )
    if not tcro_address:
        raise Exception("tCRO deployment failed")
    print("")
    time.sleep(3)  # Wait for blockchain
    
    # Deploy tUSD
    print("2️⃣  Deploying Test USD (tUSD)")
    print("-" * 80)
    tusd_address = deploy_contract(
        token_interface,
        ["Test USD", "tUSD", 1000000 * 10**18],
        "tUSD"
    )
    if not tusd_address:
        raise Exception("tUSD deployment failed")
    print("")
    time.sleep(3)
    
    # Now compile and deploy SimpleAMM
    print("3️⃣  Deploying SimpleAMM")
    print("-" * 80)
    
    # Read SimpleAMM source
    with open("../contract/src/SimpleAMM.sol", "r") as f:
        amm_source = f.read()
    
    print("🔨 Compiling SimpleAMM...")
    compiled_amm = compile_source(amm_source, output_values=['abi', 'bin'], solc_version='0.8.20')
    amm_interface = compiled_amm['<stdin>:SimpleAMM']
    print("✅ SimpleAMM compiled")
    print("")
    
    amm_address = deploy_contract(
        amm_interface,
        [tcro_address, tusd_address],
        "SimpleAMM"
    )
    if not amm_address:
        raise Exception("SimpleAMM deployment failed")
    print("")
    
    # Summary
    print("=" * 80)
    print("🎉 ALL DEPLOYMENTS SUCCESSFUL!")
    print("=" * 80)
    print(f"tCRO address: {tcro_address}")
    print(f"tUSD address: {tusd_address}")
    print(f"SimpleAMM address: {amm_address}")
    print("")
    print("📝 Add to .env:")
    print(f"TEST_CRO_ADDRESS={tcro_address}")
    print(f"TEST_USD_ADDRESS={tusd_address}")
    print(f"SIMPLE_AMM_ADDRESS={amm_address}")
    print("")
    print("Next step: Fund the AMM pool with liquidity")
    print("")
    
except Exception as e:
    print(f"\n❌ Deployment failed: {e}")
    import traceback
    traceback.print_exc()
