"""
Cronos Sentinel Agent - Main Entry Point
Day 8-10: Market Data Integration with Sentinel Safety
"""
import os
from dotenv import load_dotenv
from crypto_com_agent_client import Agent, SQLitePlugin
from crypto_com_agent_client.lib.enums.provider_enum import Provider

# Import our custom tools (with real API calls)
from agents.market_data_agent import MARKET_DATA_TOOLS_PRO
from agents.sentinel_agent import SENTINEL_TOOLS

# Market data tools with real data fetching
MARKET_DATA_TOOLS = MARKET_DATA_TOOLS_PRO

# Load environment variables
load_dotenv()

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
3. Never exceed the daily spending limit (1 CRO)
4. Explain WHY trades are approved or blocked
5. Suggest safe alternative amounts when trades are blocked

SAFETY RULES:
- NEVER execute or suggest swaps without checking Sentinel first
- ALWAYS explain the daily limit status when discussing trades
- If a trade is blocked, suggest a safe alternative amount
- Emphasize that limits are enforced by smart contracts (can't be bypassed)

GOLDEN RULE - PRE-FLIGHT CHECKLIST (MANDATORY FOR ALL SWAPS):
1. First, call analyze_market_conditions() to check if market is favorable
2. If market conditions are acceptable, call can_afford_swap(amount) to verify:
   - Sentinel daily limit compliance ✅
   - Wallet balance sufficiency ✅
3. If BOTH checks pass, call check_sentinel_approval(amount) for final confirmation
4. ONLY THEN offer the swap to the user with full safety breakdown
5. If ANY check fails, explain WHY and suggest safe alternatives

Never skip this sequence. Safety checks are MANDATORY before ANY trade suggestion.

COMMUNICATION STYLE:
- Be clear and concise
- Use emojis sparingly: ✅ for approved, ❌ for blocked, 🛡️ for safety info
- Always show amounts in CRO (not Wei)
- Explain technical concepts in simple terms

AVAILABLE TOOLS:
- Market Data: Get real-time CRO prices, analyze conditions
- Sentinel Checks: Verify approval, check status, recommend safe amounts
- Exchange API: Full access to Crypto.com market data

Remember: Your job is to make DeFi safe AND useful!"""


def create_agent():
    """Initialize the Cronos Sentinel Agent with all plugins and tools"""
    
    # Combine all custom tools
    all_custom_tools = MARKET_DATA_TOOLS + SENTINEL_TOOLS
    
    # Initialize SQLite storage for session persistence
    storage = SQLitePlugin(db_path="agent_state.db")
    
    # Check if using Vertex AI (GCP) or AI Studio (API key)
    gcp_project_id = os.getenv("GCP_PROJECT_ID")
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    
    # Prioritize Vertex AI if GCP project is configured
    if gcp_project_id:
        # Use Vertex AI with Google's generative AI library
        # This will use application-default credentials we set up
        import vertexai
        
        # Initialize Vertex AI
        vertexai.init(project=gcp_project_id, location="us-central1")
        
        # Configure SDK to use Gemini through Vertex AI billing
        llm_config = {
            "provider": Provider.GoogleGenAI,
            "model": "gemini-2.5-flash",
            "provider-api-key": gemini_api_key,  # Still needed for SDK
            "temperature": 0.7,
        }
        print(f"🔧 Using Vertex AI: {gcp_project_id}")
        print("   Model: gemini-2.5-flash (GCP billing)")
        
    elif gemini_api_key:
        llm_config = {
            "provider": Provider.GoogleGenAI,
            "model": "gemini-2.5-flash",
            "provider-api-key": gemini_api_key,
            "temperature": 0.7,
        }
        print("🔧 Using Gemini AI Studio (free tier)")
        print("   Model: gemini-2.5-flash")
    else:
        raise ValueError("Either GCP_PROJECT_ID or GEMINI_API_KEY required in .env")
    
    # Initialize agent
    agent = Agent.init(
        llm_config=llm_config,
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
    print("🛡️  CRONOS SENTINEL AGENT - Day 8-10 Demo")
    print("=" * 60)
    print()
    print("Features:")
    print("  ✅ Real-time market data from Crypto.com Exchange")
    print("  ✅ Sentinel safety checks (blockchain-enforced limits)")
    print("  ✅ AI-powered trading analysis")
    print()
    print("Try asking:")
    print('  - "What is the current CRO price?"')
    print('  - "Can I swap 0.05 CRO to USDC?"')
    print('  - "What is my Sentinel status?"')
    print('  - "Recommend a safe swap amount"')
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
