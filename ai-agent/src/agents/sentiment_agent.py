"""
Sentiment Agent - Twitter Sentiment Analysis Tools
Day 11-13: Analyze social sentiment for crypto tokens
"""
from crypto_com_agent_client import tool
from typing import Dict, Any
import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Configuration
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")
DEMO_MODE = os.getenv("TWITTER_DEMO_MODE", "false").lower() == "true"

# Mock sentiment data with realistic variation
MOCK_SENTIMENT_DATA = {
    "CRO": {
        "score": 72,
        "sentiment": "Bullish",
        "trending": True,
        "volume": 1847,
        "positive": 1245,
        "negative": 312,
        "neutral": 290,
        "top_keywords": ["cronos", "defi", "bullish", "ecosystem"],
        "confidence": 82
    },
    "BTC": {
        "score": 58,
        "sentiment": "Slightly Bullish",
        "trending": False,
        "volume": 12453,
        "positive": 6800,
        "negative": 3200,
        "neutral": 2453,
        "top_keywords": ["bitcoin", "hodl", "halving", "etf"],
        "confidence": 91
    },
    "ETH": {
        "score": 76,
        "sentiment": "Bullish",
        "trending": True,
        "volume": 8234,
        "positive": 5800,
        "negative": 1100,
        "neutral": 1334,
        "top_keywords": ["ethereum", "defi", "staking", "upgrade"],
        "confidence": 87
    },
    "USDC": {
        "score": 50,
        "sentiment": "Neutral",
        "trending": False,
        "volume": 523,
        "positive": 200,
        "negative": 50,
        "neutral": 273,
        "top_keywords": ["stablecoin", "usdc", "liquidity"],
        "confidence": 93
    }
}

# Weighted sentiment keywords (weight, keyword)
POSITIVE_KEYWORDS = {
    # Strong positive (3x weight)
    "moon": 3, "rocket": 3, "bullish": 3, "breakout": 3, "surge": 3,
    # Medium positive (2x weight)
    "rally": 2, "pump": 2, "gains": 2, "profit": 2, "up": 2, "green": 2,
    # Mild positive (1x weight)
    "buy": 1, "long": 1, "hodl": 1, "support": 1, "accumulate": 1, "strong": 1
}

NEGATIVE_KEYWORDS = {
    # Strong negative (3x weight)
    "crash": 3, "dump": 3, "panic": 3, "blood": 3, "disaster": 3,
    # Medium negative (2x weight)
    "bearish": 2, "fall": 2, "decline": 2, "drop": 2, "red": 2, "loss": 2,
    # Mild negative (1x weight)
    "sell": 1, "dip": 1, "down": 1, "weak": 1, "concern": 1, "fear": 1
}


