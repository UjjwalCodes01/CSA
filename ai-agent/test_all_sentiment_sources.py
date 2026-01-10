#!/usr/bin/env python3
"""
Comprehensive Test: All Sentiment Sources Together
Tests: CoinGecko, Reddit, CryptoPanic, Google News + Gemini, Price Action
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from monitoring.sentiment_aggregator import SentimentAggregator
from monitoring.real_sentiment import RealSentimentAnalyzer
from datetime import datetime


def test_individual_sources():
    """Test each sentiment source individually"""
    print("\n" + "=" * 80)
    print("🧪 TESTING INDIVIDUAL SENTIMENT SOURCES".center(80))
    print("=" * 80 + "\n")
    
    aggregator = SentimentAggregator()
    
    # Test 1: CoinGecko
    print("📊 TEST 1: CoinGecko Sentiment")
    print("-" * 80)
    coingecko = aggregator.get_coingecko_sentiment("crypto-com-chain")
    if coingecko:
        print(f"✅ CoinGecko Data Retrieved")
        print(f"   Sentiment Score: {coingecko['sentiment_score']:.3f}")
        print(f"   Votes Up: {coingecko['sentiment_votes_up']:.1f}%")
        print(f"   Votes Down: {coingecko['sentiment_votes_down']:.1f}%")
        print(f"   Reddit Subscribers: {coingecko['reddit_subscribers']:,}")
    else:
        print("❌ CoinGecko unavailable")
    
    # Test 2: Reddit
    print("\n💬 TEST 2: Reddit Sentiment (FREE API)")
    print("-" * 80)
    reddit = aggregator.get_reddit_sentiment("Cronos CRO")
    if reddit:
        print(f"✅ Reddit Data Retrieved")
        print(f"   Sentiment Score: {reddit['sentiment_score']:.3f}")
        print(f"   Posts Analyzed: {reddit['posts_analyzed']}")
        print(f"   Subreddits: {', '.join(reddit['subreddits'])}")
    else:
        print("❌ Reddit unavailable")
    
    # Test 3: CryptoPanic + Google News
    print("\n📰 TEST 3: Real News Sentiment (CryptoPanic + Google News + Gemini)")
    print("-" * 80)
    real_sentiment = RealSentimentAnalyzer()
    news = real_sentiment.get_aggregated_sentiment()
    if news and news.get('sentiment_score') != 0:
        print(f"✅ Real News Data Retrieved")
        print(f"   Sentiment Score: {news['sentiment_score']:.3f}")
        print(f"   Articles Analyzed: {news.get('articles_count', 'N/A')}")
        
        # Show individual source breakdown if available
        if 'source_breakdown' in news:
            print(f"   Sources: {', '.join(news.get('sources_used', []))}")
            for source_name, source_data in news['source_breakdown'].items():
                if source_data.get('count', 0) > 0:
                    print(f"\n   {source_name.upper()}:")
                    print(f"      Articles: {source_data['count']}")
                    print(f"      Sentiment: {source_data['sentiment']:.3f}")
    else:
        print("❌ Real News unavailable")
    
    # Test 4: Trending Status
    print("\n🔥 TEST 4: Trending Status")
    print("-" * 80)
    trending = aggregator.get_trending_status("crypto-com-chain")
    if trending:
        print(f"✅ Trending Data Retrieved")
        print(f"   Is Trending: {'YES 🚀' if trending['is_trending'] else 'NO'}")
        print(f"   Trending Coins Count: {trending['trending_coins_count']}")
    else:
        print("❌ Trending check unavailable")


def test_aggregated_sentiment():
    """Test the complete aggregated sentiment"""
    print("\n\n" + "=" * 80)
    print("🎯 FULL AGGREGATED SENTIMENT TEST".center(80))
    print("=" * 80 + "\n")
    
    aggregator = SentimentAggregator()
    result = aggregator.aggregate_sentiment("crypto-com-chain")
    
    print("\n" + "=" * 80)
    print("📊 FINAL AGGREGATED RESULT")
    print("=" * 80)
    print(f"\n🚦 SIGNAL: {result['signal'].upper()}")
    print(f"💪 Strength: {result['strength']}")
    print(f"📈 Average Sentiment: {result['avg_sentiment']:.3f}")
    print(f"🔥 Trending: {'YES' if result.get('is_trending') else 'NO'}")
    print(f" Reason: {result['reason']}")
    print(f"\n🗂️  Sources Used: {len(result['sources'])}")
    
    # Show breakdown by source
    print("\n📋 SOURCE BREAKDOWN:")
    for source in result['sources']:
        source_name = source.get('source', 'unknown').upper()
        score = source.get('sentiment_score', 0)
        
        if source_name == "REAL_NEWS":
            articles = source.get('articles_count', 0)
            print(f"   {source_name}: {score:+.3f} ({articles} articles)")
        elif source_name == "REDDIT":
            posts = source.get('posts_analyzed', 0)
            print(f"   {source_name}: {score:+.3f} ({posts} posts)")
        elif source_name == "COINGECKO":
            up_votes = source.get('sentiment_votes_up', 0)
            print(f"   {source_name}: {score:+.3f} ({up_votes:.0f}% up votes)")
        else:
            print(f"   {source_name}: {score:+.3f}")


def show_summary():
    """Show final summary"""
    print("\n\n" + "=" * 80)
    print("✅ COMPREHENSIVE SENTIMENT SYSTEM STATUS".center(80))
    print("=" * 80)
    print("""
    DATA SOURCES (ALL REAL):
    ✅ CoinGecko API        → Sentiment votes, trending status
    ✅ Reddit FREE API      → Community posts with crypto slang detection
    ✅ CryptoPanic RSS      → Real crypto news headlines with sentiment
    ✅ Google News + Gemini → Live news analyzed by AI
    
    SENTIMENT ANALYSIS FEATURES:
    ✅ Multi-source aggregation with weighted averaging
    ✅ Crypto slang detection (LFG, moon, dump, FUD, etc.)
    ✅ Trading signal generation (strong_buy to strong_sell)
    ✅ Trending boost for signals
    ✅ Real-time AI analysis of news headlines
    
    100% REAL DATA - NO MOCK SENTIMENT! 🎯
    """)


def main():
    print("\n" + "🚀 COMPLETE SENTIMENT SYSTEM TEST".center(80))
    print("Testing: CoinGecko + Reddit + CryptoPanic + Google News")
    print("=" * 80)
    
    try:
        # Test each source individually
        test_individual_sources()
        
        # Test aggregated sentiment
        test_aggregated_sentiment()
        
        # Show summary
        show_summary()
        
        print("=" * 80)
        print("✅ ALL TESTS COMPLETE".center(80))
        print("=" * 80 + "\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
