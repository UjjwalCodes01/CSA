#!/usr/bin/env python3
"""
Quick test to force autonomous trader decision with debug
"""
import sys
import os

# Add paths
sys.path.insert(0, 'src')
sys.path.insert(0, '.')

from datetime import datetime
from agents.executioner_agent import check_execution_feasibility
from crypto_com_agent_client import Agent
from crypto_com_agent_client.lib.enums.provider_enum import Provider
from agents.market_data_agent import MARKET_DATA_TOOLS_PRO
from agents.sentinel_agent import SENTINEL_TOOLS
from agents.executioner_agent import EXECUTIONER_TOOLS
from dotenv import load_dotenv

load_dotenv()

print("🔍 Testing autonomous trader tool calling...")

# Create agent with same config as autonomous trader
all_tools = MARKET_DATA_TOOLS_PRO + SENTINEL_TOOLS + EXECUTIONER_TOOLS

llm_config = {
    "provider": Provider.GoogleGenAI,
    "model": "gemini-2.5-flash",
    "provider-api-key": os.getenv("GEMINI_API_KEY"),
    "temperature": 0.3,
}

agent = Agent.init(
    llm_config=llm_config,
    blockchain_config={
        "api-key": os.getenv("DEVELOPER_PLATFORM_API_KEY"),
        "private-key": os.getenv("PRIVATE_KEY"),
        "timeout": 30,
    },
    plugins={
        "tools": all_tools,
    },
)

# Test the exact prompt that causes the issue
prompt = """
I have a strong_buy signal with score 0.649 and strength 3.

Please check the execution feasibility for a 2 CRO swap to WCRO using the check_execution_feasibility tool.

Just call the tool and report the exact results.
"""

print("🚀 Calling agent with feasibility check...")
try:
    response = agent.chat(
        message=prompt,
        message_history=[],
        **kwargs
    )
    print("📋 Agent Response:")
    print(response)
except Exception as e:
    print(f"❌ Error: {e}")
    print("Let me try a direct tool call instead...")
    
    # Direct tool call test
    print("\n🔧 Direct tool call test:")
    result = check_execution_feasibility.invoke({"amount_cro": 2.0, "token_out": "WCRO"})
    print(f"Direct result: feasible={result.get('feasible')}, sentinel_approved={result.get('sentinel_approved')}")