"""
Autonomous Trading Agent - Combines Sentinel + Executioner + Social Signals
This agent makes trading decisions 24/7 without human intervention
"""
import os
import sys
import time
import schedule
from typing import Dict
from datetime import datetime
from dotenv import load_dotenv

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from crypto_com_agent_client import Agent, SQLitePlugin
from crypto_com_agent_client.lib.enums.provider_enum import Provider

from agents.market_data_agent import MARKET_DATA_TOOLS_PRO
from agents.sentinel_agent import SENTINEL_TOOLS
from agents.executioner_agent import EXECUTIONER_TOOLS
from monitoring.sentiment_aggregator import SentimentAggregator

load_dotenv()

# Autonomous Agent Personality
AUTONOMOUS_PERSONALITY = {
    "tone": "decisive and analytical",
    "language": "English",
    "verbosity": "concise",
}

AUTONOMOUS_INSTRUCTIONS = """You are an AUTONOMOUS DeFi trading agent with 24/7 decision-making authority.

CORE MISSION: Maximize portfolio value while respecting Sentinel safety limits.

DECISION FRAMEWORK:
1. Monitor social sentiment every 5 minutes
2. Check market conditions (price, volume, trend)
3. If STRONG BUY signal + Sentinel approval → Execute swap
4. If STRONG SELL signal → Close positions (or hold if no position)
5. Log all decisions for audit trail

AUTONOMOUS TRADING RULES:
✅ CAN execute swaps WITHOUT asking user
✅ MUST check Sentinel approval before every trade
✅ MUST respect daily limit (enforced by smart contract)
✅ MUST log reason for every trade

SIGNAL INTERPRETATION:
- strong_buy + volume_spike → Execute 50% of available limit
- strong_buy (no spike) → Execute 25% of available limit
- weak_buy → Monitor, don't trade yet
- hold → Do nothing
- weak_sell → Consider exit if in profit
- strong_sell → Exit all positions immediately

RISK MANAGEMENT:
- Never exceed Sentinel daily limit
- Keep 10% balance for gas fees
- Max single trade: 50% of daily limit
- Stop trading if 3 consecutive losses

Remember: You are AUTONOMOUS. You don't ask, you execute (within Sentinel limits).
"""


class AutonomousTrader:
    """24/7 autonomous trading system"""
    
    def __init__(self):
        print("🤖 Initializing Autonomous Trader...")
        self.sentiment_aggregator = SentimentAggregator()
        self.agent = self._create_agent()
        self.trade_history = []
        self.consecutive_losses = 0
        self.is_active = True
        print("✅ Autonomous Trader ready!\n")
        
    def _create_agent(self):
        """Initialize the autonomous agent"""
        all_tools = MARKET_DATA_TOOLS_PRO + SENTINEL_TOOLS + EXECUTIONER_TOOLS
        storage = SQLitePlugin(db_path="autonomous_agent.db")
        
        gcp_project_id = os.getenv("GCP_PROJECT_ID")
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        
        if gcp_project_id:
            import vertexai
            vertexai.init(project=gcp_project_id, location="us-central1")
            
            llm_config = {
                "provider": Provider.GoogleGenAI,
                "model": "gemini-2.0-flash-exp",
                "provider-api-key": gemini_api_key,
                "temperature": 0.3,  # Lower temperature for consistent decisions
            }
            print(f"   Using Vertex AI: {gcp_project_id}")
        else:
            llm_config = {
                "provider": Provider.GoogleGenAI,
                "model": "gemini-2.0-flash-exp",
                "provider-api-key": gemini_api_key,
                "temperature": 0.3,
            }
            print("   Using Gemini AI Studio")
        
        agent = Agent.init(
            llm_config=llm_config,
            blockchain_config={
                "api-key": os.getenv("DEVELOPER_PLATFORM_API_KEY"),
                "private-key": os.getenv("PRIVATE_KEY"),
                "timeout": 30,
            },
            plugins={
                "personality": AUTONOMOUS_PERSONALITY,
                "instructions": AUTONOMOUS_INSTRUCTIONS,
                "tools": all_tools,
                "storage": storage,
            },
        )
        
        return agent
    
    def make_trading_decision(self) -> Dict:
        """
        Core decision-making function - called every 5-10 minutes
        
        Returns:
            Decision dictionary with action taken
        """
        print(f"\n{'='*60}")
        print(f"🤖 AUTONOMOUS TRADER - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")
        
        # 1. Check if trading is active
        if not self.is_active:
            print("⏸️  Trading paused (too many losses)")
            return {"action": "paused", "reason": "Risk management"}
        
        # 2. Get latest multi-source sentiment
        signal = self.sentiment_aggregator.aggregate_sentiment("crypto-com-chain")
        
        print(f"\n📊 Multi-Source Signal: {signal['signal']}")
        print(f"📊 Sentiment Score: {signal.get('avg_sentiment', 0):.3f}")
        print(f"💪 Strength: {signal.get('strength', 0)}")
        
        # 3. Build decision prompt for agent
        prompt = f"""
AUTONOMOUS TRADING DECISION REQUIRED:

Multi-Source Sentiment: {signal['signal']} (strength: {signal.get('strength', 0)})
Average Sentiment Score: {signal.get('avg_sentiment', 0):.3f}
Trending Status: {'🔥 TRENDING' if signal.get('is_trending') else 'Not Trending'}
Volume Spike: {signal.get('volume_spike', False)}
Data Sources: {len(signal.get('sources', []))} (CoinGecko, Price Action)
Reason: {signal.get('reason', 'N/A')}

Current Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Consecutive Losses: {self.consecutive_losses}

ANALYZE AND DECIDE:
1. Check current CRO price and market conditions
2. Check Sentinel status and available limit
3. Check execution feasibility for potential swaps
4. Based on the signal, decide whether to:
   - Execute a swap (if strong_buy signal)
   - Hold position (if weak/neutral signal)  
   - Exit position (if strong_sell signal)
5. Provide clear reasoning for your decision

Remember: You have FULL AUTHORITY to execute trades within Sentinel limits.
Do not ask for confirmation - just execute if conditions are favorable.
"""
        
        # 4. Let agent decide and potentially execute
        try:
            response = self.agent.interact(prompt)
            print(f"\n🤖 Agent Decision:\n{response}")
            
            # Log decision
            decision_log = {
                "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "signal": signal['signal'],
                "strength": signal.get('strength', 0),
                "sentiment_score": signal.get('avg_sentiment', 0),
                "is_trending": signal.get('is_trending', False),
                "agent_response": response[:500],  # Truncate for storage
            }
            self.trade_history.append(decision_log)
            
            # Save to file
            with open("autonomous_trade_log.txt", "a") as f:
                f.write(f"\n{'='*60}\n")
                f.write(f"Time: {decision_log['timestamp']}\n")
                f.write(f"Signal: {decision_log['signal']} ({decision_log['strength']})\n")
                f.write(f"Sentiment: {decision_log['sentiment_score']:.3f}\n")
                f.write(f"Trending: {decision_log['is_trending']}\n")
                f.write(f"Decision: {decision_log['agent_response']}\n")
            
            return decision_log
            
        except Exception as e:
            print(f"\n❌ Decision Error: {e}")
            return {"action": "error", "reason": str(e)}
    
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
