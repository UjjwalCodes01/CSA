"""
Test the PRO version tools with REAL API calls
"""
import sys
sys.path.append('src')

from agents.market_data_agent_pro import (
    get_cro_price,
    check_price_condition,
    get_market_summary,
    calculate_swap_value,
    analyze_market_conditions
)

print("=" * 70)
print("🚀 TESTING PRO VERSION TOOLS (REAL API CALLS)")
print("=" * 70)

# Test 1: Get CRO Price (REAL DATA)
print("\n📊 Test 1: Get CRO Price")
print("-" * 70)
result = get_cro_price()
if 'error' not in result:
    print(f"✅ Symbol: {result['symbol']}")
    print(f"✅ Price: ${result['price']:.4f}")
    print(f"✅ 24h Change: {result['change_24h_percent']:+.2f}%")
    print(f"✅ Volume: ${result['volume_24h']:,.0f}")
    print(f"✅ Status: {result['status']}")
else:
    print(f"❌ Error: {result['error']}")

# Test 2: Check Price Condition (REAL CHECK)
print("\n🔍 Test 2: Check if CRO < $0.15")
print("-" * 70)
result = check_price_condition('CRO_USDT', '<', 0.15)
if 'error' not in result:
    print(f"✅ Current Price: ${result['current_price']:.4f}")
    print(f"✅ Condition: {result['operator']} ${result['target_price']}")
    print(f"✅ Result: {result['result']}")
    print(f"✅ Status: {result['status']}")
else:
    print(f"❌ Error: {result['error']}")

# Test 3: Market Summary (REAL DATA)
print("\n📈 Test 3: Market Summary")
print("-" * 70)
result = get_market_summary()
if 'error' not in result:
    print(f"✅ Total Pairs: {result['pairs_count']}")
    print(f"✅ Total 24h Volume: ${result['total_volume_24h']:,.0f}")
    for pair, data in result['data'].items():
        if 'error' not in data:
            print(f"\n  {pair}:")
            print(f"    Price: ${data['price']:.4f}")
            print(f"    Change: {data['change_24h_percent']:+.2f}% {data['trend']}")
    print(f"\n✅ Status: {result['status']}")
else:
    print(f"❌ Error: {result['error']}")

# Test 4: Calculate Swap (REAL CALCULATION)
print("\n💱 Test 4: Calculate Swap (0.5 CRO → USDC)")
print("-" * 70)
result = calculate_swap_value(0.5, 'CRO', 'USDC')
if 'error' not in result:
    print(f"✅ Input: {result['input']}")
    print(f"✅ Estimated Output: ~{result['output_estimated']} USDC")
    print(f"✅ Perfect Output: {result['output_perfect']} USDC")
    print(f"✅ Slippage Cost: {result['slippage_cost']} USDC ({result['slippage_percent']}%)")
    print(f"✅ Calculation: {result['calculation']}")
    print(f"✅ Status: {result['status']}")
else:
    print(f"❌ Error: {result['error']}")

# Test 5: Market Analysis (REAL ANALYSIS)
print("\n🧠 Test 5: Market Conditions Analysis")
print("-" * 70)
result = analyze_market_conditions()
if 'error' not in result:
    print(f"✅ Trend: {result['trend'].upper()}")
    print(f"✅ Sentiment: {result['sentiment']}")
    print(f"✅ Confidence: {result['confidence'].upper()}")
    print(f"✅ Average Change: {result['average_change_24h']:+.2f}%")
    print(f"✅ Risk Level: {result['risk_level']}")
    print(f"✅ Recommendation: {result['recommendation']}")
    print(f"✅ Summary: {result['summary']}")
    print(f"✅ Status: {result['status']}")
else:
    print(f"❌ Error: {result['error']}")

print("\n" + "=" * 70)
print("✅ PRO VERSION TESTING COMPLETE!")
print("=" * 70)
print("\n💡 All tools now fetch REAL data from Crypto.com Exchange API!")
print("💡 No more instructions - actual execution!")
