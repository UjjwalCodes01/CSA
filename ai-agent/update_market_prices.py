#!/usr/bin/env python3
"""
Market Price Updater - Fetches CRO prices and updates backend
Uses the same Crypto.com Exchange API that your agent uses
"""

import sys
import os
import time
import requests
from pathlib import Path

# Add src directory to path
sys.path.append(str(Path(__file__).parent / 'src'))

# Use the SAME API your agent already uses
try:
    from crypto_com_developer_platform_client import Exchange, Client
    
    # Initialize client (REQUIRED even for public API)
    api_key = os.getenv('DEVELOPER_PLATFORM_API_KEY')
    if api_key:
        Client.init(api_key=api_key)
        print("✅ Crypto.com Exchange Client initialized with API key")
    else:
        # Initialize without key for public API
        Client.init()
        print("✅ Crypto.com Exchange Client initialized (public API)")
    
    CDC_AVAILABLE = True
except ImportError:
    CDC_AVAILABLE = False
    print("❌ crypto_com_developer_platform_client not installed")
    print("   Your agent uses this. Install with: pip install crypto_com_developer_platform_client")
except Exception as e:
    CDC_AVAILABLE = False
    print(f"❌ Exchange Client initialization failed: {e}")

BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:3001')
UPDATE_INTERVAL = int(os.getenv('PRICE_UPDATE_INTERVAL', '10'))  # 10 seconds for faster updates

def fetch_cro_price():
    """Fetch CRO price from Crypto.com Exchange - SAME AS YOUR AGENT USES"""
    try:
        # EXACT same call your agent uses in market_data_agent.py
        ticker = Exchange.get_ticker_by_instrument('CRO_USDT')
        data = ticker.get('data', {})
        
        last_price = float(data.get('lastPrice', 0))
        change_24h = float(data.get('change', 0))
        
        return {
            'price': last_price,
            'change_24h': change_24h,
            'source': 'crypto.com_exchange'
        }
    except Exception as e:
        print(f"❌ Failed to fetch price: {e}")
        return None

def update_backend_price(price_data):
    """Send price data to backend"""
    try:
        response = requests.post(
            f'{BACKEND_URL}/api/market/price/update',
            json={
                'price': price_data['price'],
                'change_24h': price_data['change_24h']
            },
            timeout=5
        )
        response.raise_for_status()
        print(f"✅ Price updated: ${price_data['price']:.6f} ({price_data['change_24h']:+.2f}%) via {price_data['source']}")
        return True
    except Exception as e:
        print(f"❌ Failed to update backend: {e}")
        return False

def main():
    """Main loop - fetches prices and updates backend"""
    print("🚀 Market Price Updater Started")
    print(f"📡 Backend: {BACKEND_URL}")
    print(f"⏱️  Update interval: {UPDATE_INTERVAL}s")
    print(f"🔗 Using: Crypto.com Exchange API (same as your agent)")
    print("-" * 60)
    
    if not CDC_AVAILABLE:
        print("❌ ERROR: Crypto.com Exchange API not available!")
        print("   Your agent needs this too. Check crypto_com_developer_platform_client installation.")
        sys.exit(1)
    
    consecutive_failures = 0
    max_failures = 5
    
    while True:
        try:
            # Fetch CRO price using SAME method as agent
            price_data = fetch_cro_price()
            
            if price_data:
                # Update backend
                if update_backend_price(price_data):
                    consecutive_failures = 0  # Reset on success
                else:
                    consecutive_failures += 1
            else:
                print("⚠️  No price data - Exchange API timeout or connection issue")
                consecutive_failures += 1
            
            # If too many failures, wait longer
            if consecutive_failures >= max_failures:
                print(f"⚠️  {consecutive_failures} consecutive failures - waiting 60s...")
                time.sleep(60)
                consecutive_failures = 0
            else:
                # Normal wait
                time.sleep(UPDATE_INTERVAL)
            
        except KeyboardInterrupt:
            print("\n\n⏹️  Market Price Updater stopped by user")
            break
        except Exception as e:
            print(f"❌ Error in update loop: {e}")
            consecutive_failures += 1
            time.sleep(UPDATE_INTERVAL)

if __name__ == '__main__':
    main()
