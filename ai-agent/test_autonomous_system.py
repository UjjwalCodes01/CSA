"""
Quick Test Script - Autonomous Trading Agent
Tests all components without Apify API token (uses mock data)
"""

print("="*60)
print("🧪 AUTONOMOUS TRADING AGENT - QUICK TEST")
print("="*60)

# Test 1: Twitter Monitor
print("\n1️⃣ Testing Twitter Sentiment Monitor...")
try:
    from src.monitoring.twitter_monitor import monitor
    signal = monitor.run_monitoring_cycle()
    print(f"✅ Monitor working: Signal = {signal['signal']}, Sentiment = {signal['avg_sentiment']}")
except Exception as e:
    print(f"❌ Monitor test failed: {e}")

# Test 2: Executioner Tools
print("\n2️⃣ Testing Executioner Agent...")
try:
    from src.agents.executioner_agent import check_execution_feasibility
    result = check_execution_feasibility.invoke({"amount_cro": 0.01, "token_out": "USDC"})
    print(f"✅ Executioner working: Feasible = {result.get('feasible')}, Sentinel = {result.get('sentinel_approved')}")
except Exception as e:
    print(f"❌ Executioner test failed: {e}")

# Test 3: Autonomous Decision
print("\n3️⃣ Testing Autonomous Trader (Single Decision)...")
try:
    from src.autonomous_trader import test_autonomous_decision
    decision = test_autonomous_decision()
    print(f"✅ Autonomous trader working!")
except Exception as e:
    print(f"❌ Autonomous trader test failed: {e}")

print("\n" + "="*60)
print("✅ ALL TESTS COMPLETE")
print("="*60)
print("\nNext Steps:")
print("1. Get Apify token: https://console.apify.com/account/integrations")
print("2. Add to .env: APIFY_API_TOKEN=your_token_here")
print("3. Run full system: python src/autonomous_trader.py")
print("="*60)
