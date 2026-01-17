"""
Backend API Client - Connects AI Agent to Backend Server
Sends real-time updates to the backend for dashboard display
"""
import requests
import json
import os
from datetime import datetime

class BackendClient:
    def __init__(self, base_url=None):
        # Use environment variable for production deployment
        self.base_url = base_url or os.getenv("BACKEND_URL", "http://localhost:3001/api")
        self.session = requests.Session()
        
    def send_agent_decision(self, market_data, sentinel_status, decision, reason):
        """Send agent decision to backend"""
        try:
            data = {
                "market_data": market_data,
                "sentinel_status": sentinel_status,
                "decision": decision,
                "reason": reason,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            response = self.session.post(
                f"{self.base_url}/agent/decision",
                json=data,
                timeout=5
            )
            if response.ok:
                print(f"✅ Decision sent to backend: {decision}")
            else:
                print(f"⚠️  Failed to send decision: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Backend connection failed: {e}")
    
    def send_council_votes(self, votes, consensus, confidence, agreement):
        """Send multi-agent council votes to backend"""
        try:
            data = {
                "votes": votes,
                "consensus": consensus,
                "confidence": float(confidence),
                "agreement": agreement,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            response = self.session.post(
                f"{self.base_url}/council/votes",
                json=data,
                timeout=5
            )
            if response.ok:
                print(f"✅ Council votes sent: {consensus}")
            else:
                print(f"⚠️  Failed to send council votes: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Failed to send council votes: {e}")
    
    def send_sentiment_update(self, signal, score, sources, weights=None, is_trending=False):
        """Send sentiment update to backend"""
        try:
            data = {
                "signal": signal,
                "score": float(score),
                "sources": sources,
                "weights": weights or {"coingecko": 25, "news": 25, "social": 25, "technical": 25},
                "is_trending": is_trending,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            response = self.session.post(
                f"{self.base_url}/market/sentiment/update",
                json=data,
                timeout=5
            )
            if response.ok:
                print(f"✅ Sentiment sent: {signal} ({score})")
        except Exception as e:
            print(f"⚠️  Failed to send sentiment: {e}")
    
    def send_agent_status(self, status, action, confidence=0):
        """Send agent status update"""
        try:
            data = {
                "status": status,
                "action": action,
                "confidence": float(confidence),
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            response = self.session.post(
                f"{self.base_url}/agent/status/update",
                json=data,
                timeout=5
            )
        except Exception as e:
            print(f"⚠️  Failed to send status: {e}")
    
    def send_price_update(self, price, change_24h=0):
        """Send CRO price update"""
        try:
            data = {
                "price": float(price),
                "change_24h": float(change_24h),
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            response = self.session.post(
                f"{self.base_url}/market/price/update",
                json=data,
                timeout=5
            )
        except Exception as e:
            print(f"⚠️  Failed to send price: {e}")
    
    def send_trade(self, tx_hash, token_in, token_out, amount_in, amount_out, direction):
        """Send trade execution to backend"""
        try:
            data = {
                "txHash": tx_hash,
                "tokenIn": token_in,
                "tokenOut": token_out,
                "amountIn": str(amount_in),
                "amountOut": str(amount_out),
                "type": direction.upper(),
                "status": "completed",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            response = self.session.post(
                f"{self.base_url}/trades/execute",
                json=data,
                timeout=5
            )
            if response.ok:
                print(f"✅ Trade sent to backend: {direction} {amount_in}")
            else:
                print(f"⚠️  Failed to send trade: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Failed to send trade: {e}")
    
    def ping(self):
        """Check if backend is reachable"""
        try:
            # Use correct health endpoint
            health_url = self.base_url.replace('/api', '') + '/api/health'
            response = self.session.get(health_url, timeout=2)
            return response.ok
        except Exception as e:
            return False