def fetch_twitter_sentiment(symbol: str) -> Dict[str, Any]:
    """
    Fetch real Twitter sentiment using Twitter API v2
    """
    if not TWITTER_BEARER_TOKEN:
        return {"error": "Twitter API token not configured"}
    
    try:
        # Search query: recent tweets about the token
        query = f"${symbol} OR {symbol} crypto -is:retweet lang:en"
        url = "https://api.twitter.com/2/tweets/search/recent"
        
        params = {
            "query": query,
            "max_results": 10,
            "tweet.fields": "created_at,public_metrics"
        }
        
        headers = {
            "Authorization": f"Bearer {TWITTER_BEARER_TOKEN}"
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        if response.status_code == 429:
            return {"error": "Rate limit exceeded", "fallback": "mock"}
        
        if response.status_code != 200:
            return {"error": f"Twitter API error: {response.status_code}"}
        
        data = response.json()
        tweets = data.get("data", [])
        
        if not tweets:
            return {
                "score": 50,
                "sentiment": "Neutral",
                "volume": 0,
                "trending": False,
                "reason": "No recent tweets found"
            }
        
        # Analyze sentiment with weighted scoring
        positive_score = 0
        negative_score = 0
        neutral_count = 0
        
        for tweet in tweets:
            text = tweet.get("text", "").lower()
            
            # Calculate weighted scores
            tweet_pos = sum(weight for word, weight in POSITIVE_KEYWORDS.items() if word in text)
            tweet_neg = sum(weight for word, weight in NEGATIVE_KEYWORDS.items() if word in text)
            
            if tweet_pos > tweet_neg:
                positive_score += tweet_pos
            elif tweet_neg > tweet_pos:
                negative_score += tweet_neg
            else:
                neutral_count += 1
        
        total = len(tweets)
        
        # Normalize score to 0-100 range with volume weighting
        if positive_score + negative_score > 0:
            sentiment_ratio = (positive_score - negative_score) / (positive_score + negative_score)
            score = int((sentiment_ratio * 40) + 50)  # Map to 10-90 range
        else:
            score = 50  # Neutral if no keywords
        
        # Volume adjustment (more tweets = more confidence in score)
        if total < 5:
            score = int(score * 0.7 + 50 * 0.3)  # Pull toward neutral for low volume
        
        score = max(10, min(90, score))  # Clamp to 10-90 (avoid extremes)
        
        # Sentiment classification with tighter bands
        if score >= 70:
            sentiment = "Bullish"
        elif score >= 55:
            sentiment = "Slightly Bullish"
        elif score >= 45:
            sentiment = "Neutral"
        elif score >= 30:
            sentiment = "Slightly Bearish"
        else:
            sentiment = "Bearish"
        
        # Trending detection based on score + volume
        is_trending = (score > 65 and total >= 8) or (score > 75)
        
        # Confidence based on volume and keyword density
        keyword_density = (positive_score + negative_score) / total if total > 0 else 0
        confidence = min(95, int(50 + (total * 3) + (keyword_density * 10)))
        
        return {
            "score": score,
            "sentiment": sentiment,
            "trending": is_trending,
            "volume": total,
            "positive": int((positive_score / (positive_score + negative_score + 0.01)) * total),
            "negative": int((negative_score / (positive_score + negative_score + 0.01)) * total),
            "neutral": neutral_count,
            "confidence": confidence,
            "source": "Twitter API v2"
        }
        
    except requests.Timeout:
        return {"error": "Twitter API timeout", "fallback": "mock"}
    except Exception as e:
        return {"error": f"Twitter API error: {str(e)}", "fallback": "mock"}


@tool
def get_token_sentiment(symbol: str) -> Dict[str, Any]:
    """
    Get current social sentiment for a cryptocurrency token.
    Analyzes recent tweets to determine if sentiment is bullish, bearish, or neutral.
    
    Args:
        symbol (str): Token symbol (e.g., "CRO", "BTC", "ETH")
    
    Returns:
        dict: Sentiment score (0-100), sentiment label, volume, trending status
    
    Example:
        get_token_sentiment("CRO")
        Returns: {"score": 78, "sentiment": "Bullish", "trending": True, "volume": 1234}
    """
    symbol = symbol.upper()
    
    # Use mock data in demo mode or as fallback
    if DEMO_MODE or not TWITTER_BEARER_TOKEN:
        data = MOCK_SENTIMENT_DATA.get(symbol, MOCK_SENTIMENT_DATA["CRO"])
        data["source"] = "Mock Data (Demo Mode)"
        return data
    
    # Try real Twitter API
    result = fetch_twitter_sentiment(symbol)
    
    # Fallback to mock if API fails
    if "error" in result or "fallback" in result:
        data = MOCK_SENTIMENT_DATA.get(symbol, MOCK_SENTIMENT_DATA["CRO"])
        data["source"] = f"Mock Data (Fallback: {result.get('error', 'Unknown error')})"
        return data
    
    return result


@tool
def check_sentiment_condition(symbol: str, threshold: int) -> Dict[str, Any]:
    """
    Check if token sentiment meets a specific threshold.
    Useful for conditional trading: "only trade if sentiment > 70"
    
    Args:
        symbol (str): Token symbol
        threshold (int): Minimum sentiment score (0-100)
    
    Returns:
        dict: Whether condition is met, current score, recommendation
    
    Example:
        check_sentiment_condition("CRO", 70)
        Returns: {"condition_met": True, "score": 78, "recommendation": "Bullish sentiment detected"}
    """
    sentiment = get_token_sentiment.invoke({"symbol": symbol})
    
    if "error" in sentiment:
        return {
            "condition_met": False,
            "reason": "Failed to fetch sentiment",
            "recommendation": "Cannot verify sentiment condition"
        }
    
    score = sentiment["score"]
    condition_met = score >= threshold
    
    return {
        "condition_met": condition_met,
        "current_score": score,
        "threshold": threshold,
        "difference": score - threshold,
        "sentiment_label": sentiment["sentiment"],
        "recommendation": (
            f"✅ Sentiment condition MET: {score}/100 >= {threshold}"
            if condition_met
            else f"❌ Sentiment condition NOT MET: {score}/100 < {threshold}"
        ),
        "trading_advice": (
            "Favorable conditions for trading" if condition_met
            else "Wait for better sentiment before trading"
        )
    }


@tool
def get_trending_tokens() -> Dict[str, Any]:
    """
    Get list of trending cryptocurrency tokens based on social sentiment.
    Shows which tokens have high positive sentiment and are being discussed.
    
    Returns:
        dict: List of trending tokens with scores and reasons
    
    Example:
        get_trending_tokens()
        Returns: {"trending": ["CRO", "ETH"], "scores": {...}, "recommendations": [...]}
    """
    trending = []
    scores = {}
    
    # Check sentiment for major tokens
    tokens = ["CRO", "BTC", "ETH", "USDC"]
    
    for token in tokens:
        sentiment = get_token_sentiment.invoke({"symbol": token})
        
        if "error" not in sentiment:
            scores[token] = sentiment["score"]
            
            if sentiment.get("trending", False) or sentiment["score"] > 70:
                trending.append({
                    "symbol": token,
                    "score": sentiment["score"],
                    "sentiment": sentiment["sentiment"],
                    "volume": sentiment.get("volume", 0)
                })
    
    # Sort by score
    trending.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "trending_count": len(trending),
        "trending_tokens": trending,
        "all_scores": scores,
        "recommendation": (
            f"Top trending: {trending[0]['symbol']} with {trending[0]['score']}/100 sentiment"
            if trending
            else "No tokens currently trending"
        ),
        "market_mood": "Bullish" if len(trending) >= 2 else "Mixed"
    }


