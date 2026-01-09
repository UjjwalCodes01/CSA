"""
Test Sentiment Agent - Twitter Integration
Quick test script for Day 11-13 sentiment tools
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Import sentiment tools
from src.agents.sentiment_agent import (
    get_token_sentiment,
    check_sentiment_condition,
    get_trending_tokens,
    analyze_trade_sentiment
)

def test_sentiment_tools():
    """Test all sentiment analysis tools"""
    
    print("=" * 60)
    print("🐦 SENTIMENT AGENT TEST - Day 11")
    print("=" * 60)
    print()
    
    # Check Twitter API configuration
    twitter_token = os.getenv("TWITTER_BEARER_TOKEN")
    demo_mode = os.getenv("TWITTER_DEMO_MODE", "false").lower() == "true"
    
    print("Configuration:")
    print(f"  Twitter Token: {'✅ Configured' if twitter_token else '❌ Missing'}")
    print(f"  Demo Mode: {demo_mode}")
    print()
    
    # Test 1: Get sentiment for CRO
    print("-" * 60)
    print("Test 1: Get Token Sentiment (CRO)")
    print("-" * 60)
    result = get_token_sentiment.invoke({"symbol": "CRO"})
    print(f"Score: {result.get('score')}/100")
    print(f"Sentiment: {result.get('sentiment')}")
    print(f"Trending: {result.get('trending')}")
    print(f"Volume: {result.get('volume')} mentions")
    print(f"Source: {result.get('source', 'N/A')}")
    print()
    
    # Test 2: Check sentiment condition
    print("-" * 60)
    print("Test 2: Check Sentiment Condition (CRO > 70)")
    print("-" * 60)
    result = check_sentiment_condition.invoke({"symbol": "CRO", "threshold": 70})
    print(f"Condition Met: {result.get('condition_met')}")
    print(f"Current Score: {result.get('current_score')}")
    print(f"Recommendation: {result.get('recommendation')}")
    print()
    
    # Test 3: Get trending tokens
    print("-" * 60)
    print("Test 3: Get Trending Tokens")
    print("-" * 60)
    result = get_trending_tokens.invoke({})
    print(f"Trending Count: {result.get('trending_count')}")
    print(f"Market Mood: {result.get('market_mood')}")
    print(f"Recommendation: {result.get('recommendation')}")
    print("\nTrending Tokens:")
    for token in result.get('trending_tokens', []):
        print(f"  {token['symbol']}: {token['score']}/100 ({token['sentiment']})")
    print()
    
    # Test 4: Analyze trade sentiment
    print("-" * 60)
    print("Test 4: Analyze Trade Sentiment (0.5 CRO)")
    print("-" * 60)
    result = analyze_trade_sentiment.invoke({"symbol": "CRO", "amount_cro": 0.5})
    print(f"Sentiment Approved: {result.get('sentiment_approved')}")
    print(f"Score: {result.get('score')}/100")
    print(f"Risk Level: {result.get('risk_level')}")
    print(f"Recommendation: {result.get('recommendation')}")
    print()
    
    # Test 5: Multi-token comparison
    print("-" * 60)
    print("Test 5: Multi-Token Sentiment Comparison")
    print("-" * 60)
    tokens = ["CRO", "BTC", "ETH"]
    for token in tokens:
        result = get_token_sentiment.invoke({"symbol": token})
        score = result.get('score', 0)
        sentiment = result.get('sentiment', 'Unknown')
        print(f"  {token}: {score}/100 ({sentiment})")
    print()
    
    print("=" * 60)
    print("✅ All sentiment tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_sentiment_tools()
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
