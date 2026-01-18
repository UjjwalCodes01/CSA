"""
Test HTTP 402 Payment Protocol Implementation
Tests autonomous agent handling of 402 responses with automatic payment
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from backend_client import BackendClient
from dotenv import load_dotenv

load_dotenv()

def test_402_payment_handling():
    """Test that backend client handles 402 responses automatically"""
    
    print("=" * 60)
    print("Testing HTTP 402 Payment Protocol")
    print("=" * 60)
    
    # Initialize backend client with wallet
    client = BackendClient()
    
    print(f"\n✅ Backend client initialized")
    print(f"   Base URL: {client.base_url}")
    print(f"   Wallet: {client.account.address if client.account else 'None'}")
    print(f"   X402 Enabled: {client.w3 is not None}")
    
    # Test 1: Send sentiment update (may trigger 402)
    print("\n" + "=" * 60)
    print("Test 1: Sentiment Update with 402 Handling")
    print("=" * 60)
    
    try:
        client.send_sentiment_update(
            signal="BULLISH",
            score=0.75,
            sources={"coingecko": 0.8, "news": 0.7, "social": 0.75},
            is_trending=True
        )
        print("✅ Test 1 passed: Sentiment update successful")
    except Exception as e:
        print(f"❌ Test 1 failed: {e}")
    
    # Test 2: Send council votes (may trigger 402)
    print("\n" + "=" * 60)
    print("Test 2: Council Votes with 402 Handling")
    print("=" * 60)
    
    try:
        client.send_council_votes(
            votes=[
                {"agent": "Risk Manager", "decision": "BUY", "confidence": 0.7},
                {"agent": "Market Analyst", "decision": "BUY", "confidence": 0.8},
                {"agent": "Execution Specialist", "decision": "HOLD", "confidence": 0.6}
            ],
            consensus="BUY",
            confidence=0.73,
            agreement="high"
        )
        print("✅ Test 2 passed: Council votes sent successfully")
    except Exception as e:
        print(f"❌ Test 2 failed: {e}")
    
    # Test 3: Send agent decision (may trigger 402)
    print("\n" + "=" * 60)
    print("Test 3: Agent Decision with 402 Handling")
    print("=" * 60)
    
    try:
        client.send_agent_decision(
            market_data={"price": 0.15, "volume": 1000000},
            sentinel_status={"current_limit": 100, "used": 50},
            decision="BUY",
            reason="Strong bullish sentiment across all sources"
        )
        print("✅ Test 3 passed: Agent decision sent successfully")
    except Exception as e:
        print(f"❌ Test 3 failed: {e}")
    
    # Test 4: Check backend connectivity
    print("\n" + "=" * 60)
    print("Test 4: Backend Connectivity")
    print("=" * 60)
    
    if client.ping():
        print("✅ Test 4 passed: Backend is reachable")
    else:
        print("❌ Test 4 failed: Backend is not reachable")
    
    print("\n" + "=" * 60)
    print("All Tests Complete")
    print("=" * 60)
    print("\n💡 Notes:")
    print("   - If 402 responses are enabled on backend, payments were made automatically")
    print("   - Check Cronos explorer for payment transactions")
    print("   - Autonomous trader maintains full autonomy (no human intervention)")

if __name__ == "__main__":
    test_402_payment_handling()
