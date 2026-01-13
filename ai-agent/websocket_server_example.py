"""
WebSocket Server for Real-Time AI Agent Updates

Add this to your AI agent backend to enable real-time dashboard updates.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from datetime import datetime
from typing import List, Dict, Any

app = FastAPI()

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error sending to client: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)

manager = ConnectionManager()

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and listen for commands
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle commands from frontend
            if message.get("type") == "command":
                action = message.get("action")
                
                if action == "emergency_stop":
                    print("Emergency stop received from frontend")
                    # TODO: Trigger your emergency stop logic here
                    await broadcast_agent_status("idle", "Emergency stop activated")
                    
                elif action == "approve_trade":
                    trade_id = message.get("tradeId")
                    approved = message.get("approved")
                    print(f"Trade {trade_id} {'approved' if approved else 'rejected'}")
                    # TODO: Handle trade approval logic
                    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# Broadcast functions (call these from your AI agent)

async def broadcast_agent_status(status: str, action: str = "", confidence: float = 0.0):
    """
    Broadcast agent status update
    status: 'idle', 'analyzing', 'executing', 'error'
    """
    message = {
        "type": "agent_status",
        "data": {
            "status": status,
            "lastUpdate": datetime.utcnow().isoformat() + "Z",
            "currentAction": action,
            "confidence": confidence
        }
    }
    await manager.broadcast(message)

async def broadcast_trade_event(
    trade_id: str,
    trade_type: str,
    token_in: str,
    token_out: str,
    amount_in: str,
    amount_out: str,
    price: str,
    sentiment: float,
    tx_hash: str = None,
    status: str = "pending"
):
    """
    Broadcast trade execution event
    trade_type: 'buy' or 'sell'
    status: 'pending', 'success', 'failed'
    """
    message = {
        "type": "trade_event",
        "data": {
            "id": trade_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "type": trade_type,
            "tokenIn": token_in,
            "tokenOut": token_out,
            "amountIn": amount_in,
            "amountOut": amount_out,
            "price": price,
            "sentiment": sentiment,
            "txHash": tx_hash,
            "status": status
        }
    }
    await manager.broadcast(message)

async def broadcast_sentiment_update(
    overall_score: float,
    reddit_score: float,
    twitter_score: float,
    news_score: float
):
    """Broadcast sentiment analysis update"""
    message = {
        "type": "sentiment_update",
        "data": {
            "score": overall_score,
            "sources": {
                "reddit": reddit_score,
                "twitter": twitter_score,
                "news": news_score
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    }
    await manager.broadcast(message)

async def broadcast_error(error_message: str):
    """Broadcast error message"""
    message = {
        "type": "error",
        "message": error_message
    }
    await manager.broadcast(message)

# Example: Background task to send periodic updates
async def periodic_status_updates():
    """Send agent status every 5 seconds"""
    while True:
        await asyncio.sleep(5)
        # TODO: Get actual agent status from your system
        await broadcast_agent_status(
            status="analyzing",
            action="Monitoring market conditions",
            confidence=0.75
        )

# Example usage in your autonomous trader:

"""
# In your autonomous_trader.py or main.py:

from websocket_server import broadcast_agent_status, broadcast_trade_event, broadcast_sentiment_update

class AutonomousTrader:
    async def analyze_market(self):
        # Broadcast status
        await broadcast_agent_status("analyzing", "Fetching market sentiment", 0.0)
        
        sentiment_data = await self.get_sentiment()
        
        # Broadcast sentiment update
        await broadcast_sentiment_update(
            overall_score=sentiment_data['overall'],
            reddit_score=sentiment_data['reddit'],
            twitter_score=sentiment_data['twitter'],
            news_score=sentiment_data['news']
        )
        
        await broadcast_agent_status("analyzing", "Analyzing trade opportunity", sentiment_data['confidence'])
    
    async def execute_trade(self, decision):
        # Broadcast trade start
        await broadcast_trade_event(
            trade_id=f"trade-{int(time.time())}",
            trade_type="buy" if decision.action == "BUY" else "sell",
            token_in="WCRO",
            token_out="USDC",
            amount_in=str(decision.amount),
            amount_out="0",  # Will update after execution
            price=str(decision.price),
            sentiment=decision.sentiment_score,
            status="pending"
        )
        
        await broadcast_agent_status("executing", f"Executing {decision.action} trade", decision.confidence)
        
        # Execute trade
        tx_hash = await self.execute_on_chain(decision)
        
        # Broadcast success
        await broadcast_trade_event(
            trade_id=f"trade-{int(time.time())}",
            trade_type="buy" if decision.action == "BUY" else "sell",
            token_in="WCRO",
            token_out="USDC",
            amount_in=str(decision.amount),
            amount_out=str(decision.amount_out),
            price=str(decision.price),
            sentiment=decision.sentiment_score,
            tx_hash=tx_hash,
            status="success"
        )
        
        await broadcast_agent_status("idle", "Trade executed successfully")
"""

# Run the server
if __name__ == "__main__":
    import uvicorn
    
    # Start periodic updates in background
    @app.on_event("startup")
    async def startup_event():
        asyncio.create_task(periodic_status_updates())
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
