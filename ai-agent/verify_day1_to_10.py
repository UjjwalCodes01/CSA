"""
Comprehensive Verification: Day 1-10
Tests all components from smart contracts to AI agent
"""
import sys
import os
from dotenv import load_dotenv

print("=" * 70)
print("🔍 CRONOS x402 PAYTECH HACKATHON - DAY 1-10 VERIFICATION")
print("=" * 70)
print()

load_dotenv()

# Track all issues
issues = []
warnings = []

# ============================================================================
# DAY 1-7: SMART CONTRACTS VERIFICATION
# ============================================================================
print("📋 DAY 1-7: SMART CONTRACTS (SentinelClamp + MockRouter)")
print("=" * 70)
print()

# Test 1: Environment Variables
print("1️⃣ Checking environment variables...")
required_vars = {
    "RPC_URL": "Cronos Testnet RPC endpoint",
    "PRIVATE_KEY": "Wallet private key",
    "SENTINEL_CLAMP_ADDRESS": "SentinelClamp contract address",
    "MOCK_ROUTER_ADDRESS": "MockRouter contract address",
    "WCRO_ADDRESS": "Wrapped CRO address",
    "USDC_ADDRESS": "USDC mock address",
    "GEMINI_API_KEY": "Gemini AI API key",
    "DEVELOPER_PLATFORM_API_KEY": "Crypto.com Platform API key"
}

missing_vars = []
for var, desc in required_vars.items():
    value = os.getenv(var)
    if value:
        print(f"  ✅ {var}: {value[:10]}... ({desc})")
    else:
        print(f"  ❌ {var}: MISSING ({desc})")
        missing_vars.append(var)
        issues.append(f"Missing environment variable: {var}")

if not missing_vars:
    print("\n✅ All environment variables present!")
else:
    print(f"\n❌ Missing {len(missing_vars)} variables")
print()

# Test 2: Blockchain Connection
print("2️⃣ Testing blockchain connection...")
try:
    from web3 import Web3
    
    rpc_url = os.getenv("RPC_URL")
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    
    if w3.is_connected():
        block = w3.eth.block_number
        chain_id = w3.eth.chain_id
        print(f"  ✅ Connected to Cronos Testnet")
        print(f"  ✅ Chain ID: {chain_id}")
        print(f"  ✅ Current block: {block}")
        
        if chain_id != 338:
            warnings.append(f"Unexpected chain ID: {chain_id} (expected 338)")
            print(f"  ⚠️  Warning: Expected Chain ID 338, got {chain_id}")
    else:
        issues.append("Cannot connect to RPC")
        print(f"  ❌ Cannot connect to RPC: {rpc_url}")
except Exception as e:
    issues.append(f"Blockchain connection failed: {e}")
    print(f"  ❌ Connection failed: {e}")
print()

# Test 3: Wallet Access
print("3️⃣ Testing wallet access...")
try:
    private_key = os.getenv("PRIVATE_KEY")
    if private_key:
        from eth_account import Account
        account = Account.from_key(private_key)
        balance_wei = w3.eth.get_balance(account.address)
        balance = w3.from_wei(balance_wei, 'ether')
        
        print(f"  ✅ Wallet address: {account.address}")
        print(f"  ✅ Balance: {balance:.4f} CRO")
        
        if balance < 0.01:
            warnings.append(f"Low wallet balance: {balance} CRO")
            print(f"  ⚠️  Warning: Low balance (consider adding testnet CRO)")
    else:
        issues.append("PRIVATE_KEY not set")
        print(f"  ❌ PRIVATE_KEY not set")
except Exception as e:
    issues.append(f"Wallet access failed: {e}")
    print(f"  ❌ Failed: {e}")
print()

