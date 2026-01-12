"""
Autonomous Trading Agent with Model Context Protocol (MCP)
Uses FastMCP to expose tools to Gemini for true autonomous decision-making
"""
import os
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from fastmcp import Client
from google import genai

load_dotenv()

# Autonomous Agent Prompt
AUTONOMOUS_PROMPT = """You are the Sentinel Alpha x402 AI Agent - an autonomous finance agent for Cronos EVM.

🏆 HACKATHON MISSION: Cronos x402 Paytech - AI-Powered Programmatic Payments

YOUR ROLE: Autonomous DeFi portfolio manager with on-chain safety enforcement.

CRYPTO.COM ECOSYSTEM INTEGRATION:
- Real-time market data from Crypto.com Exchange API
- CRO/USDT price discovery via CDC Developer Platform
- Cronos EVM smart contract execution (SentinelClamp safety layer)
- WCRO token operations on Cronos testnet

Available Tools (via Model Context Protocol):
1. get_market_intelligence() - Multi-source sentiment (News, Reddit, CoinGecko)
2. check_cro_price() - Crypto.com Exchange real-time CRO price
3. get_cronos_market_data() - CDC Exchange comprehensive market data
4. check_price_alert() - Programmatic price-based triggers
5. check_sentinel_approval() - On-chain safety verification (SentinelClamp)
6. execute_wcro_swap() - Autonomous WCRO swap on Cronos testnet
7. get_wallet_balances() - Cronos EVM wallet state

CRITICAL SAFETY PROTOCOL (Execute in this exact order):

1. MARKET ANALYSIS (Crypto.com + Multi-source):
   a) Call check_cro_price() → Get real-time price from CDC Exchange
   b) Call get_cronos_market_data() → Get volume, volatility from CDC
   c) Call get_market_intelligence() → Get sentiment signal
   - Combine all signals to assess market conditions

2. IF strong_buy signal with strength >= 3:
   a) BALANCE CHECK: Call get_wallet_balances()
      - Verify sufficient WCRO and TCRO for gas
   
   b) AMOUNT CALCULATION: 
      - Max 0.5 WCRO (respects daily limit)
      - Use price from CDC Exchange for value calculation
   
   c) SENTINEL VERIFICATION: Call check_sentinel_approval(0.5)
      - This calls SentinelClamp smart contract on Cronos
      - If approved=False, STOP and log reason
      - If can_proceed=True, continue to step d
   
   d) AUTONOMOUS EXECUTION: Call execute_wcro_swap(0.5, buy_wcro=False)
      - Executes WCRO -> tUSD swap on-chain via Cronos EVM
      - buy_wcro=False means SELL WCRO (swap WCRO to tUSD)
      - Returns transaction hash
      - This is x402 programmatic payment in action

3. IF strong_sell:
   - Already holding tUSD (stablecoin position)
   - Strong sell = already safe, no action needed
   - Log decision: "Position already in tUSD, no exit needed"

4. IF hold/weak signal:
   - Log decision with CDC Exchange price data
   - Explain why conditions not met for execution

5. ALWAYS provide x402-style reasoning:
   - CDC Exchange price + market data
   - Multi-source sentiment score
   - On-chain safety verification status
   - Autonomous decision rationale
   
REMEMBER: You are demonstrating x402 AI agentic finance - autonomous, intelligent,
on-chain settlement with Crypto.com ecosystem integration and Cronos EVM safety.

Current time: {time}

Analyze the market and decide whether to trade. If you execute a trade, report the transaction hash.
"""


async def run_autonomous_cycle():
    """Run one autonomous trading decision cycle"""
    print("\n" + "="*60)
    print(f"🤖 AUTONOMOUS AGENT - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    # Connect to MCP server - use absolute path
    server_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "mcp_server.py"))
    print(f"📂 Server path: {server_path}")
    
    async with Client(server_path) as mcp_client:
        print("✅ Connected to MCP Server")
        tools = await mcp_client.list_tools()
        print(f"📡 Tools available: {len(tools)} tools\n")
        
        # Initialize Gemini with MCP tools
        gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        # Build prompt with current time
        prompt = AUTONOMOUS_PROMPT.format(time=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        
        print("🧠 Gemini analyzing market with MCP tools...\n")
        
        # Let Gemini make the decision using MCP tools
        response = await gemini.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                tools=[mcp_client.session],  # Give Gemini access to MCP tools
                temperature=0.3,
            )
        )
        
        print("🤖 Agent Decision:")
        print("-" * 60)
        print(response.text)
        print("-" * 60)
        
        # Log decision
        with open("autonomous_trade_log.txt", "a") as f:
            f.write(f"\n{'='*60}\n")
            f.write(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Decision:\n{response.text}\n")
        
        return response.text


async def run_forever():
    """Run autonomous agent in continuous loop"""
    print("\n🚀 Starting Sentinel Alpha Autonomous Agent")
    print("🔌 Using Model Context Protocol (MCP)")
    print("🔄 Decision cycle: Every 15 minutes")
    print("⏹️  Press Ctrl+C to stop\n")
    
    cycle_count = 0
    
    try:
        while True:
            cycle_count += 1
            print(f"\n🔄 Cycle {cycle_count}")
            
            try:
                await run_autonomous_cycle()
            except Exception as e:
                print(f"❌ Error in cycle {cycle_count}: {e}")
            
            # Wait 15 minutes before next decision
            print(f"\n⏳ Waiting 15 minutes until next cycle...")
            await asyncio.sleep(900)  # 15 minutes
            
    except KeyboardInterrupt:
        print("\n\n⏹️  Stopping Autonomous Agent...")
        print(f"📊 Total cycles completed: {cycle_count}")
        print("✅ Shutdown complete")


async def test_single_decision():
    """Test mode: Run one decision and exit"""
    print("🧪 Test Mode: Running single decision cycle\n")
    decision = await run_autonomous_cycle()
    print("\n✅ Test complete!")
    return decision


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Test mode: single decision
        asyncio.run(test_single_decision())
    else:
        # Production mode: run forever
        asyncio.run(run_forever())
