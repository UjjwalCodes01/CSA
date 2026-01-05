"""
Market Data Agent - PRO VERSION
Fetches REAL data from Crypto.com Exchange API inside tools
All tools execute actual API calls instead of providing instructions
"""
from crypto_com_agent_client import tool
from crypto_com_developer_platform_client import Exchange, Client
import os

# Initialize Client for Exchange API (required)
try:
    api_key = os.getenv('DEVELOPER_PLATFORM_API_KEY')
    if api_key:
        Client.init(api_key=api_key)
except Exception as e:
    print(f"Warning: Exchange Client initialization failed: {e}")

@tool
def get_cro_price() -> dict:
    """
    Get the current CRO/USDT price from Crypto.com Exchange (LIVE DATA).
    
    Returns:
        dict: Real-time price data with volume and 24h change
    """
    try:
        ticker = Exchange.get_ticker_by_instrument('CRO_USDT')
        data = ticker.get('data', {})
        
        return {
            "symbol": "CRO_USDT",
            "price": float(data.get('lastPrice', 0)),
            "volume_24h": float(data.get('volume', 0)),
            "high_24h": float(data.get('high', 0)),
            "low_24h": float(data.get('low', 0)),
            "change_24h_percent": float(data.get('change', 0)),
            "timestamp": data.get('timestamp', ''),
            "status": "✅ LIVE DATA"
        }
    except Exception as e:
        return {"error": f"Failed to fetch CRO price: {str(e)}", "status": "❌ ERROR"}


@tool
def check_price_condition(symbol: str, operator: str, target_price: float) -> dict:
    """
    Check if a token's price meets a condition (EXECUTES REAL CHECK).
    
    Args:
        symbol: Trading pair (e.g., 'CRO_USDT')
        operator: Comparison (>, <, ==, >=, <=)
        target_price: Target price to compare
    
    Returns:
        dict: Actual condition result with live price
    """
    try:
        # Normalize instrument name (e.g., "cro-usdt" -> "CRO_USDT")
        symbol = symbol.replace("-", "_").upper()
        
        # FETCH REAL DATA
        ticker = Exchange.get_ticker_by_instrument(symbol)
        current_price = float(ticker['data']['lastPrice'])
        
        # PERFORM ACTUAL COMPARISON
        ops = {
            ">": current_price > target_price,
            "<": current_price < target_price,
            "==": current_price == target_price,
            ">=": current_price >= target_price,
            "<=": current_price <= target_price
        }
        condition_met = ops.get(operator, False)
        
        return {
            "symbol": symbol,
            "current_price": current_price,
            "target_price": target_price,
            "operator": operator,
            "condition_met": condition_met,
            "result": f"{'✅ TRUE' if condition_met else '❌ FALSE'}: {current_price} {operator} {target_price}",
            "status": "✅ LIVE CHECK"
        }
    except Exception as e:
        return {"error": f"Failed to check condition: {str(e)}", "status": "❌ ERROR"}


@tool
def get_market_summary(pairs: str = None) -> dict:
    """
    Get real-time market summary for multiple pairs (LIVE DATA).
    
    Args:
        pairs: Comma-separated trading pairs (e.g., 'CRO_USDT,BTC_USDT,ETH_USDT'). Default: 'CRO_USDT,BTC_USDT,ETH_USDT'
    
    Returns:
        dict: Live market data for all pairs
    """
    if pairs is None:
        pairs = 'CRO_USDT,BTC_USDT,ETH_USDT'
    
    # Parse comma-separated string to list
    pairs_list = [p.strip() for p in pairs.split(',')]
    
    try:
        summary = {}
        total_volume = 0
        
        for pair in pairs_list:
            try:
                # Normalize instrument name
                pair = pair.replace("-", "_").upper()
                
                ticker = Exchange.get_ticker_by_instrument(pair)
                data = ticker.get('data', {})
                
                price = float(data.get('lastPrice', 0))
                volume = float(data.get('volume', 0))
                change = float(data.get('change', 0))
                
                summary[pair] = {
                    'price': price,
                    'volume_24h': volume,
                    'high_24h': float(data.get('high', 0)),
                    'low_24h': float(data.get('low', 0)),
                    'change_24h_percent': change,
                    'trend': '🟢 UP' if change > 0 else '🔴 DOWN' if change < 0 else '🟡 FLAT'
                }
                total_volume += volume
            except Exception as e:
                summary[pair] = {"error": str(e)}
        
        return {
            "pairs_count": len(pairs_list),
            "total_volume_24h": round(total_volume, 2),
            "data": summary,
            "status": "✅ LIVE DATA"
        }
    except Exception as e:
        return {"error": f"Failed to fetch market summary: {str(e)}", "status": "❌ ERROR"}


