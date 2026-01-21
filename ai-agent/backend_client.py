"""
Backend API Client - Connects AI Agent to Backend Server
Sends real-time updates to the backend for dashboard display
Handles HTTP 402 Payment Required protocol automatically
"""
import sys
import requests
import json
import os
from datetime import datetime
from web3 import Web3
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Fix Unicode encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class BackendClient:
    def __init__(self, base_url=None, wallet_private_key=None):
        # Use environment variable for production deployment
        self.base_url = base_url or os.getenv("BACKEND_URL", "http://localhost:3001/api")
        self.session = requests.Session()
        
        # X402 Payment Protocol Support
        self.wallet_private_key = wallet_private_key or os.getenv("PRIVATE_KEY")
        self.x402_receiver = "0x0000000000000000000000000000000000000402"
        
        # Initialize Web3 for payment transactions
        if self.wallet_private_key:
            rpc_url = os.getenv("RPC_URL", "https://evm-t3.cronos.org")
            self.w3 = Web3(Web3.HTTPProvider(rpc_url))
            self.account = self.w3.eth.account.from_key(self.wallet_private_key)
            print("[OK] X402 payments enabled for agent: {}".format(self.account.address))
        else:
            self.w3 = None
            self.account = None
            print("[WARN] X402 payments disabled (no private key)")
    
    def _safe_print(self, message):
        """Safe print that handles Unicode on Windows"""
        try:
            print(message)
        except UnicodeEncodeError:
            # Replace common emojis with ASCII equivalents
            safe_msg = message.replace('🔒', '[LOCK]').replace('💳', '[PAYMENT]').replace('📡', '[TX]')
            safe_msg = safe_msg.replace('✅', '[OK]').replace('❌', '[ERROR]').replace('⚠️', '[WARN]')
            safe_msg = safe_msg.replace('💰', '[PAY]').replace('🔄', '[RETRY]')
            print(safe_msg)
    
    def _handle_402_response(self, response):
        """
        Automatically handle HTTP 402 Payment Required responses
        Makes payment and returns payment proof headers
        """
        if response.status_code != 402:
            return None
            
        try:
            payment_data = response.json()
            self._safe_print("[LOCK] Payment required: {} ({} CRO)".format(
                payment_data['payment']['serviceType'], 
                payment_data['payment']['amount']
            ))
            
            if not self.w3 or not self.account:
                print("❌ Cannot make payment: Web3 not initialized")
                return None
            
            # Extract payment details
            nonce = payment_data['payment']['nonce']
            amount_cro = payment_data['payment']['amount']
            receiver = payment_data['payment']['receiver']
            service_type = payment_data['payment']['serviceType']
            
            # Make payment transaction
            print(f"💳 Sending payment: {amount_cro} CRO for {service_type}")
            
            amount_wei = self.w3.to_wei(amount_cro, 'ether')
            
            # Build transaction
            tx = {
                'from': self.account.address,
                'to': receiver,
                'value': amount_wei,
                'gas': 100000,
                'gasPrice': self.w3.eth.gas_price,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'chainId': 338,  # Cronos Testnet
                'data': self.w3.to_bytes(text=service_type)
            }
            
            # Sign and send transaction
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.wallet_private_key)
            # Get raw transaction bytes
            raw_tx = signed_tx.raw_transaction
            tx_hash = self.w3.eth.send_raw_transaction(raw_tx)
            tx_hash_hex = self.w3.to_hex(tx_hash)
            
            print(f"📡 Payment sent: {tx_hash_hex}")
            
            # Wait for confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
            
            if receipt['status'] == 1:
                print(f"✅ Payment confirmed: {tx_hash_hex}")
                
                # Return payment proof headers
                return {
                    'x-payment-proof': tx_hash_hex,
                    'x-payment-nonce': nonce
                }
            else:
                print(f"❌ Payment failed: {tx_hash_hex}")
                return None
                
        except Exception as e:
            print(f"❌ Payment processing error: {e}")
            return None
    
    def _make_request_with_payment(self, method, endpoint, data=None, max_retries=2):
        """
        Make HTTP request with automatic 402 payment handling
        Retries request with payment proof if 402 received
        """
        url = f"{self.base_url}{endpoint}"
        headers = {}
        
        for attempt in range(max_retries):
            try:
                if method == 'POST':
                    response = self.session.post(url, json=data, headers=headers, timeout=20)
                elif method == 'GET':
                    response = self.session.get(url, headers=headers, timeout=20)
                else:
                    raise ValueError(f"Unsupported method: {method}")
                
                # Handle 402 Payment Required
                if response.status_code == 402:
                    print(f"💰 Attempt {attempt + 1}: Payment required for {endpoint}")
                    
                    payment_headers = self._handle_402_response(response)
                    
                    if payment_headers:
                        # Update headers with payment proof and retry
                        headers.update(payment_headers)
                        print(f"🔄 Retrying request with payment proof...")
                        continue
                    else:
                        print(f"❌ Failed to process payment for {endpoint}")
                        return None
                
                # Request successful
                return response
                
            except Exception as e:
                print(f"⚠️  Request error (attempt {attempt + 1}): {e}")
                if attempt >= max_retries - 1:
                    return None
        
        return None
        
    def send_agent_decision(self, market_data, sentinel_status, decision, reason):
        """Send agent decision to backend (with automatic 402 payment handling)"""
        try:
            data = {
                "market_data": market_data,
                "sentinel_status": sentinel_status,
                "decision": decision,
                "reason": reason,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            response = self._make_request_with_payment('POST', '/agent/decision', data)
            
            if response and response.ok:
                print(f"✅ Decision sent to backend: {decision}")
                sys.stdout.flush()
            else:
                status = response.status_code if response else "No response"
                error_text = response.text if response else "Connection failed"
                print(f"⚠️  Failed to send decision (status: {status})")
                print(f"   Error: {error_text}")
                sys.stdout.flush()
        except Exception as e:
            print(f"⚠️  Backend connection failed: {e}")
            sys.stdout.flush()
    
    def send_council_votes(self, votes, consensus, confidence, agreement):
        """Send multi-agent council votes to backend (with automatic 402 payment handling)"""
        try:
            data = {
                "votes": votes,
                "consensus": consensus,
                "confidence": float(confidence),
                "agreement": agreement,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            response = self._make_request_with_payment('POST', '/council/votes', data)
            
            if response and response.ok:
                print(f"✅ Council votes sent: {consensus}")
                sys.stdout.flush()
            else:
                status = response.status_code if response else "No response"
                error_text = response.text if response else "Connection failed"
                print(f"⚠️  Failed to send council votes (status: {status})")
                print(f"   Error: {error_text}")
                sys.stdout.flush()
        except Exception as e:
            print(f"⚠️  Failed to send council votes: {e}")
            sys.stdout.flush()
    
    def send_sentiment_update(self, signal, score, sources, weights=None, is_trending=False):
        """Send sentiment update to backend (with automatic 402 payment handling)"""
        try:
            data = {
                "signal": signal,
                "score": float(score),
                "sources": sources,
                "weights": weights or {"coingecko": 25, "news": 25, "social": 25, "technical": 25},
                "is_trending": is_trending,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            response = self._make_request_with_payment('POST', '/market/sentiment/update', data)
            
            if response and response.ok:
                print(f"✅ Sentiment sent: {signal} ({score})")
                sys.stdout.flush()
        except Exception as e:
            print(f"⚠️  Failed to send sentiment: {e}")
            sys.stdout.flush()
    
    def send_agent_status(self, status, action, confidence=0):
        """Send agent status update (with automatic 402 payment handling)"""
        try:
            data = {
                "status": status,
                "action": action,
                "confidence": float(confidence),
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            response = self._make_request_with_payment('POST', '/agent/status/update', data)
        except Exception as e:
            print(f"⚠️  Failed to send status: {e}")
    
    def send_price_update(self, price, change_24h=0):
        """Send CRO price update (with automatic 402 payment handling)"""
        try:
            data = {
                "price": float(price),
                "change_24h": float(change_24h),
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            response = self._make_request_with_payment('POST', '/market/price/update', data)
        except Exception as e:
            print(f"⚠️  Failed to send price: {e}")
    
    def send_trade(self, tx_hash, token_in, token_out, amount_in, amount_out, direction):
        """Send trade execution to backend (with automatic 402 payment handling)"""
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
            response = self._make_request_with_payment('POST', '/trades/execute', data)
            
            if response and response.ok:
                print(f"✅ Trade sent to backend: {direction} {amount_in}")
            else:
                print(f"⚠️  Failed to send trade")
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
