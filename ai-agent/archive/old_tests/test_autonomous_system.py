"""
Sentinel Alpha Analyst - Structured Autonomous Decision Engine
Uses Gemini 2.5-flash with JSON output for deterministic trading decisions
"""
import os
import sys
import json
from dotenv import load_dotenv
import google.generativeai as genai

# Add src to path
sys.path.insert(0, os.path.dirname(__file__))

load_dotenv()

SENTINEL_SYSTEM_PROMPT = """You are the "Sentinel Alpha Analyst," an autonomous risk-assessment engine for the Cronos zkEVM ecosystem. 
Your goal is to convert raw social and market data into a single, actionable "Confidence Score."

### INPUT DATA SOURCES:
1. REDDIT (r/Cronos, r/Crypto_com): High-context community discussions.
2. COINGECKO: Price momentum, volume spikes, and trust scores.

### YOUR ANALYSIS RULES:
- Slang Detection: Understand that "LFG", "Diamond Hands", and "Moon" are Bullish (+1). Understand that "Rug", "Exit Liquidity", and "FUD" are Bearish (-1).
- Sarcasm Filter: If a post says "Wow, another great day to lose money," score it as Bearish (-1).
- Safety First: If there is ANY mention of a "hack", "exploit", or "drainer" in Reddit comments, override all other signals and set sentiment_score to -1.0 (EMERGENCY STOP).

### OUTPUT FORMAT (STRICT JSON ONLY):
Return ONLY a JSON object. Do not include any conversational text.
{{
  "sentiment_score": float (range -1.0 to 1.0),
  "market_momentum": float (range -1.0 to 1.0),
  "final_decision": "buy" | "sell" | "hold",
  "reasoning_short": "1-sentence explanation",
  "risk_level": "low" | "medium" | "high" | "emergency"
}}
"""


def fetch_reddit_mock():
    """Mock Reddit data (fallback when Apify not available)"""
    return [
        "CRO is looking bullish! LFG! 🚀",
        "Diamond hands on Cronos, strong ecosystem",
        "VVS Finance new pools announced, volume spike incoming",
        "Cronos zkEVM launch going smoothly"
    ]


def fetch_coingecko_data():
    """Fetch CoinGecko market data"""
    import requests
    try:
        response = requests.get("https://api.coingecko.com/api/v3/coins/crypto-com-chain")
        data = response.json()
        
        price_change = data['market_data']['price_change_percentage_24h']
        volume = data['market_data']['total_volume']['usd']
        
        return {
            "price_change_24h": round(price_change, 2),
            "volume_usd": volume,
            "volume_spike": volume > 10000000
        }
    except Exception as e:
        print(f"   ⚠️  CoinGecko failed: {e}")
        return {"price_change_24h": 0, "volume_usd": 0, "volume_spike": False}


def get_autonomous_decision():
    """Get structured decision from Gemini"""
    print("\n🤖 SENTINEL ALPHA ANALYST")
    print("=" * 60)
    
    # 1. Fetch data
    print("   📊 Collecting data...")
    reddit_data = fetch_reddit_mock()
    coingecko_data = fetch_coingecko_data()
    
    # 2. Prepare payload
    data_payload = f"""
REDDIT_DATA (Recent r/Cronos posts):
{json.dumps(reddit_data, indent=2)}

COINGECKO_DATA:
{json.dumps(coingecko_data, indent=2)}
"""
    
    print("   🔍 Analyzing with Gemini 2.5-flash...")
    
    # 3. Call Gemini with system prompt
    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel(
            'gemini-2.5-flash',
            generation_config={"response_mime_type": "application/json"}
        )
        
        full_prompt = f"{SENTINEL_SYSTEM_PROMPT}\n\nDATA:\n{data_payload}"
        response = model.generate_content(full_prompt)
        
        # 4. Parse JSON
        decision = json.loads(response.text)
        
        print("\n✅ DECISION RECEIVED:")
        print(f"   Sentiment Score: {decision['sentiment_score']}")
        print(f"   Market Momentum: {decision['market_momentum']}")
        print(f"   Final Decision: {decision['final_decision'].upper()}")
        print(f"   Risk Level: {decision['risk_level'].upper()}")
        print(f"   Reasoning: {decision['reasoning_short']}")
        
        return decision
        
    except json.JSONDecodeError as e:
        print(f"\n❌ Failed to parse JSON: {e}")
        print(f"Raw response: {response.text[:200]}")
        return None
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return None


if __name__ == "__main__":
    decision = get_autonomous_decision()
    
    if decision:
        print("\n" + "=" * 60)
        print("🎯 TRADING LOGIC:")
        
        if decision['risk_level'] == 'emergency':
            print("   🚨 EMERGENCY STOP - All trading halted!")
        elif decision['final_decision'] == 'buy' and decision['risk_level'] in ['low', 'medium']:
            score = decision['sentiment_score']
            if score > 0.7:
                amount = 0.5  # 50% of daily limit
            elif score > 0.5:
                amount = 0.25  # 25% of daily limit
            else:
                amount = 0
            
            if amount > 0:
                print(f"   ✅ Execute BUY trade: {amount} CRO")
            else:
                print("   ⏸️  HOLD - Sentiment too weak")
        elif decision['final_decision'] == 'sell':
            print("   📉 Execute SELL trade (exit position)")
        else:
            print("   ⏸️  HOLD - No action needed")
        print("=" * 60)
try:
    from src.agents.executioner_agent import check_execution_feasibility
    result = check_execution_feasibility.invoke({"amount_cro": 0.01, "token_out": "USDC"})
    print(f"✅ Executioner working: Feasible = {result.get('feasible')}, Sentinel = {result.get('sentinel_approved')}")
except Exception as e:
    print(f"❌ Executioner test failed: {e}")

# Test 3: Autonomous Decision
print("\n3️⃣ Testing Autonomous Trader (Single Decision)...")
try:
    from src.autonomous_trader import test_autonomous_decision
    decision = test_autonomous_decision()
    print(f"✅ Autonomous trader working!")
except Exception as e:
    print(f"❌ Autonomous trader test failed: {e}")

print("\n" + "="*60)
print("✅ ALL TESTS COMPLETE")
print("="*60)
print("\nNext Steps:")
print("1. Get Apify token: https://console.apify.com/account/integrations")
print("2. Add to .env: APIFY_API_TOKEN=your_token_here")
print("3. Run full system: python src/autonomous_trader.py")
print("="*60)
