"""
Cronos Sentinel Agent - Main Entry Point
Day 8-10: Market Data Integration with Sentinel Safety
"""
import os
from dotenv import load_dotenv
from crypto_com_agent_client import Agent, SQLitePlugin
from crypto_com_agent_client.lib.enums.provider_enum import Provider
from crypto_com_agent_client.lib.types.llm_config import LLMConfig
from crypto_com_agent_client.lib.types.blockchain_config import BlockchainConfig

# Import our custom tools (with real API calls)
from agents.market_data_agent import MARKET_DATA_TOOLS_PRO
from agents.sentinel_agent import SENTINEL_TOOLS
from agents.sentiment_agent import SENTIMENT_TOOLS

# Market data tools with real data fetching
MARKET_DATA_TOOLS = MARKET_DATA_TOOLS_PRO

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))

# Agent personality and instructions
SENTINEL_PERSONALITY = {
    "tone": "professional and safety-focused",
    "language": "English",
    "verbosity": "moderate",
}

SENTINEL_INSTRUCTIONS = """You are the Cronos Sentinel Agent, a safety-first DeFi trading assistant.

Your PRIMARY MISSION: Protect users from unsafe trades through blockchain-enforced limits.

KEY RESPONSIBILITIES:
1. Always check Sentinel approval BEFORE suggesting any swap
2. Provide real-time market data from Crypto.com Exchange
3. Analyze social sentiment from Twitter to gauge market mood
4. Never exceed the daily spending limit (1 CRO)
5. Explain WHY trades are approved or blocked
6. Suggest safe alternative amounts when trades are blocked

SAFETY RULES:
- NEVER execute or suggest swaps without checking Sentinel first
- ALWAYS explain the daily limit status when discussing trades
- If a trade is blocked, suggest a safe alternative amount
- Emphasize that limits are enforced by smart contracts (can't be bypassed)

GOLDEN RULE - PRE-FLIGHT CHECKLIST (MANDATORY FOR ALL SWAPS):
1. First, call analyze_market_conditions() to check if market is favorable
2. Next, call get_token_sentiment() to gauge social sentiment
3. If market AND sentiment are acceptable, call can_afford_swap(amount) to verify:
   - Sentinel daily limit compliance ✅
   - Wallet balance sufficiency ✅
4. If ALL checks pass, call check_sentinel_approval(amount) for final confirmation
5. ONLY THEN offer the swap to the user with full safety breakdown
6. If ANY check fails, explain WHY and suggest safe alternatives

Never skip this sequence. Safety checks are MANDATORY before ANY trade suggestion.

COMMUNICATION STYLE:
- Be clear and concise
- Use emojis sparingly: ✅ for approved, ❌ for blocked, 🛡️ for safety info
- Always show amounts in CRO (not Wei)
- Explain technical concepts in simple terms

AVAILABLE TOOLS:
- Market Data: Get real-time CRO prices, analyze conditions
- Sentiment Analysis: Twitter sentiment scores, trending tokens
- Sentinel Checks: Verify approval, check status, recommend safe amounts
- Exchange API: Full access to Crypto.com market data

Remember: Your job is to make DeFi safe AND useful!"""


def create_agent():
    """Initialize the Cronos Sentinel Agent with all plugins and tools"""
    
    # Combine all custom tools
    all_custom_tools = MARKET_DATA_TOOLS + SENTINEL_TOOLS + SENTIMENT_TOOLS
    
    # Initialize SQLite storage for session persistence
    storage = SQLitePlugin(db_path="agent_state.db")
    
    # Initialize agent
    agent = Agent.init(
        llm_config={
            "provider": "GoogleGenAI",
            "model": "gemini-2.5-flash",
            "provider-api-key": os.getenv("GEMINI_API_KEY"),
            "temperature": 0.7,
        },
        blockchain_config={
            "api-key": os.getenv("DEVELOPER_PLATFORM_API_KEY"),
            "private-key": os.getenv("PRIVATE_KEY"),
            "timeout": 30,  # 30 seconds timeout for API calls
        },
        plugins={
            "personality": SENTINEL_PERSONALITY,
            "instructions": SENTINEL_INSTRUCTIONS,
            "tools": all_custom_tools,
            "storage": storage,
        },
    )
    
    return agent


def main():
    """Interactive CLI loop for testing the agent"""
    
    print("=" * 60)
    print("🛡️  CRONOS SENTINEL AGENT - Day 11 Demo")
    print("=" * 60)
    print()
    print("Features:")
    print("  ✅ Real-time market data from Crypto.com Exchange")
    print("  ✅ Twitter sentiment analysis (hybrid mock+real)")
    print("  ✅ Sentinel safety checks (blockchain-enforced limits)")
    print("  ✅ AI-powered trading analysis")
    print()
    print("Try asking:")
    print('  - "What is the current CRO price?"')
    print('  - "What is the sentiment for CRO?"')
    print('  - "Show me trending tokens"')
    print('  - "Can I swap 0.05 CRO to USDC?"')
    print('  - "What is my Sentinel status?"')
    print('  - "Should I buy CRO now?"')
    print()
    print("Type 'exit' to quit")
    print("=" * 60)
    print()
    
    # Initialize agent
    try:
        agent = create_agent()
        print("✅ Agent initialized successfully!")
        print()
    except Exception as e:
        print(f"❌ Failed to initialize agent: {e}")
        print("\n💡 Make sure you have:")
        print("  1. Set GEMINI_API_KEY in .env")
        print("  2. Set DEVELOPER_PLATFORM_API_KEY in .env")
        print("  3. Installed dependencies: pip install -r requirements.txt")
        return
    
    # Interactive loop
    while True:
        try:
            user_input = input("You: ")
            
            if user_input.lower() in ['exit', 'quit', 'bye']:
                print("\n👋 Goodbye! Stay safe in DeFi!")
                break
            
            if not user_input.strip():
                continue
            
            # Get agent response
            print()
            response = agent.interact(user_input)
            print(f"🛡️ Sentinel Agent: {response}")
            print()
            
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye! Stay safe in DeFi!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            print("Please try again.\n")


if __name__ == "__main__":
    main()
