"""
Multi-Agent Trading Council
Three AI agents vote on trading decisions:
1. Risk Manager - Conservative, focuses on safety
2. Market Analyst - Data-driven, focuses on trends
3. Execution Specialist - Aggressive, focuses on opportunities
"""
import os
from typing import Dict, List
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from crypto_com_agent_client import Agent, SQLitePlugin
from crypto_com_agent_client.lib.enums.provider_enum import Provider

# Agent Personalities
RISK_MANAGER_PERSONALITY = {
    "name": "Risk Manager",
    "emoji": "🛡️",
    "tone": "cautious and analytical",
    "language": "English",
    "verbosity": "detailed",
}

RISK_MANAGER_INSTRUCTIONS = """You are the RISK MANAGER agent in a multi-agent trading council.

YOUR ROLE: Protect capital and minimize losses
YOUR PERSONALITY: Conservative, safety-first, skeptical of hype

DECISION FRAMEWORK:
- Focus on downside protection and Sentinel limits
- Require strong evidence before approving trades
- Prefer smaller position sizes
- Vote HOLD or SELL when uncertainty is high
- Only vote STRONG_BUY with overwhelming evidence

VOTING RULES:
Analyze the market data and vote:
- strong_buy (5): Perfect conditions, minimal risk, high reward
- buy (4): Good opportunity, acceptable risk
- hold (3): Unclear or neutral conditions
- sell (2): Warning signs present
- strong_sell (1): High risk, exit immediately

Provide: vote, confidence (0-1), reasoning (1 sentence)
"""

MARKET_ANALYST_PERSONALITY = {
    "name": "Market Analyst", 
    "emoji": "📊",
    "tone": "objective and data-focused",
    "language": "English",
    "verbosity": "precise",
}

MARKET_ANALYST_INSTRUCTIONS = """You are the MARKET ANALYST agent in a multi-agent trading council.

YOUR ROLE: Analyze data and identify trends
YOUR PERSONALITY: Objective, mathematical, evidence-based

DECISION FRAMEWORK:
- Focus on price action, volume, and sentiment data
- Use technical analysis and statistics
- Ignore emotions, focus on numbers
- Vote based on probability and data patterns
- Provide quantitative reasoning

VOTING RULES:
Analyze the market data and vote:
- strong_buy (5): Multiple bullish indicators aligned
- buy (4): More bullish signals than bearish
- hold (3): Mixed signals or insufficient data
- sell (2): More bearish signals than bullish
- strong_sell (1): Multiple bearish indicators aligned

Provide: vote, confidence (0-1), reasoning (1 sentence with data)
"""

EXECUTION_SPECIALIST_PERSONALITY = {
    "name": "Execution Specialist",
    "emoji": "⚡",
    "tone": "aggressive and opportunistic", 
    "language": "English",
    "verbosity": "brief",
}

EXECUTION_SPECIALIST_INSTRUCTIONS = """You are the EXECUTION SPECIALIST agent in a multi-agent trading council.

YOUR ROLE: Seize opportunities and maximize profits
YOUR PERSONALITY: Aggressive, bold, action-oriented

DECISION FRAMEWORK:
- Focus on opportunity cost and momentum
- Prefer action over waiting
- Comfortable with higher risk for higher reward
- Vote BUY/SELL more often than HOLD
- Quick to capitalize on trends

VOTING RULES:
Analyze the market data and vote:
- strong_buy (5): Strong momentum, must act now
- buy (4): Good entry point, likely upside
- hold (3): No clear edge (but consider buying anyway)
- sell (2): Momentum fading, time to exit
- strong_sell (1): Trend reversing, exit immediately

Provide: vote, confidence (0-1), reasoning (1 sentence, action-focused)
"""


