#!/usr/bin/env python3
"""
Show Real Reddit Data Analysis in Action
"""
import requests
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

def main():
    print("\n" + "🎯 LIVE REDDIT SENTIMENT ANALYSIS".center(70))
    print("=" * 70 + "\n")
    
    # Fetch real Reddit data
    url = "https://www.reddit.com/r/CryptoCurrency/search.json"
    params = {
        "q": "Cronos OR CRO OR Crypto.com",
        "limit": 10,
        "sort": "new",
        "restrict_sr": "true"
    }
    headers = {"User-Agent": "CronosSentinel/1.0"}
    
    print("🔍 Fetching real posts from r/CryptoCurrency...")
    response = requests.get(url, params=params, headers=headers, timeout=10)
    data = response.json()
    
    # Analyze sentiment
    analyzer = SentimentIntensityAnalyzer()
    posts = []
    
    print(f"✅ Found {len(data['data']['children'])} posts\n")
    print("📊 ANALYZING SENTIMENT:")
    print("-" * 70)
    
    total_sentiment = 0
    bullish_count = 0
    bearish_count = 0
    
    for i, child in enumerate(data['data']['children'], 1):
        post = child['data']
        title = post.get('title', '')
        text = post.get('selftext', '')
        score = post.get('score', 0)
        comments = post.get('num_comments', 0)
        
        # Analyze
        full_text = f"{title} {text}"
        sentiment = analyzer.polarity_scores(full_text)
        compound = sentiment['compound']
        
        # Categorize
        if compound > 0.3:
            emoji = "🟢"
            category = "BULLISH"
            bullish_count += 1
        elif compound < -0.3:
            emoji = "🔴"
            category = "BEARISH"
            bearish_count += 1
        else:
            emoji = "⚪"
            category = "NEUTRAL"
        
        total_sentiment += compound
        
        print(f"\n{i}. {title[:60]}")
        print(f"   Score: {score} | Comments: {comments} | Sentiment: {compound:+.3f} {emoji} {category}")
        
        # Check for emergency keywords
        text_lower = full_text.lower()
        if any(word in text_lower for word in ['hack', 'exploit', 'scam', 'rugpull', 'lawsuit']):
            print(f"   ⚠️  WARNING: Emergency keyword detected!")
    
    # Summary
    avg_sentiment = total_sentiment / len(data['data']['children']) if data['data']['children'] else 0
    
    print("\n" + "=" * 70)
    print("📈 SUMMARY:")
    print("=" * 70)
    print(f"Total Posts Analyzed: {len(data['data']['children'])}")
    print(f"Bullish Posts: {bullish_count} 🟢")
    print(f"Bearish Posts: {bearish_count} 🔴")
    print(f"Neutral Posts: {len(data['data']['children']) - bullish_count - bearish_count} ⚪")
    print(f"\nAverage Sentiment: {avg_sentiment:+.3f}")
    
    if avg_sentiment > 0.3:
        print("🎯 SIGNAL: BULLISH - Consider buying")
    elif avg_sentiment < -0.3:
        print("🎯 SIGNAL: BEARISH - Consider selling or holding")
    else:
        print("🎯 SIGNAL: NEUTRAL - Hold position")
    
    print("\n💡 This is REAL data from Reddit, analyzed in real-time!")
    print("   No Apify needed, completely free!")

if __name__ == "__main__":
    main()
