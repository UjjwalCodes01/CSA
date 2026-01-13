"""
Autonomous Trading Agent - Direct Tool Integration (No MCP)
Bypasses MCP protocol complexity and calls tools directly for reliable autonomous operation
"""
import os
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from google import genai
import json

load_dotenv()

# Import tools directly
import sys
src_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src')
sys.path.insert(0, src_path)

from monitoring.sentiment_aggregator import SentimentAggregator
from agents.market_data_agent import get_cro_price
from execution.wcro_amm_executor import get_wcro_pool_info, swap_wcro_to_tusd
from agents.sentinel_agent import check_sentinel_approval

sentiment_agg = SentimentAggregator()

# Tool definitions for Gemini function calling
TOOLS = [
    {
        "name": "get_market_intelligence",
        "description": "Get comprehensive market sentiment from multiple sources (News, Reddit, CoinGecko)",
        "parameters": {
            "type": "object",
            "properties": {
                "token": {"type": "string", "description": "Token to analyze (e.g., crypto-com-chain)"}
            },
            "required": ["token"]
        }
    },
    {
        "name": "check_cro_price",
        "description": "Get real-time CRO price from Crypto.com Exchange API",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "get_cronos_market_data",
        "description": "Get comprehensive market data from Crypto.com Exchange",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "check_sentinel_approval",
        "description": "Check if transaction would be approved by on-chain Sentinel safety contract",
        "parameters": {
            "type": "object",
            "properties": {
                "amount_cro": {"type": "number", "description": "Amount of CRO to check for approval"}
            },
            "required": ["amount_cro"]
        }
    },
    {
        "name": "execute_wcro_swap",
        "description": "Execute WCRO swap on Cronos testnet AMM",
        "parameters": {
            "type": "object",
            "properties": {
                "wcro_amount": {"type": "number", "description": "Amount of WCRO to swap"},
                "buy_wcro": {"type": "boolean", "description": "True to buy WCRO, False to sell WCRO for tUSD"}
            },
            "required": ["wcro_amount", "buy_wcro"]
        }
    },
    {
        "name": "get_wallet_balances",
        "description": "Get current wallet balances for TCRO, WCRO, and tUSD",
        "parameters": {"type": "object", "properties": {}}
    }
]

# Tool execution functions
async def execute_tool(tool_name: str, arguments: dict) -> dict:
    """Execute a tool and return the result"""
    print(f"  [Executing] {tool_name}({arguments})")
    
    try:
        if tool_name == "get_market_intelligence":
            result = sentiment_agg.aggregate_sentiment(arguments.get("token", "crypto-com-chain"))
            return {
                "signal": result["signal"],
                "sentiment": result["sentiment"],
                "strength": result["strength"],
                "sources": len(result["sources"])
            }
        
        elif tool_name == "check_cro_price":
            price_data = get_cro_price.invoke({})
            return {
                "price": price_data.get("price", 0),
                "change_24h": price_data.get("change_24h", 0)
            }
        
        elif tool_name == "get_cronos_market_data":
            # CDC Exchange API - simplified for now
            return {
                "pairs_count": 0,
                "message": "Market data available via get_cro_price"
            }
        
        elif tool_name == "check_sentinel_approval":
            approval = check_sentinel_approval(arguments["amount_cro"])
            return {
                "approved": approval.get("approved", False),
                "reason": approval.get("reason", "Unknown"),
                "can_proceed": approval.get("can_proceed", False),
                "remaining_limit": approval.get("remaining", 0)
            }
        
        elif tool_name == "execute_wcro_swap":
            if arguments.get("buy_wcro"):
                return {"status": "error", "message": "Buying WCRO not yet implemented", "success": False}
            else:
                # DRY RUN - Show pool info instead of actual swap
                pool_info = get_wcro_pool_info()
                return {
                    "status": "dry_run",
                    "message": f"DRY RUN: Would swap {arguments['wcro_amount']} WCRO to tUSD",
                    "pool_wcro": pool_info.get("wcro_balance", 0),
                    "pool_tusd": pool_info.get("tusd_balance", 0),
                    "price": pool_info.get("price", 0),
                    "success": True
                }
        
        elif tool_name == "get_wallet_balances":
            from web3 import Web3
            w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL", "https://evm-t3.cronos.org")))
            wallet = w3.eth.account.from_key(os.getenv("PRIVATE_KEY")).address
            tcro_balance = w3.eth.get_balance(wallet) / 10**18
            return {
                "wallet": wallet,
                "TCRO": tcro_balance,
                "WCRO": 0,  # Would need contract call
                "tUSD": 0   # Would need contract call
            }
        
        else:
            return {"error": f"Unknown tool: {tool_name}"}
    
    except Exception as e:
        return {"error": str(e)}


