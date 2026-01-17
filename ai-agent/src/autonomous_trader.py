"""
Autonomous Trading Agent - Combines Sentinel + Executioner + Social Signals
This agent makes trading decisions 24/7 without human intervention
"""
import os
import sys
import time
import requests
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
from agents.multi_agent_council import MultiAgentCouncil
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
        print("🤖 Initializing Autonomous Trader with Multi-Agent Council...")
        self.sentiment_aggregator = SentimentAggregator()
        
        # Initialize multi-agent council
        all_tools = MARKET_DATA_TOOLS_PRO + SENTINEL_TOOLS + EXECUTIONER_TOOLS
        self.council = MultiAgentCouncil(tools=all_tools)
        
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
        sentiment_payment = x402.pay_for_sentiment_analysis(
            sources=len(signal.get('sources', []))
        )
        
        if not x402.is_authorized(sentiment_payment):
            print(f"❌ X402 payment failed - sentiment analysis not authorized")
            return {"action": "hold", "reason": "Payment authorization failed"}
        
        # 3. Get council voting decision
        try:
            # 💳 X402 Payment: Pay for multi-agent council voting
            council_payment = x402.pay_for_multi_agent_vote({
                'signal': signal['signal'],
                'sentiment': signal.get('avg_sentiment', 0),
                'confidence': signal.get('strength', 0) / 4.0,
                'agents': 3
            })
            
            if not x402.is_authorized(council_payment):
                print(f"❌ X402 payment failed - council voting not authorized")
                return {"action": "hold", "reason": "Council voting payment failed"}
            
            # Get votes from 3 AI agents
            council_result = self.council.vote_on_trade(
                market_data={
                    'signal': signal['signal'],
                    'sentiment_score': signal.get('avg_sentiment', 0),
                    'strength': signal.get('strength', 0)
                },
                sentiment_signal=signal
            )
            
            print(f"\n🗳️  Council Decision: {council_result['consensus'].upper()}")
            print(f"💪 Confidence: {council_result['confidence']:.2f}")
            print(f"📊 Votes:")
            for vote in council_result['votes']:
                print(f"   {vote['agent']}: {vote['vote'].upper()} ({vote['confidence']:.2f})")
            
            response = f"Council consensus: {council_result['consensus'].upper()} (confidence: {council_result['confidence']:.2f})"
            print(f"\n🤖 Multi-Agent Decision:\n{response}")
            
            # Log decision with council votes
            decision_log = {
                "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "signal": signal['signal'],
                "strength": signal.get('strength', 0),
                "sentiment_score": signal.get('avg_sentiment', 0),
                "is_trending": signal.get('is_trending', False),
                "council_votes": council_result['votes'],
                "consensus": council_result['consensus'],
                "confidence": council_result['confidence'],
                "agent_response": response,
            }
            self.trade_history.append(decision_log)
            
            # Send updates to backend for dashboard
            print("\n📡 Attempting to connect to backend...")
            if self.backend.ping():
                print("✅ Backend is online, sending updates...")
                
                # Send sentiment update
                sources_list = signal.get('sources', [])
                weights = signal.get('weights', {"coingecko": 25, "news": 25, "social": 25, "technical": 25})
                print(f"   → Sending sentiment: {signal['signal']} (score: {signal.get('avg_sentiment', 0):.2f})")
                self.backend.send_sentiment_update(
                    signal=signal['signal'],
                    score=signal.get('avg_sentiment', 0),
                    sources=sources_list,
                    weights=weights,
                    is_trending=signal.get('is_trending', False)
                )
                
                # Send price update from CoinGecko data
                coingecko_data = next((s for s in signal.get('sources', []) if s.get('source') == 'coingecko'), None)
                if coingecko_data and coingecko_data.get('price'):
                    price = coingecko_data['price']
                    price_change = coingecko_data.get('price_change_24h', 0)
                    print(f"   → Sending price: ${price:.4f} ({price_change:+.2f}%)")
                    self.backend.send_price_update(
                        price=price,
                        change_24h=price_change
                    )
                
                # Send council votes
                print(f"   → Sending council votes: {council_result['consensus'].upper()}")
                self.backend.send_council_votes(
                    votes=council_result['votes'],
                    consensus=council_result['consensus'],
                    confidence=council_result['confidence'],
                    agreement=council_result['agreement']
                )
                
                # Send agent decision
                market_info = f"Signal: {signal['signal']}, Consensus: {council_result['consensus'].upper()}, Confidence: {council_result['confidence']:.2f}"
                print(f"   → Sending decision: {council_result['consensus'].upper()}")
                self.backend.send_agent_decision(
                    market_data=market_info,
                    sentinel_status="Active monitoring",
                    decision=council_result['consensus'].upper().replace('_', ' '),
                    reason=f"Council vote: {council_result['agreement']}"
                )
                
                # Send agent status
                status = "analyzing" if "buy" in council_result['consensus'] or "sell" in council_result['consensus'] else "monitoring"
                print(f"   → Sending status: {status}")
                self.backend.send_agent_status(
                    status=status,
                    action=f"Council voted: {council_result['consensus'].upper()}",
                    confidence=council_result['confidence']
                )
                print("✅ All updates sent to backend successfully!")
            else:
                print("❌ Backend is offline - updates not sent")
                print("   Make sure backend server is running on port 3001")
            
            # Execute trade based on council decision
            consensus = council_result['consensus'].lower()
            confidence = council_result['confidence']
            
            if consensus in ['strong_buy', 'buy'] and confidence >= 0.65:
                print(f"\n💰 Executing BUY trade (confidence: {confidence:.2f})...")
                try:
                    from agents.executioner_agent import execute_swap_autonomous
                    
                    # Execute small test trade (0.1 CRO)
                    trade_amount = 0.1
                    min_output = trade_amount * 0.95  # 5% slippage tolerance
                    reason = f"Council BUY decision: {council_result['agreement']}"
                    
                    # Use .invoke() method for LangChain tools
                    result = execute_swap_autonomous.invoke({
                        "amount_cro": trade_amount,
                        "token_out": "WCRO",
                        "min_output": min_output,
                        "reason": reason
                    })
                    
                    if isinstance(result, dict) and result.get('status') == 'success':
                        print(f"✅ Trade executed successfully!")
                        print(f"   Amount: {trade_amount} CRO → WCRO")
                        print(f"   TX: {result.get('tx_hash', 'N/A')}")
                        
                        # Notify backend about successful trade
                        try:
                            print(f"   📡 Notifying frontend...")
                            trade_notification = {
                                "id": f"ai_trade_{int(time.time())}",
                                "type": "autonomous",
                                "symbol": "WCRO",
                                "amount": trade_amount,
                                "side": "buy",
                                "status": "executed",
                                "txHash": result.get('tx_hash'),
                                "executedPrice": "on-chain",
                                "executedAmount": trade_amount,
                                "agent": "ai_autonomous",
                                "walletAddress": os.getenv("AGENT_ADDRESS", "0xa22Db5E0d0df88424207B6fadE76ae7a6FAABE94"),
                                "realTransaction": True,
                                "reason": reason,
                                "timestamp": datetime.now().isoformat()
                            }
                            
                            trade_response = requests.post(
                                "http://localhost:3001/api/trades/manual",
                                json=trade_notification,
                                timeout=5
                            )
                            
                            if trade_response.status_code == 200:
                                print(f"   ✅ Trade broadcasted to frontend")
                            else:
                                print(f"   ⚠️  Failed to broadcast trade: {trade_response.status_code}")
                        except Exception as notify_err:
                            print(f"   ⚠️  Trade notification failed: {notify_err}")
                    else:
                        error_msg = result.get('reason', str(result)) if isinstance(result, dict) else str(result)
                        print(f"❌ Trade failed: {error_msg}")
                except Exception as e:
                    print(f"❌ Trade execution error: {e}")
                    import traceback
                    traceback.print_exc()
            
            elif consensus in ['strong_sell', 'sell'] and confidence >= 0.65:
                print(f"\n💰 Executing SELL trade (confidence: {confidence:.2f})...")
                print(f"⚠️  Note: execute_swap_autonomous only supports CRO→Token swaps")
                print(f"   WCRO→CRO swaps need to be implemented separately")
                print(f"   Skipping trade execution for now...")
                # TODO: Implement reverse swap or token approval logic for WCRO→CRO
                # try:
                #     from agents.executioner_agent import execute_swap_autonomous
                #     # Need different function for reverse swaps
                # except Exception as e:
                #     print(f"❌ Trade execution error: {e}")
            else:
                print(f"\n⏸️  No trade executed: {consensus.upper()} (confidence: {confidence:.2f} < 0.65 threshold)")
            
            # Save to file
            with open("autonomous_trade_log.txt", "a") as f:
                f.write(f"\n{'='*60}\n")
                f.write(f"Time: {decision_log['timestamp']}\n")
                f.write(f"Signal: {decision_log['signal']} ({decision_log['strength']})\n")
                f.write(f"Sentiment: {decision_log['sentiment_score']:.3f}\n")
                f.write(f"Trending: {decision_log['is_trending']}\n")
                f.write(f"Council Consensus: {decision_log['consensus']} (confidence: {decision_log['confidence']:.2f})\n")
                for vote in council_result['votes']:
                    f.write(f"  {vote['agent']}: {vote['vote']} ({vote['confidence']:.2f}) - {vote['reasoning'][:100]}\n")
            
            return decision_log
            
        except Exception as e:
            print(f"\n❌ Decision Error: {e}")
            import traceback
            traceback.print_exc()
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
