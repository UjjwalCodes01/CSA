#!/usr/bin/env python3
"""
CDC Price Updater - Fetches CRO prices from Crypto.com and updates backend
This script runs periodically to update CDC price data in the dashboard.
Part of Crypto.com Integration (Hackathon Priority #3)
"""

import sys
import os
import time
import requests
from pathlib import Path

# Add src directory to path
sys.path.append(str(Path(__file__).parent / 'src'))

from services.cdc_price_service import CDCPriceService

BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:3001')
UPDATE_INTERVAL = int(os.getenv('CDC_UPDATE_INTERVAL', '30'))  # seconds

def update_backend_cdc_price(price_data):
    """Send CDC price data to backend"""
    try:
        response = requests.post(
            f'{BACKEND_URL}/api/market/price/cdc/update',
            json=price_data,
            timeout=5
        )
        response.raise_for_status()
        print(f"✅ CDC price updated: ${price_data['price']} ({price_data['change24h']:+.2f}%)")
        return True
    except Exception as e:
        print(f"❌ Failed to update backend: {e}")
        return False

def main():
    """Main loop - fetches CDC prices and updates backend"""
    print("🚀 CDC Price Updater Started")
    print(f"📡 Backend: {BACKEND_URL}")
    print(f"⏱️  Update interval: {UPDATE_INTERVAL}s")
    print("-" * 60)
    
    cdc_service = CDCPriceService()
    
    while True:
        try:
            # Fetch CRO price from CDC
            price_data = cdc_service.get_cro_price()
            
            # Update backend
            update_backend_cdc_price(price_data)
            
            # Wait for next update
            time.sleep(UPDATE_INTERVAL)
            
        except KeyboardInterrupt:
            print("\n\n⏹️  CDC Price Updater stopped by user")
            break
        except Exception as e:
            print(f"❌ Error in update loop: {e}")
            time.sleep(UPDATE_INTERVAL)

if __name__ == '__main__':
    main()
