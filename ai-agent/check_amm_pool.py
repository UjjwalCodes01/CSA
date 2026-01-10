#!/usr/bin/env python3
"""
Check and Fund SimpleAMM Pool
"""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Setup
w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
private_key = os.getenv("PRIVATE_KEY")
account = w3.eth.account.from_key(private_key)

# Addresses
AMM_ADDRESS = "0x13354a475d641b227faBC3704EB27987Acf5A0f7"

print("\n🔍 Simple AMM Pool Status Check")
print("=" * 80)
print(f"AMM Address: {AMM_ADDRESS}")
print(f"Your Address: {account.address}")
print(f"TCRO Balance: {w3.from_wei(w3.eth.get_balance(account.address), 'ether')} TCRO")
print("")

# Simple AMM ABI
amm_abi = [
    {"inputs":[],"name":"getReserves","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"reserveA","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"reserveB","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"tokenA","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
    {"inputs":[],"name":"tokenB","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
]

amm = w3.eth.contract(address=Web3.to_checksum_address(AMM_ADDRESS), abi=amm_abi)

try:
    tokenA = amm.functions.tokenA().call()
    tokenB = amm.functions.tokenB().call()
    reserveA = amm.functions.reserveA().call()
    reserveB = amm.functions.reserveB().call()
    
    print("📊 Pool Configuration:")
    print(f"   Token A: {tokenA}")
    print(f"   Token B: {tokenB}")
    print(f"   Reserve A: {reserveA / 1e18} tokens")
    print(f"   Reserve B: {reserveB / 1e6} tokens")
    print("")
    
    if reserveA == 0 and reserveB == 0:
        print("⚠️  Pool is EMPTY - No liquidity added yet")
        print("")
        print("💡 Next Steps:")
        print("   1. You need test tokens (WCRO and USDC) on Cronos Testnet")
        print("   2. Get them from faucet: https://cronos.org/faucet")
        print("   3. Or we can create mock ERC20 tokens for testing")
        print("")
        print("🎯 Recommendation: Create simple test tokens for hackathon demo")
        print("   This allows you to have a REAL functioning AMM without needing")
        print("   external testnet tokens that may not exist.")
    else:
        print("✅ Pool has liquidity!")
        print(f"   You can now swap tokens using this AMM")
        
except Exception as e:
    print(f"❌ Error checking pool: {e}")
    print("")
    print("⚠️  The AMM contract was deployed but tokens don't exist on testnet")
    print("")
    print("💡 Solution: Deploy your own test ERC20 tokens")
    print("   Then fund the AMM pool with those tokens")

print("=" * 80)
