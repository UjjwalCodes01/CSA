"""
Real Sentiment Sources - No API Keys Required
- CryptoPanic RSS feed (free, no authentication)
- Google News scraping (free)
- Gemini AI analysis for sentiment scoring
"""

import os
import requests
import feedparser
from typing import Dict, List
from datetime import datetime
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()


class RealSentimentAnalyzer:
    """Analyze real-time sentiment from free news sources"""
    
    def __init__(self):
        self.cryptopanic_rss = "https://cryptopanic.com/news/rss/"
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.gemini_model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    def get_cryptopanic_news(self, filter_keywords=None) -> List[Dict]:
        """
        Scrape CryptoPanic RSS feed
        Free, no authentication required
        """
        if filter_keywords is None:
            filter_keywords = ["CRO", "Cronos", "Crypto.com"]
        
        try:
            print(f"   Fetching CryptoPanic RSS feed...")
            feed = feedparser.parse(self.cryptopanic_rss)
            
            articles = []
            for entry in feed.entries[:20]:  # Get latest 20
                title = entry.get('title', '')
                
                # Filter for relevant keywords
                if any(keyword.lower() in title.lower() for keyword in filter_keywords):
                    articles.append({
                        'title': title,
                        'link': entry.get('link', ''),
                        'published': entry.get('published', ''),
                        'source': 'CryptoPanic'
                    })
            
            print(f"   ✓ CryptoPanic: Found {len(articles)} relevant articles")
            return articles
            
        except Exception as e:
            print(f"   ✗ CryptoPanic error: {e}")
            return []
    
    def get_google_news_headlines(self, query="CRO Cronos crypto") -> List[Dict]:
        """
        Scrape Google News RSS feed
        Free, no authentication required
        """
        try:
            # Google News RSS endpoint with URL encoding
            from urllib.parse import quote_plus
            encoded_query = quote_plus(query)
            news_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"
            
            print(f"   Fetching Google News for '{query}'...")
            feed = feedparser.parse(news_url)
            
            articles = []
            for entry in feed.entries[:15]:  # Get latest 15
                articles.append({
                    'title': entry.get('title', ''),
                    'link': entry.get('link', ''),
                    'published': entry.get('published', ''),
                    'source': 'Google News'
                })
            
            print(f"   ✓ Google News: Found {len(articles)} articles")
            return articles
            
        except Exception as e:
            print(f"   ✗ Google News error: {e}")
            return []
    
    def analyze_headlines_with_gemini(self, articles: List[Dict]) -> Dict:
        """
        Use Gemini AI to analyze sentiment from headlines
        Returns structured sentiment score (-1 to 1)
        """
        if not articles:
            return {
                "sentiment_score": 0,
                "confidence": 0,
                "reasoning": "No articles to analyze"
            }
        
        # Prepare headlines for analysis
        headlines = [f"- {article['title']}" for article in articles[:10]]
        headlines_text = "\n".join(headlines)
        
        prompt = f"""Analyze the market sentiment for CRO/Cronos based on these recent news headlines:

{headlines_text}

Rate the overall sentiment on a scale from -1.0 to 1.0:
- -1.0 = Very Bearish (major negative news, hacks, crashes)
- -0.5 = Bearish (negative sentiment, concerns)
- 0.0 = Neutral (mixed or no clear direction)
- 0.5 = Bullish (positive sentiment, growth)
- 1.0 = Very Bullish (major partnerships, adoption, breakthroughs)

Consider:
- Project announcements (partnerships, upgrades)
- Market trends (price movements, volume)
- Regulatory news
- Technical developments
- Community sentiment

Respond in this exact format:
SENTIMENT_SCORE: [number between -1.0 and 1.0]
CONFIDENCE: [low/medium/high]
REASONING: [one sentence explanation]"""

        try:
            print(f"   Analyzing {len(headlines)} headlines with Gemini...")
            response = self.gemini_model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Parse response
            lines = response_text.split('\n')
            sentiment_score = 0.0
            confidence = "low"
            reasoning = "Unable to parse response"
            
            for line in lines:
                if line.startswith("SENTIMENT_SCORE:"):
                    try:
                        sentiment_score = float(line.split(':')[1].strip())
                        # Clamp to -1 to 1 range
                        sentiment_score = max(-1.0, min(1.0, sentiment_score))
                    except:
                        pass
                elif line.startswith("CONFIDENCE:"):
                    confidence = line.split(':')[1].strip().lower()
                elif line.startswith("REASONING:"):
                    reasoning = line.split(':', 1)[1].strip()
            
            print(f"   ✓ Gemini Analysis: {sentiment_score:.2f} ({confidence} confidence)")
            
            return {
                "sentiment_score": sentiment_score,
                "confidence": confidence,
                "reasoning": reasoning,
                "articles_analyzed": len(headlines)
            }
            
        except Exception as e:
            print(f"   ✗ Gemini analysis error: {e}")
            return {
                "sentiment_score": 0,
                "confidence": "low",
                "reasoning": f"Analysis failed: {str(e)[:50]}"
            }
    
    def get_aggregated_sentiment(self) -> Dict:
        """
        Aggregate sentiment from all real sources
        Returns comprehensive sentiment analysis
        """
        print("\n🔍 Real-Time Sentiment Analysis")
        print("=" * 60)
        
        # Collect articles from all sources
        all_articles = []
        
        # CryptoPanic
        cryptopanic_articles = self.get_cryptopanic_news()
        all_articles.extend(cryptopanic_articles)
        
        # Google News
        google_articles = self.get_google_news_headlines()
        all_articles.extend(google_articles)
        
        if not all_articles:
            print("   ⚠️  No articles found, returning neutral sentiment")
            return {
                "source": "real_news",
                "sentiment_score": 0,
                "confidence": "low",
                "reasoning": "No news articles available",
                "articles_count": 0,
                "timestamp": datetime.now().isoformat()
            }
        
        # Analyze with Gemini
        analysis = self.analyze_headlines_with_gemini(all_articles)
        
        return {
            "source": "real_news",
            "sentiment_score": analysis["sentiment_score"],
            "confidence": analysis["confidence"],
            "reasoning": analysis["reasoning"],
            "articles_count": len(all_articles),
            "cryptopanic_count": len(cryptopanic_articles),
            "google_news_count": len(google_articles),
            "sample_headlines": [a['title'] for a in all_articles[:3]],
            "timestamp": datetime.now().isoformat()
        }


def main():
    """Test the real sentiment analyzer"""
    analyzer = RealSentimentAnalyzer()
    
    print("🚀 Real Sentiment Analysis Test")
    print("=" * 60)
    print()
    
    result = analyzer.get_aggregated_sentiment()
    
    print()
    print("=" * 60)
    print("📊 RESULTS:")
    print(f"   Sentiment Score: {result['sentiment_score']:.2f}")
    print(f"   Confidence: {result['confidence'].upper()}")
    print(f"   Articles Analyzed: {result['articles_count']}")
    print(f"   - CryptoPanic: {result.get('cryptopanic_count', 0)}")
    print(f"   - Google News: {result.get('google_news_count', 0)}")
    print(f"   Reasoning: {result['reasoning']}")
    print()
    print("📰 Sample Headlines:")
    for i, headline in enumerate(result.get('sample_headlines', []), 1):
        print(f"   {i}. {headline}")
    print("=" * 60)


if __name__ == "__main__":
    main()
