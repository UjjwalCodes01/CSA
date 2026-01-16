#!/usr/bin/env python3
"""
Test X402 Integration
Verify that x402 payments work correctly
"""
import sys
import os

# Add path
sys.path.insert(0, 'src')

from services.x402_payment import get_x402_client

def test_x402_integration():
    """Test x402 payment integration"""
    
    print("=" * 60)
    print("X402 INTEGRATION TEST")
    print("=" * 60)
    
    # Initialize client
    x402 = get_x402_client()
    
    # Test 1: Get pricing
    print("\n1️⃣ Testing Pricing Info...")
    pricing = x402.pricing
    print(f"   Available services: {len(pricing)}")
    for service, cost in pricing.items():
        print(f"   • {service}: {cost} CRO")
    
    # Test 2: Estimate cost
    print("\n2️⃣ Testing Cost Estimation...")
    operations = {
        'SENTIMENT_ANALYSIS': 1,
        'AI_DECISION': 1,
        'TRADE_EXECUTION': 1,
    }
    total = x402.estimate_cost(operations)
    print(f"   Estimated cost for full cycle: {total} CRO")
    
    # Test 3: Payment for sentiment analysis
    print("\n3️⃣ Testing Sentiment Analysis Payment...")
    result = x402.pay_for_sentiment_analysis(sources=3)
    if x402.is_authorized(result):
        print(f"   ✅ Payment successful!")
        print(f"   TX: {result.get('payment', {}).get('txHash', 'N/A')[:16]}...")
    else:
        print(f"   ❌ Payment failed: {result.get('error')}")
    
    # Test 4: Payment for AI decision
    print("\n4️⃣ Testing AI Decision Payment...")
    result = x402.pay_for_ai_decision({
        'signal': 'strong_buy',
        'sentiment': 0.75,
        'confidence': 0.85,
    })
    if x402.is_authorized(result):
        print(f"   ✅ Payment successful!")
    else:
        print(f"   ❌ Payment failed: {result.get('error')}")
    
    # Test 5: Payment summary
    print("\n5️⃣ Payment Summary...")
    summary = x402.get_payment_summary()
    print(f"   Total payments: {summary['total_payments']}")
    print(f"   Total spent: {summary['total_spent']}")
    
    print("\n" + "=" * 60)
    print("✅ X402 INTEGRATION TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    test_x402_integration()
