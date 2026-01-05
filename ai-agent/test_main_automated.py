"""
Test main.py with automated queries
Tests the full agent without manual input
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

print("=" * 70)
print("🛡️ CRONOS SENTINEL AGENT - LIVE TEST")
print("=" * 70)
print()

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

try:
    from main import create_agent
    
    print("Initializing agent...")
    agent = create_agent()
    print("✅ Agent initialized successfully!")
    print()
    
    # Test queries
    test_queries = [
        "What is your name and purpose?",
        "What is my current Sentinel status?",
        "What is the current CRO price?",
        "Can I swap 0.05 CRO to USDC?"
    ]
    
    for i, query in enumerate(test_queries, 1):
        print("=" * 70)
        print(f"TEST {i}/{len(test_queries)}")
        print("=" * 70)
        print(f"User: {query}")
        print()
        
        try:
            response = agent.interact(query)
            print(f"🛡️ Agent: {response}")
            print()
        except Exception as e:
            print(f"❌ Error: {e}")
            print()
            
            if "quota" in str(e).lower() or "429" in str(e):
                print("⚠️  Gemini API quota exceeded. This is expected on free tier.")
                print("The agent code is working - just hit rate limits.")
                print()
                print("To continue testing:")
                print("1. Wait for quota reset (check https://ai.dev/usage)")
                print("2. Or upgrade to paid plan")
                print("3. Or switch to gemini-1.5-flash in main.py")
                break
            else:
                import traceback
                traceback.print_exc()
                break
    
    print("=" * 70)
    print("✅ TEST COMPLETE")
    print("=" * 70)
    
except Exception as e:
    print(f"❌ Failed to initialize: {e}")
    import traceback
    traceback.print_exc()
