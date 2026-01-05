"""
Test Market Data Agent - Day 8-10
Quick tests for market data and Sentinel integration
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from dotenv import load_dotenv
from crypto_com_agent_client import Agent
from crypto_com_agent_client.lib.enums.provider_enum import Provider
from agents.market_data_agent import MARKET_DATA_TOOLS
from agents.sentinel_agent import SENTINEL_TOOLS

load_dotenv()

def test_market_data():
    """Test market data queries"""
    print("\n" + "="*60)
    print("TEST 1: Market Data Queries")
    print("="*60)
    
    agent = Agent.init(
        llm_config={
            "provider": Provider.GoogleGenAI,
            "model": "gemini-2.0-flash",
            "provider-api-key": os.getenv("GEMINI_API_KEY"),
            "temperature": 0.7,
        },
        blockchain_config={
            "api-key": os.getenv("DEVELOPER_PLATFORM_API_KEY"),
            "private-key": os.getenv("PRIVATE_KEY"),
            "timeout": 30,
        },
        plugins={
            "tools": MARKET_DATA_TOOLS,
        },
    )
    
    queries = [
        "What is the current CRO price?",
        "Get ticker information for CRO_USDT",
        "Is CRO price below $0.10?",
    ]
    
    for query in queries:
        print(f"\n📊 Query: {query}")
        try:
            response = agent.interact(query)
            print(f"✅ Response: {response}\n")
        except Exception as e:
            print(f"❌ Error: {e}\n")


def test_sentinel_checks():
    """Test Sentinel safety checks"""
    print("\n" + "="*60)
    print("TEST 2: Sentinel Safety Checks")
    print("="*60)
    
    agent = Agent.init(
        llm_config={
            "provider": Provider.GoogleGenAI,
            "model": "gemini-2.0-flash",
            "provider-api-key": os.getenv("GEMINI_API_KEY"),
            "temperature": 0.7,
        },
        blockchain_config={
            "api-key": os.getenv("DEVELOPER_PLATFORM_API_KEY"),
            "private-key": os.getenv("PRIVATE_KEY"),
            "timeout": 30,
        },
        plugins={
            "tools": SENTINEL_TOOLS,
        },
    )
    
    queries = [
        "What is my Sentinel status?",
        "Can I swap 0.05 CRO?",
        "Can I swap 5 CRO?",
        "Recommend a safe swap amount",
    ]
    
    for query in queries:
        print(f"\n🛡️ Query: {query}")
        try:
            response = agent.interact(query)
            print(f"✅ Response: {response}\n")
        except Exception as e:
            print(f"❌ Error: {e}\n")


def test_combined():
    """Test combined market data + Sentinel"""
    print("\n" + "="*60)
    print("TEST 3: Combined Intelligence (Market + Sentinel)")
    print("="*60)
    
    all_tools = MARKET_DATA_TOOLS + SENTINEL_TOOLS
    
    agent = Agent.init(
        llm_config={
            "provider": Provider.GoogleGenAI,
            "model": "gemini-2.0-flash",
            "provider-api-key": os.getenv("GEMINI_API_KEY"),
            "temperature": 0.7,
        },
        blockchain_config={
            "api-key": os.getenv("DEVELOPER_PLATFORM_API_KEY"),
            "private-key": os.getenv("PRIVATE_KEY"),
            "timeout": 30,
        },
        plugins={
            "tools": all_tools,
            "instructions": "You are a safety-first DeFi assistant. Always check Sentinel approval before suggesting swaps.",
        },
    )
    
    queries = [
        "What is the CRO price and can I safely swap 0.05 CRO?",
        "Check my daily limit status",
        "Should I buy CRO right now based on price and my available limit?",
    ]
    
    for query in queries:
        print(f"\n🤖 Query: {query}")
        try:
            response = agent.interact(query)
            print(f"✅ Response: {response}\n")
        except Exception as e:
            print(f"❌ Error: {e}\n")


if __name__ == "__main__":
    print("\n🚀 Starting Day 8-10 Tests")
    print("Testing Market Data + Sentinel Integration\n")
    
    try:
        # Run tests
        test_market_data()
        test_sentinel_checks()
        test_combined()
        
        print("\n" + "="*60)
        print("✅ All tests completed!")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        print("\n💡 Troubleshooting:")
        print("  1. Check .env file has correct API keys")
        print("  2. Ensure dependencies installed: pip install -r requirements.txt")
        print("  3. Verify Sentinel contract is deployed and accessible")