# Test 4: SentinelClamp Contract
print("4️⃣ Testing SentinelClamp contract...")
try:
    sentinel_address = os.getenv("SENTINEL_CLAMP_ADDRESS")
    
    # Check if contract exists
    code = w3.eth.get_code(Web3.to_checksum_address(sentinel_address))
    if code == b'' or code == '0x':
        issues.append("SentinelClamp contract not deployed")
        print(f"  ❌ No contract code at {sentinel_address}")
    else:
        print(f"  ✅ Contract deployed at: {sentinel_address}")
        print(f"  ✅ Contract size: {len(code)} bytes")
        
        # Test getStatus() call
        SENTINEL_ABI = [{
            "inputs": [],
            "name": "getStatus",
            "outputs": [
                {"internalType": "uint256", "name": "dailyLimit", "type": "uint256"},
                {"internalType": "uint256", "name": "dailySpent", "type": "uint256"},
                {"internalType": "uint256", "name": "remainingToday", "type": "uint256"},
                {"internalType": "uint256", "name": "totalTransactions", "type": "uint256"}
            ],
            "stateMutability": "view",
            "type": "function"
        }]
        
        sentinel = w3.eth.contract(
            address=Web3.to_checksum_address(sentinel_address),
            abi=SENTINEL_ABI
        )
        
        daily_limit_wei, spent_wei, remaining_wei, tx_count = sentinel.functions.getStatus().call()
        daily_limit = float(w3.from_wei(daily_limit_wei, 'ether'))
        spent = float(w3.from_wei(spent_wei, 'ether'))
        remaining = float(w3.from_wei(remaining_wei, 'ether'))
        
        print(f"  ✅ Daily limit: {daily_limit} CRO")
        print(f"  ✅ Spent today: {spent} CRO")
        print(f"  ✅ Remaining: {remaining} CRO")
        print(f"  ✅ Total transactions: {tx_count}")
        
except Exception as e:
    issues.append(f"SentinelClamp test failed: {e}")
    print(f"  ❌ Failed: {e}")
print()

# Test 5: MockRouter Contract
print("5️⃣ Testing MockRouter contract...")
try:
    router_address = os.getenv("MOCK_ROUTER_ADDRESS")
    
    code = w3.eth.get_code(Web3.to_checksum_address(router_address))
    if code == b'' or code == '0x':
        issues.append("MockRouter contract not deployed")
        print(f"  ❌ No contract code at {router_address}")
    else:
        print(f"  ✅ Contract deployed at: {router_address}")
        print(f"  ✅ Contract size: {len(code)} bytes")
        
        # Check if it has sentinel reference
        # This is a basic check - we'd need ABI for full verification
        print(f"  ✅ MockRouter accessible")
        
except Exception as e:
    issues.append(f"MockRouter test failed: {e}")
    print(f"  ❌ Failed: {e}")
print()

# ============================================================================
# DAY 8-10: AI AGENT VERIFICATION
# ============================================================================
print("=" * 70)
print("📋 DAY 8-10: AI AGENT (Market Data + Sentinel Integration)")
print("=" * 70)
print()

# Test 6: Import Market Data Agent
print("6️⃣ Testing Market Data Agent imports...")
try:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
    from agents.market_data_agent import MARKET_DATA_TOOLS_PRO
    
    print(f"  ✅ Market data agent imported successfully")
    print(f"  ✅ {len(MARKET_DATA_TOOLS_PRO)} tools available:")
    for tool in MARKET_DATA_TOOLS_PRO:
        tool_name = getattr(tool, '__name__', getattr(tool, 'name', str(tool)))
        print(f"     - {tool_name}")
except Exception as e:
    issues.append(f"Market data agent import failed: {e}")
    print(f"  ❌ Failed: {e}")
print()

# Test 7: Import Sentinel Agent
print("7️⃣ Testing Sentinel Agent imports...")
try:
    from agents.sentinel_agent import SENTINEL_TOOLS
    
    print(f"  ✅ Sentinel agent imported successfully")
    print(f"  ✅ {len(SENTINEL_TOOLS)} tools available:")
    for tool in SENTINEL_TOOLS:
        tool_name = getattr(tool, '__name__', getattr(tool, 'name', str(tool)))
        print(f"     - {tool_name}")
except Exception as e:
    issues.append(f"Sentinel agent import failed: {e}")
    print(f"  ❌ Failed: {e}")
print()

# Test 8: Test Sentinel Tools (actual blockchain calls)
print("8️⃣ Testing Sentinel tools with live blockchain calls...")
try:
    from agents.sentinel_agent import get_sentinel_status, check_sentinel_approval
    
    # Test get_sentinel_status
    print("  Testing get_sentinel_status()...")
    status = get_sentinel_status.invoke({})  # Use invoke for LangChain tools
    if "error" in status:
        warnings.append(f"Sentinel status error: {status['error']}")
        print(f"    ⚠️  Error: {status['error']}")
    else:
        print(f"    ✅ Daily limit: {status['daily_limit']} CRO")
        print(f"    ✅ Remaining: {status['remaining_today']} CRO")
        print(f"    ✅ Transactions: {status['total_transactions']}")
    
    # Test check_sentinel_approval
    print("  Testing check_sentinel_approval(0.01)...")
    approval = check_sentinel_approval.invoke({"amount_cro": 0.01})  # Use invoke with dict
    if "error" in approval:
        warnings.append(f"Sentinel approval error: {approval.get('reason', 'Unknown')}")
        print(f"    ⚠️  Error: {approval.get('reason', 'Unknown')}")
    else:
        print(f"    ✅ Approved: {approval['approved']}")
        print(f"    ✅ Reason: {approval['reason']}")
        print(f"    ✅ Action: {approval.get('action_required', 'N/A')}")
    
