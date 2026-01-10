"""
Multi-Source Sentiment Aggregator
Aggregates sentiment from:
- CoinGecko trending/sentiment data
- Reddit mentions (via free Reddit API)
- Price action analysis
- REAL NEWS SENTIMENT (CryptoPanic + Google News + Gemini AI)
"""

import os
import sys
import requests
from typing import Dict, List
from datetime import datetime
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from dotenv import load_dotenv

# Handle imports for both direct run and module import
try:
    from .real_sentiment import RealSentimentAnalyzer
except ImportError:
    from real_sentiment import RealSentimentAnalyzer

load_dotenv()


class SentimentAggregator:
    """Aggregate sentiment from multiple crypto data sources"""
    
    def __init__(self):
        self.analyzer = SentimentIntensityAnalyzer()
        self.coingecko_api = "https://api.coingecko.com/api/v3"
        self.real_sentiment = RealSentimentAnalyzer()  # NEW: Real news sentiment
        self.reddit_headers = {"User-Agent": "CronosSentinel/1.0 (Autonomous Trading Bot)"}
    
    def get_coingecko_sentiment(self, coin_id: str = "crypto-com-chain") -> Dict:
        """Get sentiment data from CoinGecko"""
        try:
            # Get coin data
            response = requests.get(
                f"{self.coingecko_api}/coins/{coin_id}",
                params={"localization": "false", "tickers": "false", "community_data": "true", "developer_data": "false"}
            )
            data = response.json()
            
            # Extract sentiment indicators
            sentiment_votes_up = data.get("sentiment_votes_up_percentage", 50)
            sentiment_votes_down = data.get("sentiment_votes_down_percentage", 50)
            
            # Community data
            community = data.get("community_data", {})
            reddit_subscribers = community.get("reddit_subscribers", 0)
            
            # Calculate sentiment score (-1 to 1)
            sentiment_score = (sentiment_votes_up - 50) / 50  # Normalize to -1 to 1
            
            return {
                "source": "coingecko",
                "sentiment_score": sentiment_score,
                "sentiment_votes_up": sentiment_votes_up,
                "sentiment_votes_down": sentiment_votes_down,
                "reddit_subscribers": reddit_subscribers,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"CoinGecko error: {e}")
            return None
    
    def get_trending_status(self, coin_id: str = "crypto-com-chain") -> Dict:
        """Check if coin is trending"""
        try:
            response = requests.get(f"{self.coingecko_api}/search/trending")
            trending = response.json()
            
            # Check if our coin is in trending
            trending_coins = trending.get("coins", [])
            is_trending = any(
                coin.get("item", {}).get("id") == coin_id 
                for coin in trending_coins
            )
            
            return {
                "source": "trending",
                "is_trending": is_trending,
                "trending_coins_count": len(trending_coins),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Trending check error: {e}")
            return None
    
    def get_reddit_sentiment(self, query: str = "Cronos CRO") -> Dict:
        """Get sentiment from Reddit (FREE API, no auth needed)"""
        try:
            subreddits = ["CryptoCurrency", "CronosOfficial", "Crypto_com"]
            all_posts = []
            
            for subreddit in subreddits:
                try:
                    url = f"https://www.reddit.com/r/{subreddit}/search.json"
                    params = {"q": query, "limit": 10, "sort": "new", "restrict_sr": "true"}
                    response = requests.get(url, params=params, headers=self.reddit_headers, timeout=10)
                    
                    if response.status_code == 200:
                        data = response.json()
                        for child in data['data']['children']:
                            post = child['data']
                            all_posts.append({
                                "title": post.get('title', ''),
                                "text": post.get('selftext', ''),
                                "score": post.get('score', 0),
                                "upvote_ratio": post.get('upvote_ratio', 0),
                                "num_comments": post.get('num_comments', 0)
                            })
                except:
                    continue
            
            if not all_posts:
                return None
            
            # Analyze sentiment with crypto slang
            bullish_keywords = ['bullish', 'moon', 'pump', 'buy', 'lfg', 'hodl', 'gem', 'rocket', '🚀', '📈']
            bearish_keywords = ['bearish', 'dump', 'sell', 'fud', 'scam', 'rugpull', '📉', '💩']
            
            total_sentiment = 0
            analyzed_count = 0
            
            for post in all_posts[:10]:  # Top 10 posts
                text = f"{post['title']} {post['text']}".lower()
                sentiment = self.analyzer.polarity_scores(text)
                
                # Boost for crypto slang
                has_bullish = any(word in text for word in bullish_keywords)
                has_bearish = any(word in text for word in bearish_keywords)
                
                score = sentiment['compound']
                if has_bullish:
                    score = min(score + 0.3, 1.0)
                if has_bearish:
                    score = max(score - 0.3, -1.0)
                
                # Weight by upvote ratio and score
                weight = post['upvote_ratio'] * (1 + min(post['score'] / 100, 2))
                total_sentiment += score * weight
                analyzed_count += weight
            
            sentiment_score = total_sentiment / analyzed_count if analyzed_count > 0 else 0
            
            return {
                "source": "reddit",
                "sentiment_score": sentiment_score,
                "posts_analyzed": len(all_posts),
                "subreddits": subreddits,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Reddit error: {e}")
            return None
    
    def aggregate_sentiment(self, coin_id: str = "crypto-com-chain") -> Dict:
        """Aggregate sentiment from all sources"""
        
        print(f"🔍 Aggregating sentiment for {coin_id}...")
        
        sources = []
        
        # REAL NEWS SENTIMENT (CryptoPanic + Google News + Gemini AI)
        try:
            real_news = self.real_sentiment.get_aggregated_sentiment()
            if real_news and real_news.get('sentiment_score') != 0:
                sources.append(real_news)
                print(f"   ✓ Real News: {real_news['sentiment_score']:.2f} ({real_news['articles_count']} articles)")
        except Exception as e:
            print(f"   ⚠️  Real News unavailable: {e}")
        
        # Reddit sentiment
        try:
            reddit = self.get_reddit_sentiment("Cronos CRO")
            if reddit and reddit.get('sentiment_score') != 0:
                sources.append(reddit)
                print(f"   ✓ Reddit: {reddit['sentiment_score']:.2f} ({reddit['posts_analyzed']} posts)")
        except Exception as e:
            print(f"   ⚠️  Reddit unavailable: {e}")
        
        # Collect from all sources
        coingecko = self.get_coingecko_sentiment(coin_id)
        if coingecko:
            sources.append(coingecko)
            print(f"   ✓ CoinGecko: {coingecko['sentiment_score']:.2f}")
        
        trending = self.get_trending_status(coin_id)
        if trending:
            print(f"   ✓ Trending: {trending['is_trending']}")
        
        # Calculate weighted average
        if not sources:
            return {
                "signal": "hold",
                "strength": 0,
                "avg_sentiment": 0,
                "sources": [],
                "reason": "No data available"
            }
        
        total_score = sum(s.get("sentiment_score", 0) for s in sources)
        avg_score = total_score / len(sources)
        
        # Generate signal
        signal, strength = self._score_to_signal(avg_score, trending)
        
        return {
            "signal": signal,
            "strength": strength,
            "avg_sentiment": avg_score,
            "sources": sources,
            "is_trending": trending.get("is_trending", False) if trending else False,
            "timestamp": datetime.now().isoformat(),
            "reason": self._generate_reason(signal, avg_score, trending)
        }
    
    def _score_to_signal(self, score: float, trending: Dict) -> tuple:
        """Convert sentiment score to trading signal"""
        
        # Boost strength if trending
        boost = 1.5 if trending and trending.get("is_trending") else 1.0
        
        if score > 0.6:
            return "strong_buy", int(3 * boost)
        elif score > 0.3:
            return "weak_buy", int(2 * boost)
        elif score < -0.6:
            return "strong_sell", int(-3 * boost)
        elif score < -0.3:
            return "weak_sell", int(-2 * boost)
        else:
            return "hold", 0
    
    def _generate_reason(self, signal: str, score: float, trending: Dict) -> str:
        """Generate human-readable reason for signal"""
        
        reasons = []
        
        if trending and trending.get("is_trending"):
            reasons.append("TRENDING on CoinGecko")
        
        if score > 0.6:
            reasons.append("Strong bullish sentiment")
        elif score > 0.3:
            reasons.append("Moderate bullish sentiment")
        elif score < -0.6:
            reasons.append("Strong bearish sentiment")
        elif score < -0.3:
            reasons.append("Moderate bearish sentiment")
        else:
            reasons.append("Neutral sentiment")
        
        return " | ".join(reasons) if reasons else "No clear signal"


def main():
    """Test the aggregator"""
    aggregator = SentimentAggregator()
    
    print("🚀 Multi-Source Sentiment Aggregator Test")
    print("=" * 60)
    print()
    
    result = aggregator.aggregate_sentiment("crypto-com-chain")
    
    print()
    print("=" * 60)
    print(f"🎯 SIGNAL: {result['signal'].upper()}")
    print(f"💪 Strength: {result['strength']}")
    print(f"📈 Sentiment: {result['avg_sentiment']:.3f}")
    print(f"🔥 Trending: {'YES' if result.get('is_trending') else 'NO'}")
    print(f"📊 Volume Spike: {'YES' if result.get('volume_spike') else 'NO'}")
    print(f"📝 Reason: {result['reason']}")
    print("=" * 60)


if __name__ == "__main__":
    main()
