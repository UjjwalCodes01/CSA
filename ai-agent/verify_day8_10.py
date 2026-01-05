"""
Verification script for Day 8-10 components
Tests imports and basic functionality
"""
import sys
import os

print("=" * 60)
print("🔍 DAY 8-10 VERIFICATION")
print("=" * 60)
print()

# Test 1: Environment variables
print("1️⃣ Checking environment variables...")
from dotenv import load_dotenv
load_dotenv()

required_vars = [
    "GEMINI_API_KEY",
    "DEVELOPER_PLATFORM_API_KEY",
    "PRIVATE_KEY",
    "RPC_URL",
    "SENTINEL_CLAMP_ADDRESS",
    "MOCK_ROUTER_ADDRESS"
]

missing_vars = []
for var in required_vars:
    value = os.getenv(var)
    if value:
        print(f"  ✅ {var}: {value[:10]}...")
    else:
        print(f"  ❌ {var}: MISSING")
        missing_vars.append(var)

if missing_vars:
    print(f"\n❌ Missing {len(missing_vars)} required variables: {', '.join(missing_vars)}")
else:
    print("\n✅ All environment variables present!")

print()

# Test 2: Import market data agent
print("2️⃣ Testing market data agent imports...")
try:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
    from agents.market_data_agent import MARKET_DATA_TOOLS_PRO
    print(f"  ✅ Market data agent imported successfully")
    print(f"  ✅ {len(MARKET_DATA_TOOLS_PRO)} tools available:")
    for tool in MARKET_DATA_TOOLS_PRO:
        tool_name = getattr(tool, '__name__', getattr(tool, 'name', str(tool)))
        print(f"     - {tool_name}")
except Exception as e:
    print(f"  ❌ Failed to import market data agent: {e}")

print()

# Test 3: Import sentinel agent
print("3️⃣ Testing sentinel agent imports...")
try:
    from agents.sentinel_agent import SENTINEL_TOOLS
    print(f"  ✅ Sentinel agent imported successfully")
    print(f"  ✅ {len(SENTINEL_TOOLS)} tools available:")
    for tool in SENTINEL_TOOLS:
        tool_name = getattr(tool, '__name__', getattr(tool, 'name', str(tool)))
        print(f"     - {tool_name}")
except Exception as e:
    print(f"  ❌ Failed to import sentinel agent: {e}")

print()

# Test 4: Web3 connection
print("4️⃣ Testing blockchain connection...")
try:
    from web3 import Web3
    w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
    if w3.is_connected():
        block = w3.eth.block_number
        print(f"  ✅ Connected to Cronos Testnet")
        print(f"  ✅ Current block: {block}")
    else:
        print(f"  ❌ Cannot connect to RPC: {os.getenv('RPC_URL')}")
except Exception as e:
    print(f"  ❌ Blockchain connection failed: {e}")

print()

# Test 5: Exchange Client initialization
print("5️⃣ Testing Exchange Client...")
try:
    from crypto_com_developer_platform_client import Exchange, Client
    api_key = os.getenv('DEVELOPER_PLATFORM_API_KEY')
    if api_key:
        Client.init(api_key=api_key)
        print(f"  ✅ Exchange Client initialized")
        # Try to fetch CRO price
        ticker = Exchange.get_ticker_by_instrument('CRO_USDT')
        price = float(ticker['data']['lastPrice'])
        print(f"  ✅ Live data test: CRO price = ${price}")
    else:
        print(f"  ❌ DEVELOPER_PLATFORM_API_KEY not set")
except Exception as e:
    print(f"  ⚠️  Exchange Client warning: {e}")
    print(f"     (This is OK if API key is invalid, tools will still work)")

print()

# Test 6: Gemini AI
print("6️⃣ Testing Gemini AI configuration...")
try:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        print(f"  ✅ GEMINI_API_KEY present: {gemini_key[:10]}...")
    else:
        print(f"  ❌ GEMINI_API_KEY missing")
except Exception as e:
    print(f"  ❌ Gemini check failed: {e}")

print()
print("=" * 60)
print("📊 VERIFICATION SUMMARY")
print("=" * 60)
print()
print("If all checks passed ✅, you can run:")
print("  python src/main.py")
print()
print("Try these stress tests:")
print('  1. "How is the market today?" → Market Intelligence')
print('  2. "Swap 0.01 CRO for USDC" → Safe Execution')
print('  3. "Swap 5.0 CRO for USDC" → Safety Block')
print()
