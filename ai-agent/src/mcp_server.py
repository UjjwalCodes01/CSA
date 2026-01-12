"""
MCP Server for Sentinel Alpha Trading Agent
Exposes trading tools via Model Context Protocol
"""
import os
import sys
import warnings

# Suppress third-party deprecation warnings
warnings.filterwarnings("ignore", category=DeprecationWarning, module="httplib2")
warnings.filterwarnings("ignore", category=DeprecationWarning, module="websockets")
warnings.filterwarnings("ignore", category=DeprecationWarning, module="google")

from dotenv import load_dotenv
from fastmcp import FastMCP

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.monitoring.sentiment_aggregator import SentimentAggregator
from src.agents.market_data_agent import (
    get_cro_price,
    get_market_summary,
    check_price_condition
)

load_dotenv()

# Initialize MCP Server
mcp = FastMCP("Sentinel-Alpha-x402-Agent")

# Initialize components
sentiment_agg = SentimentAggregator()


@mcp.tool()
def get_market_intelligence(coin_id: str = "crypto-com-chain") -> dict:
    """
    Aggregates real-time market sentiment from 4 sources:
    - CryptoPanic news
    - Google News 
    - Reddit community
    - CoinGecko metrics
    
    Returns comprehensive market signal (strong_buy/buy/hold/sell/strong_sell)
    with sentiment score and strength indicator.
    
    Returns:
        {
            "signal": str,  # "strong_buy", "buy", "hold", "sell", "strong_sell"
            "avg_sentiment": float,  # -1.0 to 1.0
            "strength": int,  # Number of data sources (0-4)
            "sources": list,  # List of source names
            "is_trending": bool,
            "reason": str
        }
    """
    result = sentiment_agg.aggregate_sentiment(coin_id)
    # Ensure clean JSON serialization
    return {
        "signal": str(result.get("signal", "hold")),
        "avg_sentiment": float(result.get("avg_sentiment", 0.0)),
        "strength": int(result.get("strength", 0)),
        "sources": list(result.get("sources", [])),
        "is_trending": bool(result.get("is_trending", False)),
        "reason": str(result.get("reason", "No data available"))
    }


@mcp.tool()
def get_reddit_sentiment(query: str = "Cronos CRO") -> dict:
    """
    Get Reddit community sentiment for specific crypto query.
    Analyzes posts from r/CryptoCurrency, r/CronosOfficial, r/Crypto_com
    
    Returns sentiment score (-1.0 to 1.0) and post count.
    """
    return sentiment_agg.get_reddit_sentiment(query)


@mcp.tool()
def get_coingecko_metrics(coin_id: str = "crypto-com-chain") -> dict:
    """
    Get CoinGecko metrics including:
    - Sentiment votes (bullish/bearish percentage)
    - Developer score
    - Community score
    - Trending status
    """
    return sentiment_agg.get_coingecko_sentiment(coin_id)


@mcp.tool()
def check_cro_price() -> dict:
    """
    Get real-time CRO/USDT price from Crypto.com Exchange API.
    Uses official Crypto.com Developer Platform for market data.
    
    Returns:
        {
            "symbol": "CRO_USDT",
            "price": float,
            "24h_change": float,
            "volume_24h": float,
            "high_24h": float,
            "low_24h": float,
            "timestamp": str
        }
    """
    return get_cro_price.invoke({})


@mcp.tool()
def get_cronos_market_data() -> dict:
    """
    Get comprehensive CRO market data from Crypto.com Exchange.
    Includes price, volume, volatility metrics for autonomous trading decisions.
    
    Part of x402 AI agentic finance solution - autonomous price discovery
    for programmatic on-chain settlement decisions.
    
    Returns complete market context for AI agent decision-making.
    """
    return get_market_summary.invoke({})


@mcp.tool()
def check_price_alert(target_price: float, condition: str = "above") -> dict:
    """
    Check if CRO price meets condition for autonomous trade execution.
    
    Args:
        target_price: Price threshold in USDT
        condition: "above" or "below"
    
    Part of x402 programmatic payment flow - autonomous price-based triggers.
    Used by AI agent to determine optimal entry/exit points on Cronos EVM.
    
    Returns:
        {
            "condition_met": bool,
            "current_price": float,
            "target_price": float,
            "condition": str,
            "recommendation": str
        }
    """
    return check_price_condition.invoke({"target_price": target_price, "condition": condition})