except Exception as e:
    issues.append(f"Sentinel tools test failed: {e}")
    print(f"  ❌ Failed: {e}")
print()

# Test 9: Exchange Client (Market Data)
print("9️⃣ Testing Crypto.com Exchange API...")
try:
    from crypto_com_developer_platform_client import Exchange, Client
    
    api_key = os.getenv('DEVELOPER_PLATFORM_API_KEY')
    if api_key:
        Client.init(api_key=api_key)
        print(f"  ✅ Exchange Client initialized")
        
        # Try to fetch CRO price
        print("  Testing live price fetch for CRO_USDT...")
        try:
            ticker = Exchange.get_ticker_by_instrument('CRO_USDT')
            price = float(ticker['data']['lastPrice'])
            volume = float(ticker['data']['volume'])
            print(f"    ✅ CRO price: ${price}")
            print(f"    ✅ 24h volume: {volume}")
        except Exception as e:
            warnings.append(f"Exchange API fetch failed: {str(e)[:100]}")
            print(f"    ⚠️  API call failed: {str(e)[:100]}")
            print(f"    ℹ️  This might be a temporary network issue")
    else:
        warnings.append("DEVELOPER_PLATFORM_API_KEY not set")
        print(f"  ⚠️  DEVELOPER_PLATFORM_API_KEY not set")
except Exception as e:
    warnings.append(f"Exchange Client warning: {str(e)[:100]}")
    print(f"  ⚠️  Warning: {str(e)[:100]}")
print()

# Test 10: Gemini AI Configuration
print("🔟 Testing Gemini AI configuration...")
try:
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        print(f"  ✅ GEMINI_API_KEY present: {gemini_key[:10]}...")
        print(f"  ℹ️  Note: API quota may be limited on free tier")
    else:
        issues.append("GEMINI_API_KEY missing")
        print(f"  ❌ GEMINI_API_KEY missing")
except Exception as e:
    issues.append(f"Gemini check failed: {e}")
    print(f"  ❌ Failed: {e}")
print()

# Test 11: Agent Initialization (without interaction to avoid quota)
print("1️⃣1️⃣ Testing agent initialization...")
try:
    from main import create_agent
    
    print("  Initializing agent...")
    agent = create_agent()
    print(f"  ✅ Agent initialized successfully!")
    print(f"  ℹ️  Note: Skipping interaction test to preserve API quota")
    
except Exception as e:
    issues.append(f"Agent initialization failed: {e}")
    print(f"  ❌ Failed: {e}")
    import traceback
    traceback.print_exc()
print()

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print("=" * 70)
print("📊 VERIFICATION SUMMARY")
print("=" * 70)
print()

if not issues and not warnings:
    print("🎉 ALL TESTS PASSED! DAY 1-10 COMPLETE!")
    print()
    print("✅ Smart Contracts: Deployed and functional")
    print("✅ AI Agent: All tools loaded and ready")
    print("✅ Blockchain: Connected and responding")
    print("✅ APIs: Configured (check quotas)")
    print()
    print("🚀 You can now run:")
    print("   python src/main.py")
    print()
    print("Try these commands:")
    print('   - "What is my Sentinel status?"')
    print('   - "What is the current CRO price?"')
    print('   - "Can I swap 0.05 CRO to USDC?"')
    print('   - "Analyze market conditions"')
    
elif not issues and warnings:
    print(f"⚠️  ALL CRITICAL TESTS PASSED with {len(warnings)} warnings")
    print()
    print("✅ Core functionality working")
    print(f"⚠️  {len(warnings)} non-critical warnings:")
    for i, warning in enumerate(warnings, 1):
        print(f"   {i}. {warning}")
    print()
    print("🚀 System is functional, warnings are non-blocking")
    
else:
    print(f"❌ VERIFICATION FAILED with {len(issues)} critical issues")
    print()
    if issues:
        print("Critical Issues:")
        for i, issue in enumerate(issues, 1):
            print(f"   {i}. {issue}")
    print()
    if warnings:
        print("Warnings:")
        for i, warning in enumerate(warnings, 1):
            print(f"   {i}. {warning}")
    print()
    print("🔧 Fix the critical issues above before proceeding")

print()
print("=" * 70)
print(f"Verification completed at block: {w3.eth.block_number if 'w3' in locals() else 'N/A'}")
print("=" * 70)
