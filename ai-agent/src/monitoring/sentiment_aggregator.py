"""
Multi-Source Sentiment Aggregator
Since Twitter API is restricted, this aggregates sentiment from multiple sources:
- CoinGecko trending/sentiment data
- Reddit mentions (via Apify Reddit scraper)
- News headlines
- On-chain metrics
"""

import os
import requests
from typing import Dict, List
from datetime import datetime
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from dotenv import load_dotenv

load_dotenv()


class SentimentAggregator:
    """Aggregate sentiment from multiple crypto data sources"""
    
    def __init__(self):
        self.analyzer = SentimentIntensityAnalyzer()
        self.coingecko_api = "https://api.coingecko.com/api/v3"
    
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
            twitter_followers = community.get("twitter_followers", 0)
            reddit_subscribers = community.get("reddit_subscribers", 0)
            
            # Calculate sentiment score (-1 to 1)
            sentiment_score = (sentiment_votes_up - 50) / 50  # Normalize to -1 to 1
            
            return {
                "source": "coingecko",
                "sentiment_score": sentiment_score,
                "sentiment_up": sentiment_votes_up,
                "sentiment_down": sentiment_votes_down,
                "twitter_followers": twitter_followers,
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
    
    def analyze_price_action(self, coin_id: str = "crypto-com-chain") -> Dict:
        """Analyze recent price action as sentiment indicator"""
        try:
            # Get market data
            response = requests.get(
                f"{self.coingecko_api}/coins/{coin_id}/market_chart",
                params={"vs_currency": "usd", "days": "1", "interval": "hourly"}
            )
            data = response.json()
            
            prices = [p[1] for p in data.get("prices", [])]
            volumes = [v[1] for v in data.get("total_volumes", [])]
            
            if len(prices) < 2:
                return None
            
            # Calculate momentum indicators
            price_change_24h = ((prices[-1] - prices[0]) / prices[0]) * 100
            recent_change = ((prices[-1] - prices[-6]) / prices[-6]) * 100  # Last 6 hours
            
            avg_volume = sum(volumes) / len(volumes)
            recent_volume = volumes[-1]
            volume_spike = (recent_volume / avg_volume) > 1.5
            
            # Sentiment from price action
            if price_change_24h > 5:
                sentiment = "strong_bullish"
                score = 0.8
            elif price_change_24h > 2:
                sentiment = "bullish"
                score = 0.5
            elif price_change_24h < -5:
                sentiment = "strong_bearish"
                score = -0.8
            elif price_change_24h < -2:
                sentiment = "bearish"
                score = -0.5
            else:
                sentiment = "neutral"
                score = price_change_24h / 10  # Scale to -1 to 1
            
            return {
                "source": "price_action",
                "sentiment": sentiment,
                "sentiment_score": score,
                "price_change_24h": price_change_24h,
                "recent_change_6h": recent_change,
                "volume_spike": volume_spike,
                "current_price": prices[-1],
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Price action error: {e}")
            return None
    
    def aggregate_sentiment(self, coin_id: str = "crypto-com-chain") -> Dict:
        """Aggregate sentiment from all sources"""
        
        print(f"🔍 Aggregating sentiment for {coin_id}...")
        
        sources = []
        
        # Collect from all sources
        coingecko = self.get_coingecko_sentiment(coin_id)
        if coingecko:
            sources.append(coingecko)
            print(f"   ✓ CoinGecko: {coingecko['sentiment_score']:.2f}")
        
        trending = self.get_trending_status(coin_id)
        if trending:
            print(f"   ✓ Trending: {trending['is_trending']}")
        
        price_action = self.analyze_price_action(coin_id)
        if price_action:
            sources.append(price_action)
            print(f"   ✓ Price Action: {price_action['sentiment_score']:.2f}")
        
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
            "volume_spike": price_action.get("volume_spike", False) if price_action else False,
            "timestamp": datetime.now().isoformat(),
            "reason": self._generate_reason(signal, avg_score, trending, price_action)
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
    
    def _generate_reason(self, signal: str, score: float, trending: Dict, price_action: Dict) -> str:
        """Generate human-readable reason for signal"""
        
        reasons = []
        
        if trending and trending.get("is_trending"):
            reasons.append("TRENDING on CoinGecko")
        
        if price_action:
            price_change = price_action.get("price_change_24h", 0)
            if abs(price_change) > 5:
                reasons.append(f"Strong price movement: {price_change:+.1f}%")
            
            if price_action.get("volume_spike"):
                reasons.append("Volume spike detected")
        
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
