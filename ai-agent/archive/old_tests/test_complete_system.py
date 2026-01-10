"""
Test Real Sentiment + VVS Integration Together
Shows complete autonomous trading system with:
- Real news sentiment (CryptoPanic + Google News + Gemini)
- VVS-compatible executor (works with MockRouter or VVS Finance)
- Production-ready architecture
"""

import os
import sys

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from monitoring.sentiment_aggregator import SentimentAggregator
from execution.vvs_executor import VVSExecutor


def main():
    print("=" * 80)
    print("🎯 AUTONOMOUS TRADING SYSTEM TEST")
    print("   Real Sentiment + VVS Finance Integration")
    print("=" * 80)
    print()
    
    # ===== STEP 1: Real Sentiment Analysis =====
    print("📊 STEP 1: Real-Time Sentiment Analysis")
    print("-" * 80)
    
    aggregator = SentimentAggregator()
    sentiment = aggregator.aggregate_sentiment("crypto-com-chain")
    
    print()
    print("✅ SENTIMENT RESULTS:")
    print(f"   Signal: {sentiment['signal'].upper()}")
    print(f"   Strength: {sentiment['strength']}")
    print(f"   Score: {sentiment['avg_sentiment']:.3f}")
    print(f"   Trending: {'YES' if sentiment.get('is_trending') else 'NO'}")
    print(f"   Reason: {sentiment['reason']}")
    
    if sentiment.get('sources'):
        print(f"\n   Data Sources:")
        for source in sentiment['sources']:
            source_name = source.get('source', 'unknown')
            score = source.get('sentiment_score', 0)
            if source_name == 'real_news':
                article_count = source.get('articles_count', 0)
                print(f"   - Real News: {score:.2f} ({article_count} articles)")
            else:
                print(f"   - {source_name}: {score:.2f}")
    
    print()
    print("=" * 80)
    
    # ===== STEP 2: VVS Executor Check =====
    print("🔧 STEP 2: VVS Finance Executor Status")
    print("-" * 80)
    
    executor = VVSExecutor()
    
    print()
    print("✅ EXECUTOR CONFIG:")
    print(f"   Network: {executor._get_network_name()}")
    print(f"   Router: {executor.router_address}")
    print(f"   Is Mainnet: {executor.is_mainnet()}")
    print(f"   Is VVS Finance: {executor.is_vvs_finance()}")
    print(f"   Agent Wallet: {executor.address}")
    
    # Check CRO balance
    try:
        cro_balance = executor.w3.from_wei(
            executor.w3.eth.get_balance(executor.address),
            'ether'
        )
        print(f"   CRO Balance: {float(cro_balance):.6f}")
    except:
        print(f"   CRO Balance: Unable to fetch")
    
    print()
    print("=" * 80)
    
    # ===== STEP 3: Trading Decision Simulation =====
    print("🤖 STEP 3: Autonomous Trading Decision")
    print("-" * 80)
    print()
    
    signal = sentiment['signal']
    score = sentiment['avg_sentiment']
    
    print(f"📈 Sentiment Signal: {signal.upper()}")
    print(f"📊 Confidence Score: {score:.3f}")
    print()
    
    if signal in ["strong_buy", "weak_buy"]:
        print("✅ DECISION: Execute BUY")
        print(f"   Reasoning: {sentiment['reason']}")
        print(f"   Executor: {'VVS Finance' if executor.is_vvs_finance() else 'MockRouter'}")
        print(f"   Network: {executor._get_network_name()}")
        print()
        print("   Would execute: WCRO → USDC swap")
        print("   With: Slippage protection, token approval, Sentinel checks")
        
    elif signal in ["strong_sell", "weak_sell"]:
        print("⚠️  DECISION: Execute SELL")
        print(f"   Reasoning: {sentiment['reason']}")
        print(f"   Executor: {'VVS Finance' if executor.is_vvs_finance() else 'MockRouter'}")
        print(f"   Network: {executor._get_network_name()}")
        print()
        print("   Would execute: USDC → WCRO swap")
        print("   With: Slippage protection, token approval, Sentinel checks")
        
    else:
        print("🔒 DECISION: HOLD")
        print(f"   Reasoning: {sentiment['reason']}")
        print(f"   No trade executed - waiting for stronger signal")
    
    print()
    print("=" * 80)
    print()
    
    # ===== SUMMARY =====
    print("📋 SYSTEM SUMMARY")
    print("-" * 80)
    print()
    print("✅ What's Real:")
    print("   - CryptoPanic + Google News sentiment")
    print("   - Gemini AI analysis")
    print("   - Blockchain transactions")
    print("   - VVS-compatible executor code")
    print("   - Sentinel smart contract enforcement")
    print()
    print("⚙️  Current Mode:")
    print(f"   - Network: {executor._get_network_name()}")
    print(f"   - Router: {'VVS Finance (Mainnet)' if executor.is_vvs_finance() else 'MockRouter (Testnet)'}")
    print(f"   - Purpose: {'Production Trading' if executor.is_mainnet() else 'Demo/Testing'}")
    print()
    print("🚀 Production Ready:")
    print("   - Switch to VVS Finance: Change 1 line in .env")
    print("   - Deploy to mainnet: forge script deploy")
    print("   - Start trading: python src/autonomous_trader.py")
    print()
    print("=" * 80)


if __name__ == "__main__":
    main()