AUTONOMOUS_PROMPT = """You are the Sentinel Alpha x402 AI Agent - an autonomous finance agent for Cronos EVM.

🏆 HACKATHON MISSION: Cronos x402 Paytech - AI-Powered Programmatic Payments

YOUR ROLE: Autonomous DeFi portfolio manager with on-chain safety enforcement.

CRYPTO.COM ECOSYSTEM INTEGRATION:
- Real-time market data from Crypto.com Exchange API
- CRO/USDT price discovery via CDC Developer Platform
- Cronos EVM smart contract execution (SentinelClamp safety layer)
- WCRO token operations on Cronos testnet

CRITICAL SAFETY PROTOCOL (Execute in this exact order):

1. MARKET ANALYSIS:
   a) Call check_cro_price() → Get real-time price from CDC Exchange
   b) Call get_market_intelligence(token="crypto-com-chain") → Get sentiment signal
   - Combine signals to assess market conditions

2. IF strong_buy signal with strength >= 3:
   a) BALANCE CHECK: Call get_wallet_balances()
   
   b) AMOUNT CALCULATION: Max 0.5 WCRO (respects daily limit)
   
   c) SENTINEL VERIFICATION: Call check_sentinel_approval(amount_cro=0.5)
      - This calls SentinelClamp smart contract on Cronos
      - If approved=False, STOP and log reason
      - If can_proceed=True, continue to step d
   
   d) EXECUTION (DRY RUN): Call execute_wcro_swap(wcro_amount=0.5, buy_wcro=False)
      - Shows what would happen (DRY RUN mode for testing)
      - buy_wcro=False means SELL WCRO (swap WCRO to tUSD)

3. IF strong_sell:
   - Already holding tUSD (stablecoin position)
   - Log decision: "Position already in tUSD, no action needed"

4. IF hold/weak signal:
   - Log decision with price data
   - Explain why conditions not met

5. ALWAYS provide x402-style reasoning:
   - CDC Exchange price + market data
   - Multi-source sentiment score
   - On-chain safety verification status
   - Decision rationale

Current time: {time}

Analyze the market and make a trading decision. Use the available tools to gather data and make an informed choice.
"""


async def run_autonomous_cycle():
    """Run one autonomous trading decision cycle"""
    print("\n" + "="*60)
    print(f"AUTONOMOUS AGENT - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    # Initialize Gemini
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    # Build prompt with current time
    prompt = AUTONOMOUS_PROMPT.format(time=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    
    print("Gemini analyzing market with tools...\n")
    
    # Use simple generate_content with function calling
    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash-exp",
        contents=prompt,
        config={
            "tools": [{"function_declarations": TOOLS}],
            "temperature": 0.3,
        }
    )
    
    # Process function calls iteratively
    max_iterations = 10
    iteration = 0
    
    while iteration < max_iterations:
        iteration += 1
        
        # Check if there are function calls in the response
        has_function_calls = False
        function_responses = []
        
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'function_call') and part.function_call:
                    has_function_calls = True
                    func_call = part.function_call
                    
                    print(f"\n  [Tool Call] {func_call.name}")
                    print(f"     Args: {dict(func_call.args)}")
                    
                    # Execute the tool
                    result = await execute_tool(func_call.name, dict(func_call.args))
                    print(f"     Result: {json.dumps(result, indent=6)}")
                    
                    # Store function response
                    function_responses.append({
                        "function_call": func_call,
                        "function_response": {
                            "name": func_call.name,
                            "response": result
                        }
                    })
        
        # If no function calls, check for text response
        if not has_function_calls:
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'text') and part.text:
                        print("\nAgent Decision:")
                        print("-" * 60)
                        print(part.text)
                        print("-" * 60)
                        
                        # Log decision
                        log_entry = {
                            "timestamp": datetime.now().isoformat(),
                            "decision": part.text,
                            "cycle": iteration
                        }
                        
                        with open("autonomous_trade_log.txt", "a") as f:
                            f.write(f"\n{'='*60}\n")
                            f.write(f"Time: {log_entry['timestamp']}\n")
                            f.write(f"Decision:\n{part.text}\n")
                        
                        return part.text
            break
        
        # Send function responses back to Gemini
        if function_responses:
            # Build the next request with function responses
            response = await client.aio.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=[
                    prompt,
                    response.candidates[0].content,
                    {"parts": [fr["function_response"] for fr in function_responses]}
                ],
                config={
                    "tools": [{"function_declarations": TOOLS}],
                    "temperature": 0.3,
                }
            )
    
    print("⚠️ Max iterations reached")
    return "No decision made"


async def run_forever():
    """Run autonomous agent in continuous loop"""
    print("\nStarting Sentinel Alpha Autonomous Agent (Direct Mode)")
    print("Decision cycle: Every 15 minutes")
    print("Press Ctrl+C to stop\n")
    
    cycle_count = 0
    
    try:
        while True:
            cycle_count += 1
            print(f"\nCycle {cycle_count}")
            
            try:
                await run_autonomous_cycle()
            except Exception as e:
                print(f"Error in cycle {cycle_count}: {e}")
                import traceback
                traceback.print_exc()
            
            # Wait 15 minutes before next decision
            print(f"\nWaiting 15 minutes until next cycle...")
            await asyncio.sleep(900)  # 15 minutes
            
    except KeyboardInterrupt:
        print("\n\nStopping Autonomous Agent...")
        print(f"Total cycles completed: {cycle_count}")
        print("Shutdown complete")


async def test_single_decision():
    """Test mode: Run one decision and exit"""
    print("Test Mode: Running single decision cycle\n")
    decision = await run_autonomous_cycle()
    print("\nTest complete!")
    return decision


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Test mode: single decision
        asyncio.run(test_single_decision())
    else:
        # Production mode: run forever
        asyncio.run(run_forever())
