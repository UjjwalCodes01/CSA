"""
Simple launcher for the autonomous trading system
Shows real-time status updates
"""

import subprocess
import sys
from datetime import datetime

print("=" * 70)
print("🤖 AUTONOMOUS TRADING SYSTEM")
print("=" * 70)
print()
print("📋 System Features:")
print("   • Multi-source sentiment analysis (CoinGecko + Price Action)")
print("   • Real-time market data monitoring")
print("   • Autonomous trade execution within Sentinel limits")
print("   • Decision logging to autonomous_trade_log.txt")
print()
print("⏰ Monitoring Schedule:")
print("   • Checks sentiment every 5 minutes")
print("   • Makes trading decisions automatically")
print("   • Respects Sentinel daily limits (enforced on-chain)")
print()
print("🛑 To stop: Press Ctrl+C")
print()
print("=" * 70)
print(f"🚀 Starting at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 70)
print()

try:
    # Run the autonomous trader
    subprocess.run([sys.executable, "src/autonomous_trader.py"])
except KeyboardInterrupt:
    print("\n\n" + "=" * 70)
    print("🛑 Autonomous Trader stopped by user")
    print("=" * 70)
    print()
    print("📊 Check autonomous_trade_log.txt for decision history")
    print()
