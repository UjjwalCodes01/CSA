"""
Twitter Sentiment Monitor - 24/7 Social Signal Detection
Uses Apify to scrape Twitter and analyze sentiment
"""
import os
import time
from typing import Dict, List
from datetime import datetime, timedelta
from apify_client import ApifyClient
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from dotenv import load_dotenv
import json

load_dotenv()

# Initialize Apify
apify_token = os.getenv("APIFY_API_TOKEN")
if not apify_token or apify_token == "your-apify-token-here":
    print("WARNING: APIFY_API_TOKEN not set in .env")
    print("   Get your token from: https://console.apify.com/account/integrations")
    apify_client = None
else:
    apify_client = ApifyClient(apify_token)

# Initialize sentiment analyzer
sentiment_analyzer = SentimentIntensityAnalyzer()


class SocialSignalMonitor:
    """24/7 Twitter monitoring for trading signals"""
    
    def __init__(self):
        self.keywords = os.getenv("MONITOR_KEYWORDS", "CRO,Cronos").split(",")
        self.accounts = os.getenv("MONITOR_ACCOUNTS", "").split(",")
        self.signal_history = []
        self.last_check = datetime.now()
        
    def scrape_twitter_mentions(self, query: str, max_tweets: int = 100) -> List[Dict]:
        """
        Scrape Twitter using Apify's Twitter Scraper
        
        Args:
            query: Search query (e.g., "$CRO OR Cronos")
            max_tweets: Max tweets to fetch
            
        Returns:
            List of tweet data dictionaries
        """
        if not apify_client:
            print("WARNING: Apify client not initialized. Using mock data for testing.")
            return self._generate_mock_tweets()
        
        try:
            # Apify Twitter Scraper Actor
            run_input = {
                "searchTerms": [query],
                "maxTweets": max_tweets,
                "includeSearchTerms": True,
                "addUserInfo": True,
                "language": "en",
                "tweetsDesired": max_tweets,
            }
            
            print(f"🔄 Running Apify Twitter Scraper...")
            
            # Run the Actor and wait for it to finish
            # Try multiple actor options in case one is not available
            actor_options = [
                "apify/tweet-scraper",
                "apify/twitter-scraper", 
                "clockworks/free-twitter-scraper"
            ]
            
            run = None
            last_error = None
            for actor_name in actor_options:
                try:
                    run = apify_client.actor(actor_name).call(run_input=run_input)
                    print(f"   ✓ Successfully using actor: {actor_name}")
                    break
                except Exception as e:
                    last_error = e
                    continue
            
            if run is None:
                raise Exception(f"No working actor found. Last error: {last_error}")
            
            # Fetch results from the dataset
            tweets = []
            for item in apify_client.dataset(run["defaultDatasetId"]).iterate_items():
                tweets.append({
                    "text": item.get("text", ""),
                    "author": item.get("author", {}).get("userName", "unknown"),
                    "followers": item.get("author", {}).get("followers", 0),
                    "likes": item.get("likeCount", 0),
                    "retweets": item.get("retweetCount", 0),
                    "timestamp": item.get("createdAt", datetime.now().isoformat()),
                    "url": item.get("url", ""),
                })
            
            return tweets
            
        except Exception as e:
            print(f"❌ Twitter scraping error: {e}")
            print("   Using mock data for testing...")
            return self._generate_mock_tweets()
    
    def _generate_mock_tweets(self) -> List[Dict]:
        """Generate mock tweets for testing when Apify is not available"""
        import random
        
        mock_texts = [
            "CRO is looking bullish! Major adoption coming 🚀",
            "Cronos network expanding rapidly. Long term hold for sure.",
            "$CRO breaking resistance levels. Time to accumulate?",
            "VVS Finance new pools are fire 🔥 APY looking good",
            "Crypto.com Chain upgrade is impressive. Bullish on CRO",
            "Not sure about CRO short term, but fundamentals are solid",
            "Taking profits on CRO here. Might re-enter lower.",
            "Cronos ecosystem growing fast. DeFi summer 2.0?",
            "$CRO consolidating nicely. Good entry point here.",
            "Watching CRO closely. Volume increasing significantly.",
        ]
        
        tweets = []
        for i in range(30):
            tweets.append({
                "text": random.choice(mock_texts),
                "author": f"user{i}",
                "followers": random.randint(100, 50000),
                "likes": random.randint(5, 200),
                "retweets": random.randint(2, 50),
                "timestamp": datetime.now().isoformat(),
                "url": f"https://twitter.com/mock/status/{i}",
            })
        
        return tweets
    
    def analyze_sentiment(self, text: str) -> Dict:
        """
        Analyze sentiment of a tweet using VADER
        
        Returns:
            {'compound': -1.0 to 1.0, 'label': 'bullish'/'bearish'/'neutral'}
        """
        scores = sentiment_analyzer.polarity_scores(text)
        compound = scores['compound']
        
        if compound >= 0.05:
            label = "bullish"
        elif compound <= -0.05:
            label = "bearish"
        else:
            label = "neutral"
        
        return {
            "compound": compound,
            "label": label,
            "pos": scores['pos'],
            "neg": scores['neg'],
            "neu": scores['neu']
        }
    
    def detect_volume_spike(self, tweets: List[Dict], timeframe_minutes: int = 10) -> bool:
        """
        Detect if there's a volume spike (many tweets in short time)
        
        Args:
            tweets: List of tweets
            timeframe_minutes: Time window to check
            
        Returns:
            True if spike detected
        """
        if not tweets:
            return False
        
        try:
            now = datetime.now()
            recent_count = 0
            
            for t in tweets:
                try:
                    tweet_time = datetime.fromisoformat(t['timestamp'].replace('Z', '+00:00'))
                    if (now - tweet_time).seconds < timeframe_minutes * 60:
                        recent_count += 1
                except:
                    recent_count += 1  # Count if timestamp parsing fails
            
            threshold = int(os.getenv("VOLUME_SPIKE_THRESHOLD", "500"))
            return recent_count > threshold
        except:
            return False
    
    def calculate_signal_strength(self, tweets: List[Dict]) -> Dict:
        """
        Calculate trading signal strength based on:
        - Average sentiment
        - Volume (number of tweets)
        - Influence (follower count, likes, retweets)
        
        Returns:
            Signal dictionary with recommendation
        """
        if not tweets:
            return {"signal": "none", "strength": 0, "reason": "No data"}
        
        # Calculate weighted sentiment (weighted by follower count)
        total_sentiment = 0
        total_weight = 0
        
        bullish_count = 0
        bearish_count = 0
        
        for tweet in tweets:
            sentiment = self.analyze_sentiment(tweet['text'])
            weight = max(1, tweet['followers'] / 1000)  # Weight by followers (in thousands)
            
            total_sentiment += sentiment['compound'] * weight
            total_weight += weight
            
            if sentiment['label'] == "bullish":
                bullish_count += 1
            elif sentiment['label'] == "bearish":
                bearish_count += 1
        
        avg_sentiment = total_sentiment / total_weight if total_weight > 0 else 0
        
        # Calculate influence score (likes + retweets)
        total_engagement = sum(t['likes'] + t['retweets'] for t in tweets)
        avg_engagement = total_engagement / len(tweets)
        
        # Determine signal
        bullish_threshold = float(os.getenv("BULLISH_THRESHOLD", "0.6"))
        bearish_threshold = float(os.getenv("BEARISH_THRESHOLD", "-0.4"))
        
        if avg_sentiment > bullish_threshold and bullish_count > bearish_count * 2:
            signal = "strong_buy"
            strength = min(1.0, avg_sentiment * 1.5)
        elif avg_sentiment > 0.2:
            signal = "weak_buy"
            strength = avg_sentiment
        elif avg_sentiment < bearish_threshold and bearish_count > bullish_count * 2:
            signal = "strong_sell"
            strength = abs(avg_sentiment)
        elif avg_sentiment < -0.1:
            signal = "weak_sell"
            strength = abs(avg_sentiment)
        else:
            signal = "hold"
            strength = 0
        
        volume_spike = self.detect_volume_spike(tweets)
        
        return {
            "signal": signal,
            "strength": round(strength, 3),
            "avg_sentiment": round(avg_sentiment, 3),
            "bullish_tweets": bullish_count,
            "bearish_tweets": bearish_count,
            "total_tweets": len(tweets),
            "avg_engagement": round(avg_engagement, 1),
            "volume_spike": volume_spike,
            "timestamp": datetime.now().isoformat(),
            "reason": self._generate_reason(signal, avg_sentiment, bullish_count, bearish_count, volume_spike)
        }
    
    def _generate_reason(self, signal, sentiment, bullish, bearish, spike):
        """Generate human-readable reason for signal"""
        reasons = []
        
        if spike:
            reasons.append("🔥 VOLUME SPIKE detected")
        
        if signal == "strong_buy":
            reasons.append(f"📈 Strong bullish sentiment ({sentiment:.2f})")
            reasons.append(f"✅ {bullish} bullish vs {bearish} bearish tweets")
        elif signal == "weak_buy":
            reasons.append(f"📊 Moderate bullish sentiment ({sentiment:.2f})")
        elif signal == "strong_sell":
            reasons.append(f"📉 Strong bearish sentiment ({sentiment:.2f})")
            reasons.append(f"❌ {bearish} bearish vs {bullish} bullish tweets")
        elif signal == "weak_sell":
            reasons.append(f"📊 Moderate bearish sentiment ({sentiment:.2f})")
        else:
            reasons.append("😐 Neutral sentiment, no clear direction")
        
        return " | ".join(reasons)
    
    def run_monitoring_cycle(self) -> Dict:
        """
        Run one monitoring cycle (check Twitter, analyze, generate signal)
        This should be called every 5-10 minutes
        
        Returns:
            Signal data dictionary
        """
        print(f"\n🔍 Running monitoring cycle at {datetime.now().strftime('%H:%M:%S')}")
        
        # Build search query
        query = " OR ".join(self.keywords)
        print(f"📡 Searching: {query}")
        
        # Scrape Twitter
        tweets = self.scrape_twitter_mentions(query, max_tweets=200)
        print(f"📊 Found {len(tweets)} tweets")
        
        if not tweets:
            return {
                "signal": "none",
                "reason": "No tweets found",
                "timestamp": datetime.now().isoformat()
            }
        
        # Analyze signal
        signal_data = self.calculate_signal_strength(tweets)
        
        # Store in history
        self.signal_history.append(signal_data)
        if len(self.signal_history) > 100:  # Keep last 100 signals
            self.signal_history.pop(0)
        
        # Print summary
        print(f"\n{'='*60}")
        print(f"🎯 SIGNAL: {signal_data['signal'].upper()}")
        print(f"💪 Strength: {signal_data['strength']}")
        print(f"📈 Sentiment: {signal_data['avg_sentiment']}")
        print(f"📊 Bullish: {signal_data['bullish_tweets']} | Bearish: {signal_data['bearish_tweets']}")
        print(f"💬 Total: {signal_data['total_tweets']} tweets")
        print(f"🔥 Volume Spike: {'YES' if signal_data['volume_spike'] else 'NO'}")
        print(f"📝 Reason: {signal_data['reason']}")
        print(f"{'='*60}\n")
        
        return signal_data


# Initialize monitor
monitor = SocialSignalMonitor()


def get_latest_signal() -> Dict:
    """Get the most recent trading signal"""
    if not monitor.signal_history:
        # Run first cycle if no history
        return monitor.run_monitoring_cycle()
    return monitor.signal_history[-1]


def get_signal_trend(lookback: int = 10) -> str:
    """Analyze trend over last N signals"""
    if len(monitor.signal_history) < lookback:
        return "insufficient_data"
    
    recent = monitor.signal_history[-lookback:]
    buy_signals = sum(1 for s in recent if 'buy' in s['signal'])
    sell_signals = sum(1 for s in recent if 'sell' in s['signal'])
    
    if buy_signals > sell_signals * 1.5:
        return "strengthening_bullish"
    elif sell_signals > buy_signals * 1.5:
        return "strengthening_bearish"
    else:
        return "mixed"


if __name__ == "__main__":
    print("🚀 Starting Twitter Sentiment Monitor Test")
    print("="*60)
    
    # Run one cycle
    signal = monitor.run_monitoring_cycle()
    
    print("\n📋 Signal Summary:")
    print(json.dumps(signal, indent=2))