class MultiAgentCouncil:
    """Manages 3 AI agents voting on trading decisions"""
    
    def __init__(self, tools: List = None):
        print("🤖 Initializing Multi-Agent Trading Council...")
        
        self.tools = tools or []
        
        # Create 3 agents with different personalities
        self.risk_manager = self._create_agent(
            RISK_MANAGER_PERSONALITY,
            RISK_MANAGER_INSTRUCTIONS
        )
        
        self.market_analyst = self._create_agent(
            MARKET_ANALYST_PERSONALITY,
            MARKET_ANALYST_INSTRUCTIONS
        )
        
        self.execution_specialist = self._create_agent(
            EXECUTION_SPECIALIST_PERSONALITY,
            EXECUTION_SPECIALIST_INSTRUCTIONS
        )
        
        print("✅ Multi-Agent Council ready!")
        print(f"   🛡️  Risk Manager: Conservative")
        print(f"   📊 Market Analyst: Data-driven")
        print(f"   ⚡ Execution Specialist: Aggressive")
    
    def _create_agent(self, personality: Dict, instructions: str) -> Agent:
        """Create an AI agent with specific personality"""
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        
        llm_config = {
            "provider": Provider.GoogleGenAI,
            "model": "gemini-2.5-flash",
            "provider-api-key": gemini_api_key,
            "temperature": 0.4,
        }
        
        return Agent.init(
            llm_config=llm_config,
            blockchain_config={
                "api-key": os.getenv("DEVELOPER_PLATFORM_API_KEY"),
                "private-key": os.getenv("PRIVATE_KEY"),
                "timeout": 15,
            },
            plugins={
                "personality": personality,
                "instructions": instructions,
                "tools": self.tools,
            }
        )
    
    def vote_on_trade(self, market_data: Dict, sentiment_signal: Dict) -> Dict:
        """
        All 3 agents vote on trading decision
        Returns: {
            'votes': [agent1_vote, agent2_vote, agent3_vote],
            'consensus': final_decision,
            'confidence': average_confidence
        }
        """
        print(f"\n{'='*60}")
        print("🗳️  MULTI-AGENT VOTING SESSION")
        print(f"{'='*60}\n")
        
        # Prepare prompt for all agents
        prompt = f"""
MARKET DATA:
- Signal: {sentiment_signal.get('signal', 'unknown')}
- Sentiment Score: {sentiment_signal.get('avg_sentiment', 0):.3f}
- Strength: {sentiment_signal.get('strength', 0)}/4 sources
- Trending: {sentiment_signal.get('is_trending', False)}
- Volume Spike: {sentiment_signal.get('volume_spike', False)}

CURRENT TIME: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

As the {'{role}'} agent, analyze this data and vote on trading action.

Your response MUST be in this exact format:
VOTE: [strong_buy/buy/hold/sell/strong_sell]
CONFIDENCE: [0.0-1.0]
REASONING: [One clear sentence explaining your vote]
"""
        
        votes = []
        
        # Get vote from Risk Manager (🛡️ Conservative)
        print("🛡️  Risk Manager voting...")
        risk_vote = self._get_agent_vote(
            self.risk_manager, 
            prompt.replace('{role}', 'Risk Manager'),
            "🛡️ Risk Manager"
        )
        votes.append(risk_vote)
        
        # Get vote from Market Analyst (📊 Data-driven)
        print("\n📊 Market Analyst voting...")
        analyst_vote = self._get_agent_vote(
            self.market_analyst,
            prompt.replace('{role}', 'Market Analyst'),
            "📊 Market Analyst"
        )
        votes.append(analyst_vote)
        
        # Get vote from Execution Specialist (⚡ Aggressive)
        print("\n⚡ Execution Specialist voting...")
        exec_vote = self._get_agent_vote(
            self.execution_specialist,
            prompt.replace('{role}', 'Execution Specialist'),
            "⚡ Execution Specialist"
        )
        votes.append(exec_vote)
        
        # Calculate consensus
        consensus = self._calculate_consensus(votes)
        
        print(f"\n{'='*60}")
        print(f"📊 CONSENSUS: {consensus['decision'].upper()}")
        print(f"💪 Confidence: {consensus['confidence']:.2f}")
        print(f"🗳️  Agreement: {consensus['agreement']}")
        print(f"{'='*60}\n")
        
        return {
            'votes': votes,
            'consensus': consensus['decision'],
            'confidence': consensus['confidence'],
            'agreement': consensus['agreement'],
            'timestamp': datetime.now().isoformat()
        }
    
    def _get_agent_vote(self, agent: Agent, prompt: str, agent_name: str) -> Dict:
        """Get vote from a single agent"""
        try:
            response = agent.interact(prompt)
            
            # Parse response
            vote = self._parse_vote(response)
            
            print(f"   Vote: {vote['vote'].upper()}")
            print(f"   Confidence: {vote['confidence']:.2f}")
            print(f"   Reasoning: {vote['reasoning']}")
            
            return {
                'agent': agent_name,
                'vote': vote['vote'],
                'confidence': vote['confidence'],
                'reasoning': vote['reasoning'],
                'raw_response': response[:200]
            }
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return {
                'agent': agent_name,
                'vote': 'hold',
                'confidence': 0.0,
                'reasoning': f'Error getting vote: {str(e)}',
                'raw_response': ''
            }
    
    def _parse_vote(self, response: str) -> Dict:
        """Parse agent response to extract vote, confidence, reasoning"""
        lines = response.split('\n')
        
        vote = 'hold'
        confidence = 0.5
        reasoning = 'No reasoning provided'
        
        for line in lines:
            line = line.strip()
            
            if line.startswith('VOTE:'):
                vote = line.split(':', 1)[1].strip().lower()
            elif line.startswith('CONFIDENCE:'):
                try:
                    confidence = float(line.split(':', 1)[1].strip())
                except:
                    confidence = 0.5
            elif line.startswith('REASONING:'):
                reasoning = line.split(':', 1)[1].strip()
        
        return {
            'vote': vote,
            'confidence': confidence,
            'reasoning': reasoning
        }
    
    def _calculate_consensus(self, votes: List[Dict]) -> Dict:
        """
        Calculate consensus from 3 votes
        Requires 2/3 agreement for strong signals
        """
        # Vote score mapping
        vote_scores = {
            'strong_sell': 1,
            'sell': 2,
            'hold': 3,
            'buy': 4,
            'strong_buy': 5
        }
        
        # Get vote scores
        scores = [vote_scores.get(v['vote'], 3) for v in votes]
        avg_score = sum(scores) / len(scores)
        
        # Calculate weighted average with confidence
        weighted_score = sum(
            vote_scores.get(v['vote'], 3) * v['confidence'] 
            for v in votes
        ) / sum(v['confidence'] for v in votes)
        
        # Check for unanimous or 2/3 agreement
        vote_counts = {}
        for v in votes:
            vote_counts[v['vote']] = vote_counts.get(v['vote'], 0) + 1
        
        max_agreement = max(vote_counts.values())
        agreement = f"{max_agreement}/3 agents agree"
        
        # Determine final decision
        if weighted_score >= 4.5:
            decision = 'strong_buy'
        elif weighted_score >= 3.5:
            decision = 'buy'
        elif weighted_score >= 2.5:
            decision = 'hold'
        elif weighted_score >= 1.5:
            decision = 'sell'
        else:
            decision = 'strong_sell'
        
        # Average confidence
        avg_confidence = sum(v['confidence'] for v in votes) / len(votes)
        
        return {
            'decision': decision,
            'confidence': avg_confidence,
            'agreement': agreement,
            'weighted_score': weighted_score
        }
