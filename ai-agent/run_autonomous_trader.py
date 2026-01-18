"""
Simple launcher for the autonomous trading system
Shows real-time status updates with enhanced monitoring and error handling
"""

import subprocess
import sys
import os
from datetime import datetime
from pathlib import Path

# Fix Unicode encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def check_environment():
    """Check if all required files and dependencies exist"""
    issues = []
    
    # Check if autonomous_trader.py exists
    trader_path = Path("src/autonomous_trader.py")
    if not trader_path.exists():
        issues.append("❌ src/autonomous_trader.py not found")
    else:
        print("✅ Autonomous trader found")
    
    # Check if .env file exists
    env_path = Path(".env")
    if not env_path.exists():
        issues.append("⚠️  .env file not found (some features may not work)")
    else:
        print("✅ Environment configuration found")
    
    # Check if backend is reachable
    try:
        import requests
        response = requests.get("http://localhost:3001/api/health", timeout=2)
        if response.ok:
            print("✅ Backend server is running")
        else:
            issues.append("⚠️  Backend server returned error")
    except:
        issues.append("⚠️  Backend server not reachable (dashboard won't update)")
    
    return issues

def print_header():
    """Print system header with information"""
    print("=" * 70)
    print("🤖 AUTONOMOUS TRADING SYSTEM - Multi-Agent Council Edition")
    print("=" * 70)
    print()
    print("📋 System Features:")
    print("   • Multi-Agent Council (3 AI agents voting on every decision)")
    print("   • Multi-source sentiment analysis (News, Reddit, CoinGecko)")
    print("   • Real-time market data monitoring (CRO/USDC)")
    print("   • Autonomous trade execution with Sentinel safety limits")
    print("   • X402 micropayments for AI services")
    print("   • WebSocket updates to dashboard")
    print()
    print("🗳️  Multi-Agent Council:")
    print("   • 🛡️  Risk Manager - Conservative approach")
    print("   • 📊 Market Analyst - Data-driven decisions")
    print("   • ⚡ Execution Specialist - Aggressive trading")
    print()
    print("⏰ Monitoring Schedule:")
    print("   • Sentiment analysis every 15 minutes")
    print("   • Council votes on every decision")
    print("   • Automatic trade execution (BUY/SELL with ≥65% confidence)")
    print("   • Respects Sentinel daily limits (enforced on-chain)")
    print()
    print("📁 Logs & Data:")
    print("   • Decision log: src/autonomous_trade_log.txt")
    print("   • Trade history: Check dashboard or backend")
    print()
    print("🛑 To stop: Press Ctrl+C")
    print()

def main():
    """Main launcher function"""
    print_header()
    
    # Environment check
    print("🔍 Checking environment...")
    print()
    issues = check_environment()
    
    if issues:
        print()
        print("⚠️  Issues detected:")
        for issue in issues:
            print(f"   {issue}")
        print()
        
        # Ask user if they want to continue
        response = input("Continue anyway? (y/n): ").strip().lower()
        if response != 'y':
            print("❌ Startup cancelled")
            return
    
    print()
    print("=" * 70)
    print(f"🚀 Starting at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    print()
    
    try:
        # Run the autonomous trader with real-time output
        process = subprocess.Popen(
            [sys.executable, "src/autonomous_trader.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1
        )
        
        # Stream output in real-time
        for line in process.stdout:
            print(line, end='')
            sys.stdout.flush()
        
        process.wait()
        
    except KeyboardInterrupt:
        print("\n\n" + "=" * 70)
        print("🛑 Autonomous Trader stopped by user")
        print("=" * 70)
        print()
        print("📊 Summary:")
        print("   • Decision log: src/autonomous_trade_log.txt")
        print("   • Check dashboard for trade history and performance")
        print("   • Council votes and sentiment data saved to backend")
        print()
        
    except Exception as e:
        print(f"\n\n❌ Error occurred: {e}")
        print("\nTroubleshooting:")
        print("   1. Check if all dependencies are installed: pip install -r requirements.txt")
        print("   2. Ensure .env file has correct configuration")
        print("   3. Verify backend server is running: cd backend && npm start")
        print("   4. Check autonomous_trade_log.txt for detailed error messages")
        print()

if __name__ == "__main__":
    main()