@tool
def calculate_swap_value(amount_in: float, symbol_in: str, symbol_out: str, slippage: float = 0.005) -> dict:
    """
    Calculate REAL estimated output for a swap (LIVE CALCULATION).
    
    Args:
        amount_in: Input token amount
        symbol_in: Input token (e.g., 'CRO')
        symbol_out: Output token (e.g., 'USDC')
        slippage: Slippage tolerance (default: 0.005 = 0.5%)
    
    Returns:
        dict: Live swap calculation with current price
    """
    try:
        # Normalize instrument names
        symbol_in = symbol_in.replace("-", "_").upper()
        symbol_out = symbol_out.replace("-", "_").upper()
        pair = f"{symbol_in}_{symbol_out}"
        
        # FETCH REAL PRICE
        ticker = Exchange.get_ticker_by_instrument(pair)
        price = float(ticker['data']['lastPrice'])
        amount_out_perfect = amount_in * price
        amount_out_with_slippage = amount_out_perfect * (1 - slippage)
        slippage_cost = amount_out_perfect - amount_out_with_slippage
        
        return {
            "input": f"{amount_in} {symbol_in}",
            "output_estimated": round(amount_out_with_slippage, 6),
            "output_perfect": round(amount_out_perfect, 6),
            "slippage_cost": round(slippage_cost, 6),
            "current_price": price,
            "slippage_percent": slippage * 100,
            "slippage_tolerance_used": slippage,
            "trading_pair": pair,
            "calculation": f"{amount_in} {symbol_in} × ${price} × {(1-slippage)*100:.1f}% = ~{round(amount_out_with_slippage, 4)} {symbol_out}",
            "status": "✅ LIVE CALCULATION"
        }
    except Exception as e:
        return {"error": f"Failed to calculate swap: {str(e)}", "status": "❌ ERROR"}


@tool
def analyze_market_conditions(pairs: str = None) -> dict:
    """
    Analyze REAL market conditions with live data (COMPREHENSIVE ANALYSIS).
    
    Args:
        pairs: Comma-separated trading pairs (e.g., 'CRO_USDT,BTC_USDT,ETH_USDT'). Default: 'CRO_USDT,BTC_USDT,ETH_USDT'
    
    Returns:
        dict: Live market analysis with trend and recommendations
    """
    try:
        if pairs is None:
            pairs = 'CRO_USDT,BTC_USDT,ETH_USDT'
        
        # Parse comma-separated string to list
        pairs_list = [p.strip() for p in pairs.split(',')]
        
        data = {}
        changes = []
        
        # FETCH REAL DATA FOR ALL PAIRS
        for pair in pairs_list:
            try:
                ticker = Exchange.get_ticker_by_instrument(pair)
                ticker_data = ticker.get('data', {})
                
                price = float(ticker_data.get('lastPrice', 0))
                change = float(ticker_data.get('change', 0))
                volume = float(ticker_data.get('volume', 0))
                
                data[pair] = {
                    'price': price,
                    'change_24h': change,
                    'volume': volume,
                    'high': float(ticker_data.get('high', 0)),
                    'low': float(ticker_data.get('low', 0))
                }
                changes.append(change)
            except:
                pass
        
        # CALCULATE REAL METRICS
        avg_change = sum(changes) / len(changes) if changes else 0
        positive_pairs = sum(1 for c in changes if c > 0)
        negative_pairs = sum(1 for c in changes if c < 0)
        
        # DETERMINE REAL TREND
        if avg_change > 2:
            trend = "bullish"
            sentiment = "🟢 Strong Positive Momentum"
            confidence = "high"
        elif avg_change > 0:
            trend = "moderately_bullish"
            sentiment = "🟢 Mild Positive Momentum"
            confidence = "medium"
        elif avg_change < -2:
            trend = "bearish"
            sentiment = "🔴 Strong Negative Pressure"
            confidence = "high"
        elif avg_change < 0:
            trend = "moderately_bearish"
            sentiment = "🔴 Mild Negative Pressure"
            confidence = "medium"
        else:
            trend = "neutral"
            sentiment = "🟡 Sideways / Consolidation"
            confidence = "low"
        
        # GENERATE REAL RECOMMENDATION
        if trend in ["bullish", "moderately_bullish"]:
            recommendation = "✅ Favorable conditions for swaps. Market showing strength."
            risk_level = "LOW to MEDIUM"
        elif trend in ["bearish", "moderately_bearish"]:
            recommendation = "⚠️  Exercise caution. Consider smaller amounts or waiting."
            risk_level = "MEDIUM to HIGH"
        else:
            recommendation = "🟡 Market consolidating. Good for conservative trades."
            risk_level = "MEDIUM"
        
        return {
            "trend": trend,
            "sentiment": sentiment,
            "confidence": confidence,
            "average_change_24h": round(avg_change, 2),
            "positive_pairs": positive_pairs,
            "negative_pairs": negative_pairs,
            "market_data": data,
            "recommendation": recommendation,
            "risk_level": risk_level,
            "summary": f"Market is {trend} ({avg_change:+.2f}% avg). {recommendation}",
            "status": "✅ LIVE ANALYSIS"
        }
    except Exception as e:
        return {"error": f"Failed to analyze market: {str(e)}", "status": "❌ ERROR"}


# Export all tools
MARKET_DATA_TOOLS_PRO = [
    get_cro_price,
    check_price_condition,
    get_market_summary,
    calculate_swap_value,
    analyze_market_conditions
]
