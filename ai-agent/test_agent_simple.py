"""
Simple test to verify agent initialization
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

print("Testing agent initialization...")
print()

try:
    # Add src to path
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
    
    # Import main
    from main import create_agent
    
    print("Creating agent...")
    agent = create_agent()
    
    print("✅ Agent created successfully!")
    print()
    print("Testing a simple query...")
    
    # Test with a simple market query
    response = agent.interact("What is your name and purpose?")
    print(f"\n🛡️ Agent: {response}\n")
    
    print("✅ Agent is working! Ready for full testing.")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
