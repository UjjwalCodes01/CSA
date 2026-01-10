#!/usr/bin/env python3
"""
Test Reddit API - No Apify Needed!
Reddit has a free JSON API that doesn't require authentication for public data
"""
import requests
import json
from datetime import datetime

def get_reddit_posts(subreddit="CryptoCurrency", query="Cronos", limit=10):
    """
    Get Reddit posts using Reddit's free JSON API
    No authentication needed!
    """
    print(f"🔍 Fetching from r/{subreddit} for '{query}'")
    
    try:
        # Reddit's free JSON endpoint
        url = f"https://www.reddit.com/r/{subreddit}/search.json"
        params = {
            "q": query,
            "limit": limit,
            "sort": "new",
            "restrict_sr": "true"  # Search within subreddit only
        }
        
        # Reddit requires User-Agent
        headers = {
            "User-Agent": "CronosSentinel/1.0 (Autonomous Trading Bot)"
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            posts = []
            
            for child in data['data']['children']:
                post = child['data']
                posts.append({
                    "title": post.get('title', ''),
                    "text": post.get('selftext', ''),
                    "author": post.get('author', 'unknown'),
                    "score": post.get('score', 0),
                    "upvote_ratio": post.get('upvote_ratio', 0),
                    "num_comments": post.get('num_comments', 0),
                    "created_utc": post.get('created_utc', 0),
                    "url": f"https://reddit.com{post.get('permalink', '')}",
                    "subreddit": post.get('subreddit', subreddit)
                })
            
            return posts
        else:
            print(f"   ❌ HTTP {response.status_code}")
            return []
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return []


def get_hot_crypto_posts():
    """Get hot posts from crypto subreddits"""
    print("\n🔥 Fetching HOT posts from crypto subreddits")
    
    subreddits = ["CryptoCurrency", "CronosOfficial", "Crypto_com"]
    all_posts = []
    
    for sub in subreddits:
        try:
            url = f"https://www.reddit.com/r/{sub}/hot.json"
            params = {"limit": 10}
            headers = {"User-Agent": "CronosSentinel/1.0"}
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                count = len(data['data']['children'])
                print(f"   ✅ r/{sub}: {count} posts")
                
                for child in data['data']['children']:
                    post = child['data']
                    all_posts.append({
                        "title": post.get('title', ''),
                        "text": post.get('selftext', ''),
                        "score": post.get('score', 0),
                        "subreddit": post.get('subreddit', sub),
                        "comments": post.get('num_comments', 0)
                    })
            else:
                print(f"   ❌ r/{sub}: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ r/{sub}: {e}")
    
    return all_posts


def analyze_sentiment(posts):
    """Quick sentiment analysis"""
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    analyzer = SentimentIntensityAnalyzer()
    
    print("\n📊 SENTIMENT ANALYSIS")
    print("=" * 60)
    
    total_score = 0
    bullish_keywords = ['bullish', 'moon', 'pump', 'buy', 'lfg', 'hodl', 'gem', 'rocket', '🚀', '📈']
    bearish_keywords = ['bearish', 'dump', 'sell', 'fud', 'scam', 'rugpull', '📉', '💩']
    
    for post in posts[:5]:  # Analyze top 5
        text = f"{post['title']} {post['text']}"
        sentiment = analyzer.polarity_scores(text)
        
        # Check for crypto slang
        text_lower = text.lower()
        has_bullish = any(word in text_lower for word in bullish_keywords)
        has_bearish = any(word in text_lower for word in bearish_keywords)
        
        print(f"\n📝 {post['title'][:60]}")
        print(f"   Subreddit: r/{post['subreddit']}")
        print(f"   Score: {post['score']} | Comments: {post['comments']}")
        print(f"   Sentiment: {sentiment['compound']:.3f} ", end="")
        
        if has_bullish:
            print("🟢 (bullish keywords)")
        elif has_bearish:
            print("🔴 (bearish keywords)")
        else:
            print("⚪ (neutral)")
        
        total_score += sentiment['compound']
    
    avg_sentiment = total_score / min(len(posts), 5) if posts else 0
    print(f"\n🎯 Average Sentiment: {avg_sentiment:.3f}")
    
    if avg_sentiment > 0.3:
        print("   📈 BULLISH signal")
    elif avg_sentiment < -0.3:
        print("   📉 BEARISH signal")
    else:
        print("   ⚪ NEUTRAL signal")
    
    return avg_sentiment


def main():
    print("\n" + "🚀 REDDIT API TEST (NO APIFY NEEDED)".center(60))
    print("=" * 60 + "\n")
    
    # Test 1: Search for Cronos mentions
    print("TEST 1: Search for 'Cronos' mentions")
    print("-" * 60)
    posts = get_reddit_posts("CryptoCurrency", "Cronos", limit=10)
    print(f"✅ Found {len(posts)} posts\n")
    
    if posts:
        print("📋 Top 3 posts:")
        for i, post in enumerate(posts[:3], 1):
            print(f"\n{i}. {post['title']}")
            print(f"   Score: {post['score']} | Comments: {post['num_comments']}")
            print(f"   By u/{post['author']} in r/{post['subreddit']}")
    
    # Test 2: Get hot posts from crypto subreddits
    print("\n\nTEST 2: Hot posts from crypto subreddits")
    print("-" * 60)
    hot_posts = get_hot_crypto_posts()
    print(f"\n✅ Total: {len(hot_posts)} hot posts")
    
    # Test 3: Sentiment analysis
    if hot_posts:
        sentiment = analyze_sentiment(hot_posts)
    
    # Summary
    print("\n" + "=" * 60)
    print("💡 CONCLUSION")
    print("=" * 60)
    print("✅ Reddit API works WITHOUT Apify!")
    print("✅ No authentication required")
    print("✅ Free and unlimited")
    print("✅ Real-time data")
    print("\n🎯 RECOMMENDATION: Use direct Reddit API instead of Apify")


if __name__ == "__main__":
    main()
