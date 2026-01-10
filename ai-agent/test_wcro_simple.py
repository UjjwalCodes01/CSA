#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quick WCRO Integration Test - Simple version without emojis
"""
import os
import sys

# Fix encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from web3 import Web3
from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from balance_tracker import BalanceTracker
from execution.wcro_amm_executor import swap_wcro_to_tusd, get_wcro_pool_info

load_dotenv()

w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
account = w3.eth.account.from_key(os.getenv("PRIVATE_KEY"))

print("\n" + "=" * 80)
print("WCRO INTEGRATION TEST")
print("=" * 80)
print(f"Agent: {account.address}")
print("")

# Test 1: Check Balances
print("[1] Balance Tracker")
print("-" * 80)
tracker = BalanceTracker()
balances = tracker.get_all_balances()

tcro = balances.get('TCRO', {}).get('balance', 0)
wcro = balances.get('WCRO', {}).get('balance', 0)
tusd = balances.get('tUSD', {}).get('balance', 0)

print(f"TCRO: {tcro:.2f} (native gas)")
print(f"WCRO: {wcro:.2f} (ecosystem standard)")
print(f"tUSD: {tusd:.2f} (stablecoin)")

# Test 2: Pool Info
print("\n[2] WCRO/tUSD Pool")
print("-" * 80)
pool = get_wcro_pool_info()

if pool['success']:
    print(f"Reserve WCRO: {pool['reserve_wcro']:.2f}")
    print(f"Reserve tUSD: {pool['reserve_tusd']:.2f}")
    print(f"Price: ${pool['price']:.6f} per WCRO")
else:
    print(f"ERROR: {pool['error']}")

# Test 3: Real Swap
print("\n[3] WCRO → tUSD Swap Test")
print("-" * 80)

if wcro >= 1:
    print(f"Swapping 1 WCRO to tUSD...")
    result = swap_wcro_to_tusd(1.0, max_slippage=0.01)
    
    if result['success']:
        print(f"SUCCESS!")
        print(f"TX: {result['tx_hash']}")
        print(f"Amount In: {result['amount_in']} WCRO")
        print(f"Expected Out: {result['expected_out']:.4f} tUSD")
        print(f"Gas Used: {result['gas_used']:,}")
        
        # Check new balances
        new_balances = tracker.get_all_balances()
        new_wcro = new_balances.get('WCRO', {}).get('balance', 0)
        new_tusd = new_balances.get('tUSD', {}).get('balance', 0)
        
        print(f"\nBalance Changes:")
        print(f"WCRO: {wcro:.2f} -> {new_wcro:.2f} ({new_wcro - wcro:+.2f})")
        print(f"tUSD: {tusd:.2f} -> {new_tusd:.2f} ({new_tusd - tusd:+.4f})")
    else:
        print(f"FAILED: {result['error']}")
else:
    print(f"Insufficient WCRO (have {wcro:.2f}, need 1.00)")

print("\n" + "=" * 80)
print("TEST COMPLETE")
print("=" * 80 + "\n")
