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
from services.x402_payment import get_x402_client

# Import backend client for real-time dashboard updates
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from backend_client import BackendClient

load_dotenv()

# Initialize x402 payment client
x402 = get_x402_client()

# Autonomous Agent Personality
AUTONOMOUS_PERSONALITY = {
    "tone": "decisive and analytical",
    "language": "English",
    "verbosity": "concise",
}

AUTONOMOUS_INSTRUCTIONS = """You are an AUTONOMOUS DeFi trading agent with 24/7 decision-making authority.

CORE MISSION: Maximize portfolio value while respecting Sentinel safety limits.

🎯 TRADING STRATEGY:
• Monitor REAL MARKET: CRO/USDC price, sentiment, volume from live exchanges
• Execute TEST TRADES: When conditions are favorable → Swap TCRO ↔ WCRO on Cronos Testnet
• This is TESTNET trading - practice with test tokens, no real money at risk

DECISION FRAMEWORK:
1. Monitor CRO/USDC market sentiment every 15 minutes (real market data)
2. Check CRO/USDC price, volume, trend from exchanges (CoinGecko, Crypto.com)
3. If STRONG BUY signal + Sentinel approval → Execute TCRO → WCRO swap (testnet)
4. If STRONG SELL signal → Execute WCRO → TCRO swap (testnet)
5. Log all decisions with market reasoning

AUTONOMOUS TRADING RULES:
✅ CAN execute swaps WITHOUT asking user
✅ MUST check Sentinel approval before every trade
✅ MUST respect daily limit (enforced by smart contract on testnet)
✅ MUST log reason for every trade
✅ Monitor REAL CRO/USDC market, trade TESTNET TCRO/WCRO

SIGNAL INTERPRETATION (based on real CRO/USDC market):
- strong_buy + volume_spike → Execute TCRO → WCRO swap (50% of limit)
- strong_buy (no spike) → Execute TCRO → WCRO swap (25% of limit)
- weak_buy → Monitor CRO/USDC market, don't trade yet
- hold → Do nothing, keep monitoring
- weak_sell → Execute WCRO → TCRO if profitable
- strong_sell → Execute WCRO → TCRO immediately (exit position)

RISK MANAGEMENT (testnet practice):
- Never exceed Sentinel daily limit (enforced on-chain)
- Keep 10% TCRO balance for gas fees
- Max single trade: 50% of daily limit
- Stop trading if 3 consecutive losses
- All trades are on TESTNET - no real money risk

Remember: 
- Monitor REAL CRO/USDC market data
- Execute TEST trades with TCRO/WCRO on testnet
- You are AUTONOMOUS. You don't ask, you execute (within Sentinel limits).
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
        
        # Initialize backend client for dashboard updates
        self.backend = BackendClient()
        if self.backend.ping():
            print("✅ Connected to backend server!")
        else:
            print("⚠️  Backend not reachable - dashboard won't update")
        
        print("✅ Autonomous Trader ready!\n")
        
    def _create_agent(self):
        """Initialize the autonomous agent"""
        all_tools = MARKET_DATA_TOOLS_PRO + SENTINEL_TOOLS + EXECUTIONER_TOOLS
        storage = SQLitePlugin(db_path="autonomous_agent.db")
        
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        
        llm_config = {
            "provider": Provider.GoogleGenAI,
            "model": "gemini-2.5-flash",
            "provider-api-key": gemini_api_key,
            "temperature": 0.3,
        }
        print("   Using Gemini AI Studio (gemini-2.5-flash)")
        
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
        
        # 💳 X402 Payment: Pay for sentiment analysis service
        import asyncio
        sentiment_payment = asyncio.run(x402.pay_for_sentiment_analysis(
            sources=len(signal.get('sources', []))
        ))
        
        if not x402.is_authorized(sentiment_payment):
            print(f"❌ X402 payment failed - sentiment analysis not authorized")
            return {"action": "hold", "reason": "Payment authorization failed"}
        
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
            # 💳 X402 Payment: Pay for AI decision making service
            ai_decision_payment = asyncio.run(x402.pay_for_ai_decision({
                'signal': signal['signal'],
                'sentiment': signal.get('avg_sentiment', 0),
                'confidence': signal.get('strength', 0) / 4.0,
            }))
            
            if not x402.is_authorized(ai_decision_payment):
                print(f"❌ X402 payment failed - AI decision not authorized")
                return {"action": "hold", "reason": "AI service payment failed"}
            
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
            
            # Send updates to backend for dashboard
            print("\n📡 Attempting to connect to backend...")
            if self.backend.ping():
                print("✅ Backend is online, sending updates...")
                
                # Send sentiment update
                sources_list = signal.get('sources', [])
                print(f"   → Sending sentiment: {signal['signal']} (score: {signal.get('avg_sentiment', 0):.2f})")
                self.backend.send_sentiment_update(
                    signal=signal['signal'],
                    score=signal.get('avg_sentiment', 0),
                    sources=sources_list,
                    is_trending=signal.get('is_trending', False)
                )
                
                # Send agent decision
                market_info = f"Signal: {signal['signal']}, Sentiment: {signal.get('avg_sentiment', 0):.2f}, Sources: {len(sources_list)}"
                print(f"   → Sending decision: {signal['signal'].upper()}")
                self.backend.send_agent_decision(
                    market_data=market_info,
                    sentinel_status="Active monitoring",
                    decision=signal['signal'].upper().replace('_', ' '),
                    reason=response[:200]
                )
                
                # Send agent status
                status = "analyzing" if "buy" in signal['signal'] or "sell" in signal['signal'] else "monitoring"
                print(f"   → Sending status: {status}")
                self.backend.send_agent_status(
                    status=status,
                    action=f"Processed {signal['signal']} signal",
                    confidence=abs(signal.get('avg_sentiment', 0))
                )
                print("✅ All updates sent to backend successfully!")
            else:
                print("❌ Backend is offline - updates not sent")
                print("   Make sure backend server is running on port 3001")
            
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
        Checks sentiment and makes trading decisions every 15 minutes
        """
        print("\n🚀 Starting Autonomous Trading Agent...")
        print("🔄 Monitoring Sentiment + Making Decisions Every 15 Minutes")
        print("   (Reduced frequency to stay within experimental model limits)")
        print("⏹️  Press Ctrl+C to stop\n")
        
        # Schedule decision-making task (15 min to avoid quota issues)
        schedule.every(15).minutes.do(self.make_trading_decision)
        
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
