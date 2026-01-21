"""
X402 Payment Integration for AI Agent
Handles micropayments for autonomous trading decisions
"""
import os
import requests
import time
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")

class X402Payment:
    """
    X402 Micropayment Client for AI Agent Services
    Integrates with backend x402 service for pay-per-use model
    """
    
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.payment_history = []
        self.total_spent = 0.0
        
        # Get pricing from backend
        try:
            response = requests.get(f"{self.backend_url}/api/x402/pricing", timeout=5)
            if response.ok:
                data = response.json()
                self.pricing = data.get('pricing', {})
                print(f"✅ X402 Payment Client initialized")
                print(f"   Pricing loaded: {len(self.pricing)} services")
            else:
                print(f"⚠️  Could not load x402 pricing, using defaults")
                self.pricing = self._get_default_pricing()
        except Exception as e:
            print(f"⚠️  X402 service unavailable: {e}")
            self.pricing = self._get_default_pricing()
    
    def _get_default_pricing(self) -> Dict[str, str]:
        """Default pricing if backend unavailable"""
        return {
            "AI_DECISION": "0.001",
            "SENTIMENT_ANALYSIS": "0.0005",
            "TRADE_EXECUTION": "0.002",
            "MULTI_AGENT_VOTE": "0.0015",
            "MARKET_DATA": "0.0003",
        }
    
    def pay_for_ai_decision(self, decision_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process x402 payment for AI decision making
        
        Args:
            decision_data: Decision metadata (signal, sentiment, confidence)
            
        Returns:
            Payment result with authorization status
        """
        return self._process_payment('AI_DECISION', {
            'signal': decision_data.get('signal'),
            'sentiment': decision_data.get('sentiment'),
            'confidence': decision_data.get('confidence'),
        })
    
    def pay_for_sentiment_analysis(self, sources: int) -> Dict[str, Any]:
        """Process x402 payment for sentiment analysis"""
        return self._process_payment('SENTIMENT_ANALYSIS', {
            'sources': sources,
            'timestamp': int(time.time()),
        })
    
    def pay_for_trade_execution(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process x402 payment for trade execution"""
        return self._process_payment('TRADE_EXECUTION', {
            'direction': trade_data.get('direction'),
            'amount': str(trade_data.get('amount')),
            'tokenIn': trade_data.get('tokenIn'),
            'tokenOut': trade_data.get('tokenOut'),
        })
    
    def pay_for_multi_agent_vote(self, vote_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process x402 payment for multi-agent council vote"""
        return self._process_payment('MULTI_AGENT_VOTE', {
            'consensus': vote_data.get('consensus'),
            'confidence': vote_data.get('confidence'),
            'agents': vote_data.get('agents', 3),
        })
    
    def pay_for_market_data(self, data_type: str) -> Dict[str, Any]:
        """Process x402 payment for market data access"""
        return self._process_payment('MARKET_DATA', {
            'dataType': data_type,
            'timestamp': int(time.time()),
        })
    
    def _process_payment(self, service_type: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Core payment processing function
        
        Returns:
            {
                'success': bool,
                'authorized': bool,
                'payment': {...},
                'error': str (if failed)
            }
        """
        try:
            cost = float(self.pricing.get(service_type, '0'))
            print(f"💳 X402 Payment: {service_type} ({cost} CRO)")
            
            # Call backend x402 payment endpoint (30s timeout for Render's slower network)
            response = requests.post(
                f"{self.backend_url}/api/x402/pay",
                json={
                    'serviceType': service_type,
                    'metadata': metadata
                },
                timeout=30
            )
            
            if response.ok:
                result = response.json()
                
                if result.get('success'):
                    payment = result.get('payment', {})
                    self.payment_history.append(payment)
                    self.total_spent += cost
                    
                    print(f"✅ X402 payment successful: {payment.get('txHash', 'N/A')[:16]}...")
                    
                    return {
                        'success': True,
                        'authorized': True,
                        'payment': payment,
                        'cost': cost,
                    }
                else:
                    print(f"❌ X402 payment failed: {result.get('error', 'Unknown error')}")
                    return {
                        'success': False,
                        'authorized': False,
                        'error': result.get('error', 'Payment failed'),
                    }
            else:
                print(f"❌ X402 backend error: {response.status_code}")
                return {
                    'success': False,
                    'authorized': False,
                    'error': f'Backend error: {response.status_code}',
                }
                
        except Exception as e:
            print(f"❌ X402 payment exception: {str(e)}")
            return {
                'success': False,
                'authorized': False,
                'error': str(e),
            }
    
    def estimate_cost(self, operations: Dict[str, int]) -> float:
        """
        Estimate total cost for multiple operations
        
        Args:
            operations: Dict of service_type: count
            
        Example:
            estimate_cost({
                'AI_DECISION': 1,
                'SENTIMENT_ANALYSIS': 1,
                'TRADE_EXECUTION': 1
            })
        """
        total = 0.0
        for service, count in operations.items():
            cost = float(self.pricing.get(service, '0'))
            total += cost * count
        return total
    
    def get_payment_summary(self) -> Dict[str, Any]:
        """Get payment summary statistics"""
        return {
            'total_payments': len(self.payment_history),
            'total_spent': f"{self.total_spent:.6f} CRO",
            'recent_payments': self.payment_history[-10:],
        }
    
    def is_authorized(self, payment_result: Dict[str, Any]) -> bool:
        """Check if payment was successful and service is authorized"""
        return payment_result.get('success', False) and payment_result.get('authorized', False)


# Singleton instance
_x402_client = None

def get_x402_client() -> X402Payment:
    """Get or create x402 payment client singleton"""
    global _x402_client
    if _x402_client is None:
        _x402_client = X402Payment()
    return _x402_client