@mcp.tool()
def check_sentinel_approval(amount_tcro: float) -> dict:
    """
    Check if a trade amount is approved by SentinelClamp safety contract.
    
    Args:
        amount_tcro: Amount in TCRO to check (must be > 0 and <= 1.0)
        
    Returns:
        {
            "approved": bool,
            "reason": str,
            "amount_requested_tcro": float,
            "daily_limit_tcro": float,
            "can_proceed": bool  # Explicit flag for agent
        }
    """
    # Validation
    if amount_tcro <= 0:
        return {
            "approved": False,
            "reason": "Amount must be greater than 0",
            "amount_requested_tcro": amount_tcro,
            "daily_limit_tcro": 1.0,
            "can_proceed": False
        }
    
    if amount_tcro > 1.0:
        return {
            "approved": False,
            "reason": f"Amount {amount_tcro} TCRO exceeds daily limit of 1.0 TCRO",
            "amount_requested_tcro": amount_tcro,
            "daily_limit_tcro": 1.0,
            "can_proceed": False
        }
    
    # Use the executioner agent tools
    from src.agents.sentinel_agent import check_sentinel_approval as sentinel_check
    result = sentinel_check.invoke({"amount_cro": amount_tcro})  # Note: tool expects amount_cro
    
    # Ensure clean JSON with explicit can_proceed flag
    return {
        "approved": bool(result.get("approved", False)),
        "reason": str(result.get("reason", "Unknown")),
        "amount_requested_tcro": float(amount_tcro),
        "daily_limit_tcro": float(result.get("daily_limit_tcro", 1.0)),
        "can_proceed": bool(result.get("approved", False))  # Clear flag for AI
    }


@mcp.tool()
def execute_wcro_swap(wcro_amount: float, buy_wcro: bool = True) -> dict:
    """
    Execute WCRO swap on AMM pool within Sentinel limits.
    
    Args:
        wcro_amount: Amount of WCRO to swap
        buy_wcro: True to buy WCRO (sell tUSD), False to sell WCRO (buy tUSD)
        
    Returns:
        Transaction hash and execution status
    """
    # Use the WCRO AMM executor
    from src.execution.wcro_amm_executor import swap_wcro_to_tusd
    
    if buy_wcro:
        # Buying WCRO not directly implemented - would need reverse swap
        return {
            "status": "error",
            "message": "Buying WCRO (tUSD -> WCRO) not yet implemented. Use buy_wcro=False to sell WCRO.",
            "tx_hash": None,
            "success": False
        }
    else:
        # Selling WCRO for tUSD
        result = swap_wcro_to_tusd(wcro_amount)
        
        # Ensure consistent return format for MCP
        return {
            "status": "success" if result.get("success") else "error",
            "message": f"Swapped {wcro_amount} WCRO to tUSD" if result.get("success") else result.get("error", "Unknown error"),
            "tx_hash": result.get("tx_hash"),
            "success": result.get("success", False),
            "amount_in": result.get("amount_in"),
            "expected_out": result.get("expected_out"),
            "gas_used": result.get("gas_used")
        }


@mcp.tool()
def get_wallet_balances() -> dict:
    """
    Get current wallet balances for TCRO, WCRO, and tUSD.
    """
    from web3 import Web3
    
    try:
        w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL", "https://evm-t3.cronos.org")))
        wallet = w3.eth.account.from_key(os.getenv("PRIVATE_KEY")).address
        
        # TCRO balance
        tcro_balance = w3.eth.get_balance(wallet) / 10**18
        
        # ERC20 ABI for balanceOf
        erc20_abi = [{"inputs": [{"name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}]
        
        # WCRO balance
        wcro = w3.eth.contract(address=os.getenv("WCRO_ADDRESS"), abi=erc20_abi)
        wcro_balance = wcro.functions.balanceOf(wallet).call() / 10**18
        
        # tUSD balance
        tusd = w3.eth.contract(address=os.getenv("TEST_USD_ADDRESS"), abi=erc20_abi)
        tusd_balance = tusd.functions.balanceOf(wallet).call() / 10**18
        
        return {
            "wallet": wallet,
            "tcro": tcro_balance,
            "wcro": wcro_balance,
            "tusd": tusd_balance,
            "total_value_tusd": wcro_balance * 0.78 + tusd_balance
        }
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    # Run with stdio transport (easiest for hackathon)
    print("🚀 Starting Sentinel Alpha x402 MCP Server...")
    print("🏆 Cronos x402 Paytech Hackathon Submission")
    print("💎 Crypto.com Ecosystem Integration")
    print("\n📡 Available Tools:")
    print("   💹 Market Intelligence Tools:")
    print("      - get_market_intelligence() [Multi-source sentiment]")
    print("      - get_reddit_sentiment() [Community signals]")
    print("      - get_coingecko_metrics() [On-chain metrics]")
    print("   \n💰 Crypto.com Exchange API Tools:")
    print("      - check_cro_price() [CDC Exchange real-time data]")
    print("      - get_cronos_market_data() [CDC Exchange market summary]")
    print("      - check_price_alert() [Programmatic price triggers]")
    print("   \n🛡️ Cronos EVM Security & Execution:")
    print("      - check_sentinel_approval() [SentinelClamp on-chain safety]")
    print("      - execute_wcro_swap() [Autonomous on-chain settlement]")
    print("      - get_wallet_balances() [Cronos testnet state]")
    print("\n✅ x402 AI Agentic Finance: Autonomous trading with on-chain safety")
    print("✅ Server ready (stdio transport)")
    
    mcp.run(transport="stdio")
