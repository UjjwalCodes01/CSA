"""
Autonomous Trading Agent - Sentinel Alpha Analyst
Uses structured JSON output for deterministic trading decisions
"""
import os
import sys
import json
import time
import schedule
import requests
from typing import Dict
from datetime import datetime
from dotenv import load_dotenv

# Get the directory containing this file
current_dir = os.path.dirname(os.path.abspath(__file__))

# Add paths for imports
sys.path.insert(0, current_dir)
sys.path.insert(0, os.path.join(current_dir, '..'))

from crypto_com_agent_client import Agent, SQLitePlugin
from crypto_com_agent_client.lib.enums.provider_enum import Provider
import google.generativeai as genai

from agents.market_data_agent import MARKET_DATA_TOOLS_PRO
from agents.sentinel_agent import SENTINEL_TOOLS
from agents.executioner_agent import EXECUTIONER_TOOLS

load_dotenv()

# Sentinel Alpha Analyst - Structured Decision System
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


class AutonomousTrader:
    """24/7 autonomous trading system with structured JSON decisions"""
    
    def __init__(self):
        print("🤖 Initializing Autonomous Trader...")
        self.trade_history = []
        self.consecutive_losses = 0
        self.is_active = True
        
        # Initialize Gemini
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel(
            'gemini-2.5-flash',
            generation_config={"response_mime_type": "application/json"}
        )
        
        # Initialize agent with tools (for execution)
        self.agent = self._create_agent()
        print("✅ Autonomous Trader ready!\n")
    
    def fetch_reddit_data(self):
        """Fetch Reddit posts via free Reddit JSON API"""
        try:
            url = "https://www.reddit.com/r/CryptoCurrency/search.json"
            params = {
                "q": "Cronos OR CRO",
                "limit": 10,
                "sort": "new",
                "restrict_sr": "true"
            }
            headers = {"User-Agent": "CronosSentinel/1.0"}
            
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                reddit_texts = []
                
                for child in data['data']['children']:
                    post = child['data']
                    title = post.get('title', '')
                    text = post.get('selftext', '')
                    reddit_texts.append(f"{title} {text}")
                
                if reddit_texts:
                    print(f"   ✓ Reddit: {len(reddit_texts)} real posts")
                    return reddit_texts[:10]
        
        except Exception as e:
            print(f"   ⚠️  Reddit API failed: {e}")
        
        # Fallback to mock
        print("   ⚠️  Using mock Reddit data")
        return [
            "CRO is looking bullish! LFG! 🚀",
            "Diamond hands on Cronos",
            "VVS Finance volume spike"
        ]
    
    def fetch_coingecko_data(self):
        """Fetch CoinGecko market data"""
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
    
    def get_structured_decision(self) -> Dict:
        """Get structured JSON decision from Gemini"""
        # Fetch data
        reddit_data = self.fetch_reddit_data()
        coingecko_data = self.fetch_coingecko_data()
        
        # Prepare payload
        data_payload = f"""
REDDIT_DATA (Recent r/Cronos posts):
{json.dumps(reddit_data, indent=2)}

COINGECKO_DATA:
{json.dumps(coingecko_data, indent=2)}
"""
        
        try:
            full_prompt = f"{SENTINEL_SYSTEM_PROMPT}\n\nDATA:\n{data_payload}"
            response = self.model.generate_content(full_prompt)
            decision = json.loads(response.text)
            return decision
        except Exception as e:
            print(f"❌ Decision error: {e}")
            return None
    
    def _create_agent(self):
        """Initialize the agent for execution tools"""
        all_tools = MARKET_DATA_TOOLS_PRO + SENTINEL_TOOLS + EXECUTIONER_TOOLS
        storage = SQLitePlugin(db_path="autonomous_agent.db")
        
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        
        llm_config = {
            "provider": Provider.GoogleGenAI,
            "model": "gemini-2.5-flash",
            "provider-api-key": gemini_api_key,
            "temperature": 0.3,
        }
        print("   Using Gemini 2.5-flash for tool execution")
        
        agent = Agent.init(
            llm_config=llm_config,
            blockchain_config={
                "api-key": os.getenv("DEVELOPER_PLATFORM_API_KEY"),
                "private-key": os.getenv("PRIVATE_KEY"),
                "timeout": 30,
            },
            plugins={
                "personality": {"tone": "concise"},
                "instructions": "Execute trades as instructed. Use tools to check Sentinel and execute swaps.",
                "tools": all_tools,
                "storage": storage,
            },
        )
        
        return agent
    
    def make_trading_decision(self) -> Dict:
        """Core decision-making function - called every 5 minutes"""
        print(f"\n{'='*60}")
        print(f"🤖 AUTONOMOUS TRADER - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")
        
        # 1. Check if trading is active
        if not self.is_active:
            print("⏸️  Trading paused (too many losses)")
            return {"action": "paused", "reason": "Risk management"}
        
        # 2. Get structured decision from Sentinel Alpha Analyst
        print("📊 Collecting market data...")
        decision = self.get_structured_decision()
        
        if not decision:
            print("❌ Failed to get decision")
            return {"action": "hold", "reason": "Decision error"}
        
        # Print decision details
        print(f"\n✅ SENTINEL ALPHA DECISION:")
        print(f"   Sentiment Score: {decision['sentiment_score']:.3f}")
        print(f"   Market Momentum: {decision['market_momentum']:.3f}")
        print(f"   Decision: {decision['final_decision'].upper()}")
        print(f"   Risk Level: {decision['risk_level'].upper()}")
        print(f"   Reasoning: {decision['reasoning_short']}")
        
        # 3. Check for emergency stop
        if decision['risk_level'] == 'emergency':
            print("🚨 EMERGENCY STOP - Suspicious activity detected")
            self.is_active = False
            return {"action": "emergency_stop", "reason": decision['reasoning_short']}
        
        # 4. Execute based on decision
        score = decision['sentiment_score']
        final_decision = decision['final_decision']
        risk = decision['risk_level']
        
        # Determine trade size based on confidence and risk
        if risk == 'low' and abs(score) > 0.7:
            amount = 0.5  # 50% of daily limit (1 CRO max, so 0.5 CRO)
        elif risk == 'medium' and abs(score) > 0.5:
            amount = 0.3  # 30% of daily limit
        else:
            amount = 0  # No trade
        
        # 5. Execute trade via agent if conditions met
        if final_decision == 'buy' and amount > 0:
            print(f"\n🚀 EXECUTING BUY: {amount} CRO → USDC")
            try:
                prompt = f"Execute swap {amount} CRO to USDC via Sentinel. Check status first, then execute if safe."
                response = self.agent.interact(prompt)
                print(f"✅ Trade executed: {response[:200]}")
                
                # Log success
                decision_log = {
                    "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "action": "buy",
                    "amount": amount,
                    "sentiment": score,
                    "risk": risk,
                    "reasoning": decision['reasoning_short'],
                    "result": "success"
                }
                self.trade_history.append(decision_log)
                self._log_to_file(decision_log)
                
                return {"action": "buy", "amount": amount, "result": "success"}
            
            except Exception as e:
                print(f"❌ Trade failed: {e}")
                self.consecutive_losses += 1
                if self.consecutive_losses >= 3:
                    print("⛔ Pausing trading after 3 consecutive failures")
                    self.is_active = False
                
                decision_log = {
                    "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "action": "buy_failed",
                    "amount": amount,
                    "sentiment": score,
                    "risk": risk,
                    "error": str(e)
                }
                self.trade_history.append(decision_log)
                self._log_to_file(decision_log)
                
                return {"action": "buy_failed", "reason": str(e)}
        
        elif final_decision == 'sell' and amount > 0:
            print(f"\n📉 EXECUTING SELL: {amount * 100} USDC → CRO")  # Approximate conversion
            try:
                prompt = f"Execute swap {amount * 100} USDC to CRO via Sentinel. Check status first, then execute if safe."
                response = self.agent.interact(prompt)
                print(f"✅ Trade executed: {response[:200]}")
                
                # Log success
                decision_log = {
                    "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "action": "sell",
                    "amount": amount * 100,
                    "sentiment": score,
                    "risk": risk,
                    "reasoning": decision['reasoning_short'],
                    "result": "success"
                }
                self.trade_history.append(decision_log)
                self._log_to_file(decision_log)
                
                return {"action": "sell", "amount": amount * 100, "result": "success"}
            
            except Exception as e:
                print(f"❌ Trade failed: {e}")
                self.consecutive_losses += 1
                if self.consecutive_losses >= 3:
                    print("⛔ Pausing trading after 3 consecutive failures")
                    self.is_active = False
                
                decision_log = {
                    "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "action": "sell_failed",
                    "amount": amount * 100,
                    "sentiment": score,
                    "risk": risk,
                    "error": str(e)
                }
                self.trade_history.append(decision_log)
                self._log_to_file(decision_log)
                
                return {"action": "sell_failed", "reason": str(e)}
        
        else:
            print(f"💤 HOLD - Conditions not met (score: {score:.3f}, risk: {risk})")
            decision_log = {
                "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "action": "hold",
                "sentiment": score,
                "risk": risk,
                "reasoning": decision['reasoning_short']
            }
            self.trade_history.append(decision_log)
            self._log_to_file(decision_log)
            
            return {"action": "hold", "sentiment": score}
    
    def _log_to_file(self, decision_log: Dict):
        """Log decision to file"""
        with open("autonomous_trade_log.txt", "a") as f:
            f.write(f"\n{'='*60}\n")
            f.write(f"Time: {decision_log['timestamp']}\n")
            f.write(f"Action: {decision_log.get('action', 'N/A')}\n")
            f.write(f"Sentiment: {decision_log.get('sentiment', 0):.3f}\n")
            f.write(f"Risk: {decision_log.get('risk', 'N/A')}\n")
            if 'reasoning' in decision_log:
                f.write(f"Reasoning: {decision_log['reasoning']}\n")
            if 'result' in decision_log:
                f.write(f"Result: {decision_log['result']}\n")
            if 'error' in decision_log:
                f.write(f"Error: {decision_log['error']}\n")
    
    def run_forever(self):
        """
        Main loop - runs 24/7
        Checks sentiment and makes trading decisions every 5 minutes
        """
        print("\n🚀 Starting Autonomous Trading Agent...")
        print("🔄 Monitoring Sentiment + Making Decisions Every 5 Minutes")
        print("⏹️  Press Ctrl+C to stop\n")
        
        # Schedule decision-making task
        schedule.every(5).minutes.do(self.make_trading_decision)
        
        # Run first decision immediately
        self.make_trading_decision()
        
        # Main loop
        try:
            while True:
                schedule.run_pending()
                time.sleep(30)  # Check every 30 seconds
        except KeyboardInterrupt:
            print("\n\n⏹️  Stopping Autonomous Trader...")
            print(f"📊 Total decisions made: {len(self.trade_history)}")
            print("✅ Shutdown complete")


# Test mode (manual single decision)
def test_autonomous_decision():
    """Test a single autonomous trading decision"""
    print("🧪 Testing Autonomous Trader (Single Decision Mode)\n")
    
    trader = AutonomousTrader()
    
    # Get sentiment (no need for monitoring cycle call)
    print("\n1️⃣ Getting multi-source sentiment...")
    signal = trader.sentiment_aggregator.aggregate_sentiment("crypto-com-chain")
    print(f"   Signal: {signal['signal']}, Strength: {signal['strength']}")
    
    # Make one decision
    print("\n2️⃣ Making trading decision...")
    decision = trader.make_trading_decision()
    
    print("\n✅ Test complete!")
    return decision


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Test mode: make one decision
        test_autonomous_decision()
    else:
        # Production mode: run forever
        trader = AutonomousTrader()
        trader.run_forever()
