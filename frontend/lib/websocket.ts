// WebSocket client for real-time AI agent updates
import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

export interface AgentStatus {
  status: 'idle' | 'analyzing' | 'executing' | 'error';
  lastUpdate: string;
  currentAction?: string;
  confidence?: number;
}

export interface TradeEvent {
  id: string;
  timestamp: string;
  type: 'buy' | 'sell';
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  price: string;
  sentiment: number;
  txHash?: string;
  status: 'pending' | 'success' | 'failed';
}

export interface SentimentUpdate {
  score: number;
  sources: {
    reddit: number;
    twitter: number;
    news: number;
  };
  timestamp: string;
}

export interface AgentThinking {
  type: 'analysis' | 'decision' | 'trade' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

export interface CouncilVotes {
  votes: Array<{
    agent: string;
    vote: string;
    confidence: number;
    reasoning: string;
  }>;
  consensus: string;
  confidence: number;
  agreement: string;
  timestamp: string;
}

type WebSocketMessage =
  | { type: 'agent_status'; data: AgentStatus }
  | { type: 'trade_event'; data: TradeEvent }
  | { type: 'sentiment_update'; data: SentimentUpdate }
  | { type: 'ai_thinking'; data: AgentThinking }
  | { type: 'agent_decision'; data: any }
  | { type: 'council_votes'; data: CouncilVotes }
  | { type: 'error'; message: string };

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    status: 'idle',
    lastUpdate: new Date().toISOString(),
  });
  const [recentTrades, setRecentTrades] = useState<TradeEvent[]>([]);
  const [sentiment, setSentiment] = useState<SentimentUpdate | null>(null);
  const [councilVotes, setCouncilVotes] = useState<CouncilVotes | null>(null);
  const [thinkingLog, setThinkingLog] = useState<AgentThinking[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const hasShownConnectedToast = useRef(false);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Only show toast once per session
        if (!hasShownConnectedToast.current) {
          toast.success('Connected to AI agent');
          hasShownConnectedToast.current = true;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'agent_status':
              setAgentStatus(message.data);
              break;

            case 'trade_event':
              setRecentTrades((prev) => [message.data, ...prev.slice(0, 49)]);
              if (message.data.status === 'success') {
                toast.success(`Trade executed: ${message.data.type.toUpperCase()} ${message.data.amountIn} ${message.data.tokenIn}`);
              } else if (message.data.status === 'failed') {
                toast.error(`Trade failed: ${message.data.type.toUpperCase()}`);
              }
              break;

            case 'sentiment_update':
              setSentiment(message.data);
              break;

            case 'council_votes':
              setCouncilVotes(message.data);
              console.log('Council votes received:', message.data);
              break;

            case 'ai_thinking':
              setThinkingLog((prev) => [{
                ...message.data,
                timestamp: message.data.timestamp || new Date().toISOString()
              }, ...prev.slice(0, 49)]);
              break;

            case 'agent_decision':
              // Agent decision logs will be fetched via API
              // Just show a toast notification
              console.log('New agent decision:', message.data);
              break;

            case 'error':
              console.error('WebSocket error message:', message.message);
              toast.error(`Agent error: ${message.message}`);
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        // Only log if it's not a connection refused error (backend not running)
        if (reconnectAttempts.current === 0) {
          console.log('WebSocket connection failed - is backend running?');
        }
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current += 1;
          
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else if (reconnectAttempts.current === maxReconnectAttempts) {
          console.log('Could not connect to AI agent - backend may be offline');
          toast.error('Cannot connect to AI agent. Is the backend running?');
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
      toast.error('Not connected to AI agent');
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    agentStatus,
    recentTrades,
    sentiment,
    councilVotes,
    thinkingLog,
    sendMessage,
    reconnect: connect,
  };
}

// Hook for emergency stop
export function useEmergencyStop() {
  const { sendMessage, isConnected } = useWebSocket();

  const emergencyStop = useCallback(() => {
    if (!isConnected) {
      toast.error('Not connected to AI agent');
      return;
    }

    sendMessage({
      type: 'command',
      action: 'emergency_stop',
      timestamp: new Date().toISOString(),
    });

    toast.success('Emergency stop initiated');
  }, [sendMessage, isConnected]);

  return { emergencyStop, isConnected };
}

// Hook for manual trade approval
export function useManualApproval() {
  const { sendMessage, isConnected } = useWebSocket();

  const approveTrade = useCallback((tradeId: string, approved: boolean) => {
    if (!isConnected) {
      toast.error('Not connected to AI agent');
      return;
    }

    sendMessage({
      type: 'command',
      action: 'approve_trade',
      tradeId,
      approved,
      timestamp: new Date().toISOString(),
    });

    toast.success(approved ? 'Trade approved' : 'Trade rejected');
  }, [sendMessage, isConnected]);

  return { approveTrade, isConnected };
}