@tool
def analyze_trade_sentiment(symbol: str, amount_cro: float) -> Dict[str, Any]:
    """
    Comprehensive sentiment analysis for a proposed trade.
    Combines sentiment score with volume and trend analysis.
    
    Args:
        symbol (str): Token symbol to trade
        amount_cro (float): Trade size in CRO
    
    Returns:
        dict: Detailed sentiment analysis with recommendations
    
    Example:
        analyze_trade_sentiment("CRO", 0.5)
        Returns: {"sentiment_approved": True, "score": 78, "recommendation": "..."}
    """
    sentiment = get_token_sentiment.invoke({"symbol": symbol})
    
    if "error" in sentiment:
        return {
            "sentiment_approved": False,
            "reason": "Cannot analyze sentiment",
            "recommendation": "Skip trade due to data unavailability"
        }
    
    score = sentiment["score"]
    
    # Sentiment-based approval with nuanced thresholds
    if score >= 70:
        sentiment_approved = True
        confidence = "High"
        recommendation = f"✅ Strong bullish sentiment ({score}/100). Favorable trading conditions."
    elif score >= 55:
        sentiment_approved = True
        confidence = "Medium"
        recommendation = f"🟡 Slightly bullish sentiment ({score}/100). Moderate trading opportunity."
    elif score >= 45:
        sentiment_approved = True
        confidence = "Low"
        recommendation = f"⚪ Neutral sentiment ({score}/100). Market is undecided - proceed with caution."
    elif score >= 30:
        sentiment_approved = False
        confidence = "Low"
        recommendation = f"🟠 Slightly bearish sentiment ({score}/100). Consider waiting for better entry."
    else:
        sentiment_approved = False
        confidence = "High"
        recommendation = f"❌ Bearish sentiment ({score}/100). Not recommended for long positions."
    
    return {
        "sentiment_approved": sentiment_approved,
        "score": score,
        "sentiment_label": sentiment["sentiment"],
        "confidence": confidence,
        "trending": sentiment.get("trending", False),
        "volume": sentiment.get("volume", 0),
        "trade_amount": amount_cro,
        "recommendation": recommendation,
        "risk_level": "Low" if score >= 70 else "Medium" if score >= 50 else "High"
    }


# Export all tools
SENTIMENT_TOOLS = [
    get_token_sentiment,
    check_sentiment_condition,
    get_trending_tokens,
    analyze_trade_sentiment
]
