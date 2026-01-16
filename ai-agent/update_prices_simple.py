#!/usr/bin/env python3
"""
Simple Price Updater - Uses MCP Server (same as agent)
Fetches CRO prices via MCP and updates backend
"""

import asyncio
import sys
import os
import json
import requests
from pathlib import Path

# Add src directory
sys.path.append(str(Path(__file__).parent / 'src'))

from fastmcp import Client

BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:3001')
UPDATE_INTERVAL = 15  # seconds

async def fetch_and_update_price():
    """Fetch price from MCP server and update backend"""
    server_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "src", "mcp_server.py"))
    
    try:
        async with Client(server_path) as mcp_client:
            # Call check_cro_price tool (same as agent uses)
            result = await mcp_client.call_tool("check_cro_price", {})
            
            if result and len(result) > 0:
                # Parse result
                price_data = result[0].content[0].text if hasattr(result[0], 'content') else '{}'
                if isinstance(price_data, str):
                    price_data = json.loads(price_data)
                
                if isinstance(price_data, dict) and 'price' in price_data:
                    # Update backend
                    response = requests.post(
                        f'{BACKEND_URL}/api/market/price/update',
                        json={
                            'price': price_data.get('price', 0),
                            'change_24h': price_data.get('24h_change', price_data.get('change_24h_percent', 0))
                        },
                        timeout=5
                    )
                    
                    if response.ok:
                        print(f"✅ Price: ${price_data.get('price', 0):.6f} ({price_data.get('24h_change', 0):+.2f}%)")
                        return True
                    else:
                        print(f"❌ Backend error: {response.status_code}")
                else:
                    print(f"❌ No price data in result")
            else:
                print("❌ No result from MCP")
                
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return False

async def main():
    """Main loop"""
    print("🚀 Simple Price Updater (via MCP)")
    print(f"📡 Backend: {BACKEND_URL}")
    print(f"⏱️  Interval: {UPDATE_INTERVAL}s")
    print(f"🔗 Using: MCP Server (same as your agent)")
    print("-" * 60)
    
    while True:
        try:
            await fetch_and_update_price()
            await asyncio.sleep(UPDATE_INTERVAL)
        except KeyboardInterrupt:
            print("\n⏹️  Stopped")
            break
        except Exception as e:
            print(f"❌ Loop error: {e}")
            await asyncio.sleep(UPDATE_INTERVAL)

if __name__ == '__main__':
    asyncio.run(main())
