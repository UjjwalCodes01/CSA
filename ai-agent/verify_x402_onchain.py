"""
Test X402 Integration with REAL on-chain payments
This will verify that all payments are processed on blockchain
"""

import sys
import time
sys.path.append('src')

from services.x402_payment import X402Payment

def verify_x402_onchain():
    """Verify x402 payments are being processed on blockchain"""
    
    print("=" * 70)
    print("X402 ON-CHAIN PAYMENT VERIFICATION")
    print("=" * 70)
    
    client = X402Payment()
    
    # Test 1: Get pricing info
    print("\n📋 Test 1: Pricing Information")
    pricing = client.pricing
    if pricing:
        print("✅ Pricing loaded successfully")
        for service, cost in pricing.items():
            print(f"   {service}: {cost} CRO")
    else:
        print("❌ Failed to get pricing")
        return False
    
    # Test 2: Check if backend is running
    print("\n🔍 Test 2: Backend Connection")
    import requests
    try:
        response = requests.get(f"{client.backend_url}/api/health", timeout=5)
        if response.ok:
            print("✅ Backend is running")
        else:
            print("❌ Backend not responding")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        print("   Make sure backend is running: cd ../backend && npm start")
        return False
    
    # Test 3: Process a test payment
    print("\n💳 Test 3: Processing Test Payment (MARKET_DATA)")
    payment_result = client.pay_for_market_data('price_check')
    
    if payment_result and payment_result.get('success'):
        payment = payment_result.get('payment', {})
        is_simulated = payment.get('simulated', False)
        tx_hash = payment.get('transactionHash', 'N/A')
        
        print(f"\n📊 Payment Result:")
        print(f"   Service Type: MARKET_DATA")
        print(f"   Cost: {payment_result.get('cost', 'N/A')} CRO")
        print(f"   Transaction Hash: {tx_hash}")
        print(f"   Simulated: {'YES (DEV MODE)' if is_simulated else 'NO (REAL ON-CHAIN)'}")
        print(f"   Timestamp: {payment.get('timestamp', 'N/A')}")
        
        if is_simulated:
            print("\n⚠️  WARNING: Payments are being SIMULATED (not on-chain)")
            print("   This means:")
            print("   - No real blockchain transactions")
            print("   - Mock transaction hashes")
            print("   - Not stored on Cronos network")
            print("\n   To enable REAL on-chain payments:")
            print("   1. Verify PRIVATE_KEY is set in backend/.env")
            print("   2. Restart the backend server")
            return False
        else:
            print("\n✅ SUCCESS: REAL ON-CHAIN PAYMENT PROCESSED!")
            print(f"   View on explorer:")
            print(f"   https://explorer.cronos.org/testnet/tx/{tx_hash}")
            return True
    else:
        print(f"❌ Payment failed: {payment_result.get('error', 'Unknown error')}")
        return False

def test_full_payment_workflow():
    """Test all 5 payment types on-chain"""
    
    print("\n" + "=" * 70)
    print("FULL X402 PAYMENT WORKFLOW TEST (ALL SERVICES)")
    print("=" * 70)
    
    client = X402Payment()
    
    test_cases = [
        ("MARKET_DATA", lambda: client.pay_for_market_data("price_data")),
        ("SENTIMENT_ANALYSIS", lambda: client.pay_for_sentiment_analysis(3)),
        ("AI_DECISION", lambda: client.pay_for_ai_decision({"signal": "buy", "sentiment": 0.75, "confidence": 0.85})),
        ("MULTI_AGENT_VOTE", lambda: client.pay_for_multi_agent_vote({
            "consensus": "buy", "confidence": 0.82, "agents": 3
        })),
        ("TRADE_EXECUTION", lambda: client.pay_for_trade_execution({
            "direction": "buy", "amount": 0.1, "tokenIn": "WCRO", "tokenOut": "TUSD"
        })),
    ]
    
    total_cost = 0
    successful_payments = 0
    on_chain_payments = 0
    
    for service_name, payment_func in test_cases:
        print(f"\n💳 Testing {service_name}...")
        time.sleep(1)  # Small delay between payments
        
        result = payment_func()
        
        if result and result.get('success'):
            successful_payments += 1
            total_cost += float(result.get('cost', 0))
            
            payment = result.get('payment', {})
            is_simulated = payment.get('simulated', False)
            tx_hash = payment.get('transactionHash', 'N/A')
            
            if not is_simulated:
                on_chain_payments += 1
                print(f"   ✅ ON-CHAIN: {tx_hash[:20]}...")
            else:
                print(f"   ⚠️  SIMULATED: {tx_hash[:20]}...")
            
            print(f"   Cost: {result.get('cost', 0)} CRO")
        else:
            print(f"   ❌ FAILED: {result.get('error', 'Unknown error')}")
    
    print("\n" + "=" * 70)
    print("FINAL RESULTS")
    print("=" * 70)
    print(f"✅ Successful Payments: {successful_payments}/{len(test_cases)}")
    print(f"⛓️  On-Chain Payments: {on_chain_payments}/{len(test_cases)}")
    print(f"💰 Total Cost: {total_cost:.6f} CRO")
    
    if on_chain_payments == len(test_cases):
        print("\n🎉 ALL PAYMENTS PROCESSED ON-CHAIN!")
        print("   Your x402 integration is fully operational")
        print("   All payments are stored on Cronos blockchain")
        return True
    elif successful_payments == len(test_cases) and on_chain_payments == 0:
        print("\n⚠️  ALL PAYMENTS SIMULATED (DEV MODE)")
        print("   Backend needs PRIVATE_KEY configured for real payments")
        return False
    else:
        print("\n⚠️  MIXED RESULTS - Some payments failed or simulated")
        return False

def main():
    print("🚀 Starting X402 On-Chain Verification...\n")
    
    # First verify basic functionality
    basic_test = verify_x402_onchain()
    
    if basic_test:
        # If basic test passes, run full workflow test
        print("\n" + "🔄 " * 20)
        time.sleep(2)
        full_test = test_full_payment_workflow()
        
        if full_test:
            print("\n✅ X402 INTEGRATION: FULLY OPERATIONAL")
            print("   All payments are processed on-chain")
            print("   Ready for hackathon submission!")
            sys.exit(0)
        else:
            print("\n⚠️  Some tests failed")
            sys.exit(1)
    else:
        print("\n❌ X402 is running in DEV MODE or backend not started")
        print("\nTo enable REAL on-chain payments:")
        print("1. Start backend: cd ../backend && npm start")
        print("2. Check for 'Mode: PRODUCTION (real x402 payments)'")
        print("3. Re-run this test")
        sys.exit(1)

if __name__ == '__main__':
    main()
