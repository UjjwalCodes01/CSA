#!/usr/bin/env python3
"""
Test CDC Integration - Verifies all components are working
"""

import requests
import sys
import time
from pathlib import Path

# Add src directory to path
sys.path.append(str(Path(__file__).parent / 'src'))

from services.cdc_price_service import CDCPriceService

BACKEND_URL = 'http://localhost:3001'

def test_cdc_service():
    """Test CDC price service module"""
    print("\n" + "="*60)
    print("🧪 Testing CDC Price Service")
    print("="*60)
    
    cdc_service = CDCPriceService()
    
    print("\n📊 Fetching CRO price from Crypto.com...")
    price_data = cdc_service.get_cro_price()
    
    print(f"\n✅ CRO Price: ${price_data['price']:.6f}")
    print(f"   24h Change: {price_data['change_24h']:+.2f}%")
    print(f"   Source: {price_data['source']}")
    
    return price_data

def test_backend_health():
    """Test backend connection"""
    print("\n" + "="*60)
    print("🔌 Testing Backend Connection")
    print("="*60)
    
    try:
        response = requests.get(f'{BACKEND_URL}/api/health', timeout=5)
        response.raise_for_status()
        print("\n✅ Backend is running")
        print(f"   Status: {response.json()}")
        return True
    except Exception as e:
        print(f"\n❌ Backend not responding: {e}")
        return False

def test_cdc_update():
    """Test updating CDC price to backend"""
    print("\n" + "="*60)
    print("📡 Testing CDC Price Update")
    print("="*60)
    
    cdc_service = CDCPriceService()
    price_data = cdc_service.get_cro_price()
    
    try:
        response = requests.post(
            f'{BACKEND_URL}/api/market/price/cdc/update',
            json=price_data,
            timeout=5
        )
        response.raise_for_status()
        
        print("\n✅ CDC price updated successfully")
        print(f"   Backend response: {response.json()}")
        return True
    except Exception as e:
        print(f"\n❌ Failed to update backend: {e}")
        return False

def test_price_comparison():
    """Test price comparison endpoint"""
    print("\n" + "="*60)
    print("🔄 Testing Price Comparison")
    print("="*60)
    
    try:
        response = requests.get(
            f'{BACKEND_URL}/api/market/price/compare',
            timeout=5
        )
        response.raise_for_status()
        
        data = response.json()
        print("\n✅ Price comparison retrieved")
        print(f"\n   CoinGecko: ${data['sources']['coingecko']['price']:.6f}")
        print(f"   Crypto.com: ${data['sources']['crypto_com']['price']:.6f}")
        print(f"   Difference: {data['comparison']['percentage_diff']:+.2f}%")
        print(f"   Average: ${data['comparison']['avg_price']:.6f}")
        print(f"   Spread: ${data['comparison']['spread']:.6f}")
        
        return True
    except Exception as e:
        print(f"\n❌ Failed to get comparison: {e}")
        return False

def main():
    """Run all tests"""
    print("\n🚀 CDC INTEGRATION TEST SUITE")
    print("Testing Crypto.com Integration (Hackathon Priority #3)")
    
    results = []
    
    # Test 1: CDC Price Service
    price_data = test_cdc_service()
    results.append(('CDC Price Service', price_data is not None))
    
    # Test 2: Backend Health
    backend_ok = test_backend_health()
    results.append(('Backend Connection', backend_ok))
    
    if backend_ok:
        # Test 3: Update CDC Price
        update_ok = test_cdc_update()
        results.append(('CDC Price Update', update_ok))
        
        # Wait a moment for backend to process
        time.sleep(1)
        
        # Test 4: Price Comparison
        comparison_ok = test_price_comparison()
        results.append(('Price Comparison', comparison_ok))
    
    # Summary
    print("\n" + "="*60)
    print("📋 TEST SUMMARY")
    print("="*60)
    
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n🎉 ALL TESTS PASSED - CDC Integration is working!")
    else:
        print("\n⚠️  Some tests failed - check backend and dependencies")
    
    print("\n💡 Next steps:")
    print("   1. Start backend: cd backend && npm start")
    print("   2. Start CDC updater: cd ai-agent && python update_cdc_prices.py")
    print("   3. Start frontend: cd frontend && npm run dev")
    print("   4. Open http://localhost:3000/dashboard")

if __name__ == '__main__':
    main()
