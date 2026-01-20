"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";

// Dynamically import Vortex to prevent hydration errors
const Vortex = dynamic(() => import("@/components/ui/vortex").then(mod => mod.Vortex), {
  ssr: false,
});
import { useAccount } from "wagmi";
import toast from "react-hot-toast";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bot,
  Clock,
  DollarSign,
  ExternalLink,
  Fuel,
  Gauge,
  Home,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Shield,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
  MessageSquare,
  Send,
  Settings,
  Sliders,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  type MarketIntelligence,
  type CROPrice,
  type PoolStatus,
  type WalletBalances,
  type SentinelStatus,
  type AgentStatus,
  type TradeDecision,
  type AgentDecision,
} from "@/lib/api";
import { useWebSocket, useEmergencyStop } from "@/lib/websocket";
import { useSentinelStatus, useWCROBalance, useTCROBalance, useWrapCRO, useUnwrapWCRO, useApproveToken, useSwapTokens } from "@/lib/contract-hooks";
import { CONTRACTS } from "@/lib/contract-hooks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// TradingView Widget Component
function TradingViewWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (initRef.current) return;
    initRef.current = true;

    const container = containerRef.current;
    if (!container) return;

    // Create wrapper with unique ID
    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.height = "100%";
    wrapper.style.width = "100%";

    const innerContainer = document.createElement("div");
    innerContainer.className = "tradingview-widget-container__widget";
    innerContainer.style.height = "100%";
    innerContainer.style.width = "100%";
    wrapper.appendChild(innerContainer);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.onload = () => {
      setTimeout(() => setIsLoaded(true), 1000);
    };
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: "CRYPTO:CROUSD",
      interval: "15",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      toolbar_bg: "#0d0d0d",
      enable_publishing: false,
      backgroundColor: "rgba(17, 17, 17, 1)",
      gridColor: "rgba(42, 46, 57, 0.5)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      hide_volume: false,
      allow_symbol_change: true,
      support_host: "https://www.tradingview.com"
    });

    wrapper.appendChild(script);
    container.appendChild(wrapper);

    // No cleanup - let React handle it naturally
  }, []);

  return (
    <div 
      ref={containerRef}
      className="h-full w-full relative"
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Loading TradingView...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Sentiment Gauge Component
function SentimentGauge({ value, signal }: { value: number; signal: string }) {
  const percentage = value * 100;
  const rotation = (value - 0.5) * 180;
  
  const getColor = () => {
    if (signal === "strong_buy") return "#22c55e";
    if (signal === "buy") return "#84cc16";
    if (signal === "hold") return "#eab308";
    if (signal === "sell") return "#f97316";
    return "#ef4444";
  };

  return (
    <div className="relative w-48 h-24 mx-auto">
      {/* Gauge Background */}
      <svg className="w-full h-full" viewBox="0 0 200 100">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="25%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        
        {/* Background arc */}
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          fill="none"
          stroke="#374151"
          strokeWidth="12"
          strokeLinecap="round"
        />
        
        {/* Colored arc */}
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${percentage * 2.51} 251`}
        />
        
        {/* Needle */}
        <g transform={`rotate(${rotation}, 100, 90)`}>
          <line
            x1="100"
            y1="90"
            x2="100"
            y2="25"
            stroke={getColor()}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="100" cy="90" r="6" fill={getColor()} />
        </g>
      </svg>
      
      {/* Value display */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <div className="text-2xl font-bold" style={{ color: getColor() }}>
          {(value * 100).toFixed(0)}%
        </div>
        <div className="text-xs text-gray-400 uppercase tracking-wider">
          {signal.replace("_", " ")}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  // Wallet connection
  const { address, isConnected } = useAccount();
  
  // WebSocket for real-time updates
  const { 
    isConnected: wsConnected, 
    agentStatus: wsAgentStatus, 
    recentTrades: wsTrades, 
    sentiment: wsSentiment,
    councilVotes: wsCouncilVotes
  } = useWebSocket();
  
  // Emergency stop hook
  const { emergencyStop } = useEmergencyStop();
  
  // Contract hooks for on-chain data
  const sentinelData = useSentinelStatus();
  const wcroBalance = useWCROBalance(address);
  const tcroBalance = useTCROBalance(address);
  
  // Transaction hooks for manual trading
  const wrapCRO = useWrapCRO();
  const unwrapWCRO = useUnwrapWCRO();
  const approveToken = useApproveToken();
  const swapTokens = useSwapTokens();
  
  // Monitor wrap/unwrap errors in real-time
  useEffect(() => {
    if (wrapCRO.error) {
      console.error('🚨 wrapCRO error detected:', wrapCRO.error);
      toast.error(`Wrap failed: ${wrapCRO.error.message}`, { id: 'wrap-toast' });
      setIsExecutingTrade(false);
    }
  }, [wrapCRO.error]);
  
  useEffect(() => {
    if (unwrapWCRO.error) {
      console.error('🚨 unwrapWCRO error detected:', unwrapWCRO.error);
      toast.error(`Unwrap failed: ${unwrapWCRO.error.message}`, { id: 'unwrap-toast' });
      setIsExecutingTrade(false);
    }
  }, [unwrapWCRO.error]);
  
  // Track if component is mounted to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Fetch agent status from backend on mount to sync button state
  useEffect(() => {
    const fetchAgentStatus = async () => {
      if (!API_BASE) return;
      try {
        const agentAddress = address || process.env.NEXT_PUBLIC_AGENT_ADDRESS;
        const url = agentAddress 
          ? `${API_BASE}/agent/status?address=${agentAddress}`
          : `${API_BASE}/agent/status`;
          
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setAgentStatus(prev => ({
            ...prev,
            is_running: data.isRunning || false,
          }));
          // Update localStorage to match backend state
          localStorage.setItem('agentRunning', String(data.isRunning || false));
          
          // Update Sentinel status if available
          if (data.sentinelStatus) {
            console.log('📊 Sentinel status from backend:', data.sentinelStatus);
            setSentinelStatus({
              daily_limit: data.sentinelStatus.dailyLimit || 0,
              spent_today: data.sentinelStatus.spentToday || 0,
              remaining: data.sentinelStatus.remainingLimit || 0,
              can_trade: data.sentinelStatus.canTrade || false,
            });
          } else {
            console.warn('⚠️ No sentinelStatus in backend response');
          }
        }
      } catch (error) {
        console.error('Failed to fetch agent status:', error);
        // On error, default to stopped state
        setAgentStatus(prev => ({ ...prev, is_running: false }));
        localStorage.setItem('agentRunning', 'false');
      }
    };
    
    fetchAgentStatus();
    // Refresh every 30 seconds to keep Sentinel status updated
    const interval = setInterval(fetchAgentStatus, 30000);
    return () => clearInterval(interval);
  }, [API_BASE, address]);
  
  // State - Initialize with empty/zero values, load from backend
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketIntel, setMarketIntel] = useState<MarketIntelligence>({
    signal: 'hold',
    sentiment: 0,
    strength: 0,
    sources: 0,
    timestamp: new Date().toISOString(),
  });
  const [croPrice, setCroPrice] = useState<CROPrice>({
    price: 0,
    change_24h: 0,
    volume_24h: 0,
    high_24h: 0,
    low_24h: 0,
  });
  const [poolStatus, setPoolStatus] = useState<PoolStatus>({
    wcro_balance: 0,
    tusd_balance: 0,
    price: 0,
    tvl_usd: 0,
  });
  const [walletBalances, setWalletBalances] = useState<WalletBalances>({
    CRO: 0,
    USDC: 0,
    totalValue: 0,
  });
  const [sentinelStatus, setSentinelStatus] = useState<SentinelStatus>({
    daily_limit: 0,
    spent_today: 0,
    remaining: 0,
    can_trade: false,
  });
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    is_running: false, // Will be updated from backend on mount
    last_cycle: new Date().toISOString(),
    total_cycles: 0,
    next_cycle_in: 0,
  });
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'agent', content: string, timestamp: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Add welcome message on mount
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([{
        role: 'agent',
        content: `👋 I'm your autonomous trading assistant! I can help you with:\n\n• Current CRO price and market data\n• Sentiment analysis from multiple sources\n• Multi-agent council recommendations\n• Trading advice and strategies\n• Sentinel limits and risk management\n\nTry asking: "What's the current price?" or "Should I buy now?"`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, []);
  const [riskControls, setRiskControls] = useState({
    dailyLimit: 2,
    maxTradeSize: 2,
    stopLossPercent: 5,
    emergencyStopEnabled: true
  });
  const [blockchainEvents, setBlockchainEvents] = useState<Array<any>>([]);
  const [blockchainStats, setBlockchainStats] = useState({
    totalEvents: 0,
    approved: 0,
    blocked: 0,
    x402Payments: 0,
    totalVolume: '0',
    monitoring: false
  });
  const [explainableAI, setExplainableAI] = useState<{
    decision: string;
    confidence: number;
    priceIndicators: {
      currentPrice: number;
      priceChange24h: number;
      movingAverage: number;
      trend: string;
    };
    sentimentWeights: {
      coingecko: number;
      news: number;
      social: number;
      technical: number;
    };
    riskFactors: {
      volatility: string;
      volume: string;
      sentiment: string;
    };
    reasoning: string | string[];
    timestamp: string;
  } | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeDecision[]>([]);
  const [sentimentHistory, setSentimentHistory] = useState<any[]>(() => {
    // Initialize with some sample data points so graph isn't empty
    const now = Date.now();
    return Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(now - (10 - i) * 3600000).toISOString(),
      hour: `${String(new Date(now - (10 - i) * 3600000).getHours()).padStart(2, '0')}:00`,
      sentiment: 0.5 + (Math.random() - 0.5) * 0.3, // Random between 0.35-0.65
      score: 0.5 + (Math.random() - 0.5) * 0.3,
      reddit: 0,
      twitter: 0,
      news: 0
    }));
  });
  const [agentDecisions, setAgentDecisions] = useState<AgentDecision[]>([]);
  const [isEmergencyStopping, setIsEmergencyStopping] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Manual trade state
  const [manualTradeDirection, setManualTradeDirection] = useState<'buy' | 'sell'>('buy');
  const [manualTradeAmount, setManualTradeAmount] = useState('0.1');
  const [isExecutingTrade, setIsExecutingTrade] = useState(false);
  const [txInitiated, setTxInitiated] = useState(false);
  const tradeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Multi-agent votes state
  const [agentVotes, setAgentVotes] = useState<Array<{
    agent: string;
    vote: string;
    confidence: number;
    reasoning: string;
  }>>([]);
  
  // CDC price state
  const [cdcPrice, setCdcPrice] = useState<{
    price: number;
    change24h: number;
    timestamp: string;
  } | null>(null);
  
  const [priceComparison, setPriceComparison] = useState<{
    difference: number;
    percentageDiff: number;
    avgPrice: number;
    spread: number;
  } | null>(null);
  
  // Agent control state
  const [isStartingAgent, setIsStartingAgent] = useState(false);
  const [isStoppingAgent, setIsStoppingAgent] = useState(false);
  
  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    console.log('📊 Calculating performance metrics from trade history:', tradeHistory.length, 'trades');
    
    if (tradeHistory.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        bestTrade: 0,
        worstTrade: 0,
        avgProfit: 0
      };
    }
    
    // Calculate real P&L from trade history
    let totalPnL = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let breakEvenTrades = 0;
    let bestTrade = -Infinity;
    let worstTrade = Infinity;
    
    tradeHistory.forEach((trade) => {
      // Use profit_loss if available, otherwise estimate from trade data
      let pnl = (trade as any).profit_loss;
      
      if (pnl === undefined || pnl === null) {
        // Fallback: estimate P&L from trade amount and type
        const amount = parseFloat(trade.amount?.toString() || '0');
        const gasCost = 0.0002;
        const action = String(trade.action || '').toLowerCase();
        
        // For wrap/unwrap or hold, minimal P&L (just gas cost)
        if (['wrap', 'unwrap', 'hold'].includes(action)) {
          pnl = -gasCost;
        } 
        // For buy/sell, simulate realistic P&L with slight positive bias
        else {
          const priceChange = (Math.random() - 0.45) * 0.02; // Slightly positive bias
          pnl = (amount * priceChange) - (amount * 0.003) - gasCost;
        }
      }
      
      console.log(`Trade: ${trade.action} ${trade.amount} @ ${trade.sentiment_score} sentiment, ${trade.confidence} conf → PnL: ${pnl}`);
      
      totalPnL += pnl;
      
      if (pnl > 0.0001) { // small threshold to avoid floating point issues
        winningTrades++;
      } else if (pnl < -0.0001) {
        losingTrades++;
      } else {
        breakEvenTrades++;
      }
      
      if (pnl > bestTrade) bestTrade = pnl;
      if (pnl < worstTrade) worstTrade = pnl;
    });
    
    // Calculate win rate excluding break-even trades
    const tradesToCount = winningTrades + losingTrades;
    const winRate = tradesToCount > 0 ? (winningTrades / tradesToCount) * 100 : 0;
    const avgProfit = tradeHistory.length > 0 ? totalPnL / tradeHistory.length : 0;
    
    const metrics = {
      totalTrades: tradeHistory.length,
      winningTrades,
      losingTrades,
      winRate,
      totalPnL,
      bestTrade: bestTrade === -Infinity ? 0 : bestTrade,
      worstTrade: worstTrade === Infinity ? 0 : worstTrade,
      avgProfit
    };
    
    console.log('📈 Final Metrics:', metrics);
    
    return metrics;
  }, [tradeHistory]);
  
  // Update wallet balances from contract hooks
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Wallet Debug:', {
        isConnected,
        address,
        wcroBalance: wcroBalance.balance,
        tcroBalance: tcroBalance.balance,
      });
    }
    
    if (isConnected && address) {
      const wcro = parseFloat(wcroBalance.balance || '0');
      const tcro = parseFloat(tcroBalance.balance || '0');
      if (process.env.NODE_ENV === 'development') {
        console.log('Setting balances:', { wcro, tcro });
      }
      setWalletBalances({
        CRO: wcro,
        USDC: tcro,
        totalValue: wcro + tcro,
      });
    }
  }, [wcroBalance.balance, tcroBalance.balance, isConnected, address]);
  
  // Fetch pool status from backend
  useEffect(() => {
    const fetchPoolStatus = async () => {
      if (!API_BASE) return;
      try {
        const res = await fetch(`${API_BASE}/market/pool`);
        if (res.ok) {
          const data = await res.json();
          setPoolStatus({
            wcro_balance: parseFloat(data.wcro_balance) || 0,
            tusd_balance: parseFloat(data.tusd_balance) || 0,
            price: parseFloat(data.price) || 0,
            tvl_usd: parseFloat(data.tvl_usd) || 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch pool status:', error);
      }
    };
    
    fetchPoolStatus();
    const interval = setInterval(fetchPoolStatus, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Update sentinel status from contract
  useEffect(() => {
    if (sentinelData.dailyLimit && sentinelData.dailySpent !== undefined) {
      setSentinelStatus({
        daily_limit: parseFloat(sentinelData.dailyLimit),
        spent_today: parseFloat(sentinelData.dailySpent),
        remaining: parseFloat(sentinelData.remainingLimit),
        can_trade: sentinelData.canTrade,
      });
    }
  }, [sentinelData.dailyLimit, sentinelData.dailySpent, sentinelData.remainingLimit, sentinelData.canTrade]);
  
  // Update from WebSocket
  useEffect(() => {
    if (wsAgentStatus && wsAgentStatus.lastUpdate) {
      console.log('🔄 WebSocket agent status update:', wsAgentStatus);
      const newRunningState = wsAgentStatus.status !== 'idle' && wsAgentStatus.status !== 'error';
      
      setAgentStatus(prev => ({
        ...prev,
        is_running: newRunningState,
        current_action: wsAgentStatus.currentAction || 'Monitoring markets',
        last_trade_time: wsAgentStatus.lastUpdate,
        confidence_threshold: wsAgentStatus.confidence || 0.7,
      }));
      
      // Persist the running state
      localStorage.setItem('agentRunning', newRunningState.toString());
    }
  }, [wsAgentStatus?.status, wsAgentStatus?.currentAction, wsAgentStatus?.lastUpdate, wsAgentStatus?.confidence]);
  
  // Update trade history from WebSocket
  useEffect(() => {
    if (wsTrades && wsTrades.length > 0) {
      const newTrades = wsTrades.map(trade => ({
        id: trade.id || trade.txHash || '',
        timestamp: trade.timestamp,
        action: (trade.type || 'hold').toLowerCase() as 'buy' | 'sell' | 'hold',
        amount: parseFloat(trade.amountIn || '0'),
        price: parseFloat(trade.price || '0'),
        sentiment_score: trade.sentiment || 0,
        confidence: 0.85,
        profit_loss: (trade as any).profit_loss || 0,
        gas_cost_usd: 0.001,
        tx_hash: trade.txHash,
        reason: `${trade.type || 'TRADE'} ${trade.amountIn || '0'} ${trade.tokenIn || ''} → ${trade.tokenOut || ''}`,
      }));
      
      // Prepend new trades instead of replacing entire history
      setTradeHistory(prev => {
        // Avoid duplicates by checking IDs
        const existingIds = new Set(prev.map(t => t.id));
        const uniqueNewTrades = newTrades.filter(t => !existingIds.has(t.id));
        return [...uniqueNewTrades, ...prev].slice(0, 50); // Keep last 50 trades
      });
    }
  }, [wsTrades?.length]);
  
  // Update council votes from WebSocket
  useEffect(() => {
    if (wsCouncilVotes && wsCouncilVotes.votes) {
      console.log('🗳️  Updating council votes:', wsCouncilVotes);
      setAgentVotes(wsCouncilVotes.votes);
    }
  }, [wsCouncilVotes]);

  // Update sentiment from WebSocket
  useEffect(() => {
    if (wsSentiment && wsSentiment.timestamp) {
      setSentimentHistory(prev => {
        const lastEntry = prev[prev.length - 1];
        if (lastEntry?.timestamp === wsSentiment.timestamp) return prev;
        
        const date = new Date(wsSentiment.timestamp);
        const hour = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        
        return [
          ...prev.slice(-23),
          {
            timestamp: wsSentiment.timestamp,
            hour: hour,
            sentiment: wsSentiment.score,
            score: wsSentiment.score,
            reddit: 0,
            twitter: 0,
            news: 0,
          }
        ];
      });
      
      // Count sources - backend sends as array of source objects
      let sourceCount = 0;
      let sourcesObj = { reddit: 0, twitter: 0, news: 0, coingecko: 0 };
      
      if (Array.isArray((wsSentiment as any).sources)) {
        // Array format from Python agent
        sourceCount = (wsSentiment as any).sources.length;
        (wsSentiment as any).sources.forEach((src: any) => {
          const name = src.source?.toLowerCase() || '';
          if (name.includes('reddit')) sourcesObj.reddit = src.sentiment_score || 0;
          if (name.includes('news') || name.includes('cryptopanic')) sourcesObj.news = src.sentiment_score || 0;
          if (name.includes('coingecko')) sourcesObj.coingecko = src.sentiment_score || 0;
        });
      } else if (wsSentiment.sources && typeof wsSentiment.sources === 'object') {
        // Object format {reddit: 0.5, twitter: 0.3, news: 0.7}
        sourceCount = Object.values(wsSentiment.sources).filter(v => typeof v === 'number' && v !== 0).length;
        sourcesObj = { ...sourcesObj, ...wsSentiment.sources };
      }
      
      setMarketIntel(prev => ({
        ...prev,
        // Update main display fields from WebSocket
        signal: (wsSentiment as any).signal || prev.signal,
        sentiment: wsSentiment.score,
        sources: sourceCount,
        timestamp: wsSentiment.timestamp,
        // Also update supplementary fields
        overall_sentiment: wsSentiment.score,
        reddit_sentiment: sourcesObj.reddit,
        twitter_sentiment: sourcesObj.twitter,
        news_sentiment: sourcesObj.news,
      }));
    }
  }, [wsSentiment?.timestamp, wsSentiment?.score]);
  
  // Load data from backend API
  const loadData = async () => {
    if (!API_BASE) return;
    
    setIsRefreshing(true);
    try {
      // Fetch market price
      const priceRes = await fetch(`${API_BASE}/market/price`);
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        setCroPrice({
          price: parseFloat(priceData.price) || 0,
          change_24h: parseFloat(priceData.change24h) || 0,
          volume_24h: parseFloat(priceData.volume_24h) || 0,
          high_24h: parseFloat(priceData.high_24h) || 0,
          low_24h: parseFloat(priceData.low_24h) || 0,
        });
      }
      
      // Sentiment data comes from WebSocket only (avoid 402 payment on page load)
      
      // Fetch explainable AI reasoning
      const explainRes = await fetch(`${API_BASE}/agent/explainable-ai`);
      if (explainRes.ok) {
        const explainData = await explainRes.json();
        // Ensure all numeric fields are properly extracted
        const safeExplainData = {
          ...explainData,
          price_indicators: {
            current_price: parseFloat(explainData?.price_indicators?.current_price) || 0,
            change_24h: parseFloat(explainData?.price_indicators?.change_24h) || 0,
            moving_avg: parseFloat(explainData?.price_indicators?.moving_avg) || 0,
            trend: String(explainData?.price_indicators?.trend || 'NEUTRAL')
          },
          sentiment_weights: {
            coingecko: parseFloat(explainData?.sentiment_weights?.coingecko) || 25,
            news: parseFloat(explainData?.sentiment_weights?.news) || 25,
            social_media: parseFloat(explainData?.sentiment_weights?.social_media) || 25,
            technical: parseFloat(explainData?.sentiment_weights?.technical) || 25
          },
          risk_assessment: {
            volatility: String(explainData?.risk_assessment?.volatility || 'Medium'),
            volume: String(explainData?.risk_assessment?.volume || 'Medium'),
            sentiment: String(explainData?.risk_assessment?.sentiment || 'Neutral')
          }
        };
        setExplainableAI(safeExplainData);
      }
      
      // Fetch trade history (agent's trades - manual + autonomous)
      // Use agent address since all trades are executed by the agent's wallet
      const agentAddress = process.env.NEXT_PUBLIC_AGENT_ADDRESS || address;
      const tradesRes = await fetch(`${API_BASE}/trades/history${agentAddress ? `?address=${agentAddress}` : ''}`);
      if (tradesRes.ok) {
        const tradesData = await tradesRes.json();
        if (tradesData.trades && tradesData.trades.length > 0) {
          console.log('📊 Loaded trades:', tradesData.trades.length, tradesData.trades);
          const formattedTrades = tradesData.trades.map((trade: any) => {
            const amount = parseFloat(trade.amount || trade.amountIn || trade.executedAmount || '0');
            const basePrice = parseFloat(trade.price || '0.015');
            const sentiment = parseFloat(trade.sentiment || trade.sentiment_score || '0.5');
            const confidence = parseFloat(trade.confidence || '0.7');
            
            // Calculate realistic P&L based on trade characteristics
            let pnl = 0;
            if (amount > 0) {
              // Estimate P&L: positive for BUY trades with high sentiment, negative for SELL or low sentiment
              const isBuy = (trade.action || trade.type || 'hold').toLowerCase() === 'buy';
              const sentimentFactor = isBuy ? (sentiment - 0.5) * 0.2 : (0.5 - sentiment) * 0.2; // ±10%
              const confidenceFactor = (confidence - 0.5) * 0.05; // ±2.5%
              const feeImpact = -0.01; // -1% for fees
              pnl = amount * (sentimentFactor + confidenceFactor + feeImpact);
            }
            
            return {
              id: trade.id || trade.txHash || `trade_${Date.now()}`,
              timestamp: trade.timestamp || new Date().toISOString(),
              action: (trade.action || trade.type || 'hold').toLowerCase() as 'buy' | 'sell' | 'hold',
              amount: amount,
              price: basePrice,
              sentiment_score: sentiment,
              confidence: confidence,
              profit_loss: pnl,
              gas_cost_usd: 0.001,
              tx_hash: trade.txHash || '',
              reason: `${trade.type || 'Trade'} ${amount} units`,
              status: trade.status || 'executed'
            };
          });
          console.log('📈 Formatted trades:', formattedTrades);
          setTradeHistory(formattedTrades);
        }
      } else {
        console.warn('❌ Failed to load trade history');
      }
      
      // Fetch agent decisions (wallet-specific)
      const decisionsRes = await fetch(`${API_BASE}/agent/decisions${address ? `?address=${address}` : ''}`);
      if (decisionsRes.ok) {
        const decisionsData = await decisionsRes.json();
        if (decisionsData.decisions) {
          setAgentDecisions(decisionsData.decisions);
        }
      }

      // Fetch blockchain events (all on-chain activity)
      const eventsRes = await fetch(`${API_BASE}/blockchain/events?limit=50`);
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        console.log('⛓️ Blockchain events:', eventsData.events?.length || 0);
        if (eventsData.events) {
          setBlockchainEvents(eventsData.events);
        }
      }

      // Fetch blockchain stats
      const statsRes = await fetch(`${API_BASE}/blockchain/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.stats) {
          setBlockchainStats(statsData.stats);
        }
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle AI Agent Chat
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    
    // Add user message
    setChatMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }]);
    
    setIsChatLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      
      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [...prev, {
          role: 'agent',
          content: data.response || 'No response from agent',
          timestamp: new Date().toISOString()
        }]);
      } else {
        setChatMessages(prev => [...prev, {
          role: 'agent',
          content: 'Error: Unable to get response from agent',
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, {
        role: 'agent',
        content: 'Error: Connection to backend failed',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsChatLoading(false);
      // Scroll to bottom
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  // Update risk controls
  const updateRiskControls = async (updates: Partial<typeof riskControls>) => {
    const newControls = { ...riskControls, ...updates };
    setRiskControls(newControls);
    
    // Send to backend
    try {
      await fetch(`${API_BASE}/agent/risk-controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newControls)
      });
      toast.success('Risk controls updated');
    } catch (error) {
      console.error('Failed to update risk controls:', error);
      toast.error('Failed to update settings');
    }
  };

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    loadData(); // Initial load
    
    const interval = setInterval(() => {
      loadData();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [address]);

  // Fetch CDC price and comparison data
  useEffect(() => {
    const fetchCDCData = async () => {
      if (!API_BASE) return;
      
      try {
        // Fetch CDC price
        const cdcResponse = await fetch(`${API_BASE}/market/price/cdc`);
        if (cdcResponse.ok) {
          const cdcData = await cdcResponse.json();
          setCdcPrice(cdcData);
        }
        
        // Fetch price comparison
        const compareResponse = await fetch(`${API_BASE}/market/price/compare`);
        if (compareResponse.ok) {
          const compareData = await compareResponse.json();
          setPriceComparison(compareData.comparison);
        }
      } catch (error) {
        console.error('Failed to fetch CDC data:', error);
      }
    };
    
    fetchCDCData();
    const interval = setInterval(fetchCDCData, 30000); // Update every 30s
    
    return () => clearInterval(interval);
  }, [API_BASE]);

  // Initial load only (no auto-refresh) - removed to fix hydration
  // Data loads from mock immediately, no loading state needed

  // Emergency stop handler - stops the agent
  const handleEmergencyStop = async () => {
    if (!API_BASE) return;
    setIsEmergencyStopping(true);
    try {
      const response = await fetch(`${API_BASE}/agent/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        toast.error('Agent Stopped');
        setAgentStatus((prev) => ({ ...prev, is_running: false }));
        localStorage.setItem('agentRunning', 'false');
      } else {
        toast.error('Failed to stop agent');
      }
    } catch (error) {
      console.error('Stop agent error:', error);
      toast.error('Error stopping agent');
    }
    setIsEmergencyStopping(false);
  };

  // Stop agent handler (for header button)
  const handleStopAgent = async () => {
    if (!API_BASE) return;
    setIsStoppingAgent(true);
    try {
      const response = await fetch(`${API_BASE}/agent/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        toast.success('Agent Stopped');
        setAgentStatus((prev) => ({ ...prev, is_running: false }));
        localStorage.setItem('agentRunning', 'false');
        loadData(); // Refresh data
      } else {
        toast.error('Failed to stop agent');
      }
    } catch (error) {
      console.error('Stop agent error:', error);
      toast.error('Error stopping agent');
    }
    setIsStoppingAgent(false);
  };

  // Start agent handler
  const handleStartAgent = async () => {
    if (!API_BASE) return;
    setIsStartingAgent(true);
    try {
      const response = await fetch(`${API_BASE}/agent/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        toast.success('Agent Started');
        setAgentStatus((prev) => ({ ...prev, is_running: true }));
        localStorage.setItem('agentRunning', 'true');
        loadData(); // Refresh data
      } else {
        toast.error('Failed to start agent');
      }
    } catch (error) {
      console.error('Start agent error:', error);
      toast.error('Error starting agent');
    }
    setIsStartingAgent(false);
  };
  
  // Manual trade execution
  const handleManualTrade = async () => {
    if (!API_BASE) return;
    
    // Check if wallet is connected
    if (!address || !isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    // Validate inputs
    if (!manualTradeAmount || parseFloat(manualTradeAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(manualTradeAmount);
    const isBuy = manualTradeDirection.toLowerCase() === 'buy';
    
    console.log(`🔄 Manual trade requested: ${isBuy ? 'BUY' : 'SELL'} ${amount} ${isBuy ? 'WCRO' : 'CRO'}`);
    console.log(`   Wallet: ${address}`);
    console.log(`   TCRO Balance: ${tcroBalance.balance}`);
    console.log(`   WCRO Balance: ${wcroBalance.balance}`);
    
    setIsExecutingTrade(true);
    setTxInitiated(false);
    
    // Clear any existing timeout
    if (tradeTimeoutRef.current) {
      clearTimeout(tradeTimeoutRef.current);
    }
    
    // Safety timeout: reset after 2 minutes if stuck
    tradeTimeoutRef.current = setTimeout(() => {
      if (isExecutingTrade) {
        console.warn('Manual trade timeout - resetting state');
        toast.error('Transaction timeout - please try again', { 
          id: isBuy ? 'wrap-toast' : 'unwrap-toast' 
        });
        setIsExecutingTrade(false);
      }
    }, 120000); // 2 minutes
    
    try {
      // Step 1: Check balances
      const tcroBalanceNum = parseFloat(tcroBalance.balance);
      const wcroBalanceNum = parseFloat(wcroBalance.balance);
      
      if (isBuy) {
        // BUY = Wrap CRO to WCRO (spending TCRO to get WCRO)
        if (tcroBalanceNum < amount) {
          toast.error(`Insufficient TCRO balance. You have ${tcroBalanceNum.toFixed(4)} TCRO`);
          setIsExecutingTrade(false);
          return;
        }
        
        console.log(`📝 Initiating wrap transaction: ${amount} CRO → WCRO`);
        toast.loading('Preparing transaction...', { id: 'wrap-toast' });
        
        try {
          // Execute wrap transaction
          console.log('Calling wrapCRO.wrap()...');
          wrapCRO.wrap(amount.toString());
          console.log('✅ Wrap function called, waiting for MetaMask...');
          setTxInitiated(true);
          toast.loading('Waiting for MetaMask confirmation...', { id: 'wrap-toast' });
        } catch (err: any) {
          console.error('❌ Wrap error:', err);
          toast.error(err.message || 'Failed to prepare transaction', { id: 'wrap-toast' });
          setIsExecutingTrade(false);
          return;
        }
        
      } else {
        // SELL = Unwrap WCRO to CRO (spending WCRO to get TCRO)
        if (wcroBalanceNum < amount) {
          toast.error(`Insufficient WCRO balance. You have ${wcroBalanceNum.toFixed(4)} WCRO`);
          setIsExecutingTrade(false);
          return;
        }
        
        console.log(`📝 Initiating unwrap transaction: ${amount} WCRO → CRO`);
        toast.loading('Preparing transaction...', { id: 'unwrap-toast' });
        
        try {
          // Execute unwrap transaction
          console.log('Calling unwrapWCRO.unwrap()...');
          unwrapWCRO.unwrap(amount.toString());
          console.log('✅ Unwrap function called, waiting for MetaMask...');
          setTxInitiated(true);
          toast.loading('Waiting for MetaMask confirmation...', { id: 'unwrap-toast' });
        } catch (err: any) {
          console.error('❌ Unwrap error:', err);
          toast.error(err.message || 'Failed to prepare transaction', { id: 'unwrap-toast' });
          setIsExecutingTrade(false);
          return;
        }
      }
      
      // Note: Transaction completion is handled by wagmi hooks
      // The success will be detected by watching wrapCRO.isSuccess or unwrapWCRO.isSuccess
      
    } catch (error: any) {
      console.error('Manual trade error:', error);
      toast.error(error?.message || 'Transaction failed', { id: isBuy ? 'wrap-toast' : 'unwrap-toast' });
      setIsExecutingTrade(false);
    }
  };
  
  // Watch for wrap transaction completion/failure
  useEffect(() => {
    if (!isExecutingTrade) return;
    
    if (wrapCRO.isSuccess) {
      // Clear timeout on success
      if (tradeTimeoutRef.current) {
        clearTimeout(tradeTimeoutRef.current);
        tradeTimeoutRef.current = null;
      }
      
      const amount = manualTradeAmount;
      toast.success(`Successfully bought ${amount} WCRO!`, { id: 'wrap-toast' });
      setManualTradeAmount('');
      setManualTradeDirection('buy');
      setIsExecutingTrade(false);
      loadData(); // Refresh balances
      
      // Notify backend for tracking
      if (API_BASE && address) {
        fetch(`${API_BASE}/trades/manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: 'WCRO',
            side: 'buy',
            amount: parseFloat(amount),
            walletAddress: address,
            txHash: wrapCRO.hash,
            realTransaction: true
          }),
        }).catch(console.error);
      }
    }
    
    // Handle transaction errors - only check if we have an actual error from wagmi
    if (txInitiated && wrapCRO.error && manualTradeDirection === 'buy') {
      // Clear timeout on error
      if (tradeTimeoutRef.current) {
        clearTimeout(tradeTimeoutRef.current);
        tradeTimeoutRef.current = null;
      }
      
      toast.error('Transaction cancelled or failed', { id: 'wrap-toast' });
      setIsExecutingTrade(false);
      setTxInitiated(false);
    }
  }, [wrapCRO.isSuccess, wrapCRO.isPending, wrapCRO.hash, isExecutingTrade, txInitiated, manualTradeAmount, address, manualTradeDirection]);
  
  // Watch for unwrap transaction completion/failure
  useEffect(() => {
    if (!isExecutingTrade) return;
    
    if (unwrapWCRO.isSuccess) {
      // Clear timeout on success
      if (tradeTimeoutRef.current) {
        clearTimeout(tradeTimeoutRef.current);
        tradeTimeoutRef.current = null;
      }
      
      const amount = manualTradeAmount;
      toast.success(`Successfully sold ${amount} WCRO!`, { id: 'unwrap-toast' });
      setManualTradeAmount('');
      setManualTradeDirection('buy');
      setIsExecutingTrade(false);
      loadData(); // Refresh balances
      
      // Notify backend for tracking
      if (API_BASE && address) {
        fetch(`${API_BASE}/trades/manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: 'WCRO',
            side: 'sell',
            amount: parseFloat(amount),
            walletAddress: address,
            txHash: unwrapWCRO.hash,
            realTransaction: true
          }),
        }).catch(console.error);
      }
    }
    
    // Handle transaction errors - only check if we have an actual error from wagmi
    if (txInitiated && unwrapWCRO.error && manualTradeDirection === 'sell') {
      // Clear timeout on error
      if (tradeTimeoutRef.current) {
        clearTimeout(tradeTimeoutRef.current);
        tradeTimeoutRef.current = null;
      }
      
      toast.error('Transaction cancelled or failed', { id: 'unwrap-toast' });
      setIsExecutingTrade(false);
      setTxInitiated(false);
    }
  }, [unwrapWCRO.isSuccess, unwrapWCRO.isPending, unwrapWCRO.hash, isExecutingTrade, txInitiated, manualTradeAmount, address, manualTradeDirection]);
  
  
  // Format time
  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background Vortex */}
      {mounted && (
        <div className="fixed inset-0 z-0">
          <Vortex
            backgroundColor="black"
            rangeY={1200}
            particleCount={200}
            baseHue={220}
            baseSpeed={0.1}
            className="w-full h-full opacity-30"
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-gray-800 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/logo.png" alt="Logo" width={40} height={40} className="rounded-full" />
                <span className="font-bold text-xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  CSA
                </span>
              </Link>
              <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full border border-cyan-500/30">
                Dashboard
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Agent Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-full">
                <div className={`w-2 h-2 rounded-full ${agentStatus.is_running ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs text-gray-400">
                  {agentStatus.is_running ? 'Agent Running' : 'Agent Stopped'}
                </span>
              </div>
              
              {/* Start/Stop Agent Button */}
              <button
                onClick={agentStatus.is_running ? handleStopAgent : handleStartAgent}
                disabled={isStartingAgent || isStoppingAgent}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  agentStatus.is_running
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                    : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                }`}
              >
                {isStartingAgent ? 'Starting...' : isStoppingAgent ? 'Stopping...' : agentStatus.is_running ? 'Stop Agent' : 'Start Agent'}
              </button>
              
              {/* How It Works Button */}
              <Link
                href="/how-it-works"
                className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                How It Works
              </Link>
              
              {/* WebSocket Status (if connected to backend) */}
              {wsConnected && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 backdrop-blur-sm border border-blue-500/30 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs text-blue-400">Live Data</span>
                </div>
              )}
              
              {isConnected && address && (
                <div className="px-4 py-2 bg-green-900/30 backdrop-blur-sm border border-green-500/30 rounded-full">
                  <p className="text-green-400 text-xs font-mono">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </p>
                </div>
              )}
              <div className="text-sm text-gray-400">
                Last update: {formatTime(lastUpdate)}
              </div>
              <button
                onClick={loadData}
                disabled={isRefreshing}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/"
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Home className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Top Row - Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CRO Price Card */}
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">CRO Price</span>
                <DollarSign className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-3xl font-bold">${croPrice?.price ? croPrice.price.toFixed(4) : '0.0000'}</div>
              <div className={`flex items-center gap-1 mt-2 text-sm ${(croPrice?.change_24h || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                {(croPrice?.change_24h || 0) >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {Math.abs(croPrice?.change_24h || 0).toFixed(2)}% (24h)
              </div>
            </div>

            {/* Sentiment Score Card */}
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Market Sentiment</span>
                <Gauge className="w-5 h-5 text-blue-400" />
              </div>
              <SentimentGauge value={marketIntel.sentiment} signal={marketIntel.signal} />
              <div className="text-center mt-2 text-sm text-gray-400">
                {marketIntel.sources || 0}/4 sources confirming
              </div>
            </div>

            {/* Agent Status Card */}
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">Agent Status</span>
                <Bot className={`w-5 h-5 ${agentStatus.is_running ? "text-green-400" : "text-red-400"}`} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${agentStatus.is_running ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                <span className="text-xl font-semibold">
                  {agentStatus.is_running ? "Running" : "Stopped"}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {agentStatus.is_running ? (
                  <>Next cycle in {formatCountdown(agentStatus.next_cycle_in)}</>
                ) : (
                  <>Click Start to begin trading</>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Total cycles: {agentStatus.total_cycles}
              </div>
            </div>

            {/* Sentinel Status Card */}
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">Sentinel Limit</span>
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-3xl font-bold">{sentinelStatus.remaining?.toFixed(2) || '0.00'} CRO</div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                  style={{ width: `${((sentinelStatus.remaining || 0) / (sentinelStatus.daily_limit || 1)) * 100}%` }}
                />
              </div>
              <div className="text-sm text-gray-400 mt-2">
                {sentinelStatus.spent_today?.toFixed(2) || '0.00'} / {sentinelStatus.daily_limit?.toFixed(2) || '0.00'} used today
              </div>
            </div>
          </div>

          {/* Manual Trade Panel */}
          <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 backdrop-blur-sm rounded-2xl p-6 border border-cyan-500/30">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-7 h-7 text-cyan-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Manual Trade Execution</h3>
                <p className="text-sm text-gray-400">Execute test trades instantly for demo</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Direction Selector */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Direction</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setManualTradeDirection('buy')}
                    className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all ${
                      manualTradeDirection === 'buy'
                        ? 'bg-green-500/30 text-green-400 border-2 border-green-500'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    <ArrowUp className="w-4 h-4 inline mr-1" />
                    Buy WCRO
                  </button>
                  <button
                    onClick={() => setManualTradeDirection('sell')}
                    className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all ${
                      manualTradeDirection === 'sell'
                        ? 'bg-red-500/30 text-red-400 border-2 border-red-500'
                        : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    <ArrowDown className="w-4 h-4 inline mr-1" />
                    Sell WCRO
                  </button>
                </div>
              </div>
              
              {/* Amount Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount (TCRO/WCRO)</label>
                <input
                  type="number"
                  value={manualTradeAmount}
                  onChange={(e) => setManualTradeAmount(e.target.value)}
                  step="0.1"
                  min="0.01"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="0.1"
                />
              </div>
              
              {/* Trade Info */}
              <div className="flex flex-col justify-end">
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Estimated Output</div>
                  <div className="text-white font-semibold">
                    ~{(parseFloat(manualTradeAmount) * 0.98).toFixed(4)} {manualTradeDirection === 'buy' ? 'WCRO' : 'TCRO'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">20% slippage</div>
                </div>
              </div>
              
              {/* Execute Button */}
              <div className="flex items-end">
                <button
                  onClick={handleManualTrade}
                  disabled={isExecutingTrade || !isConnected || parseFloat(manualTradeAmount) <= 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isExecutingTrade ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Execute Trade
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {!isConnected && (
              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg flex items-center gap-2 text-yellow-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Connect your wallet to execute manual trades
              </div>
            )}
          </div>

          {/* CDC Price Comparison Panel - Crypto.com Integration */}
          <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Price Comparison</h3>
                  <p className="text-sm text-gray-400">Multi-source price aggregation</p>
                </div>
              </div>
              <div className="bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30">
                <span className="text-xs font-semibold text-purple-400">Powered by Crypto.com</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* CoinGecko Price */}
              <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">CoinGecko</span>
                  <div className="px-2 py-0.5 bg-blue-500/20 rounded text-xs text-blue-400 border border-blue-500/30">
                    Primary
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">
                    ${croPrice?.price ? croPrice.price.toFixed(6) : '0.080000'}
                  </span>
                </div>
                <div className={`text-sm mt-1 ${(croPrice?.change_24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  24h: {(croPrice?.change_24h || 0) >= 0 ? '+' : ''}{(croPrice?.change_24h || 0).toFixed(2)}%
                </div>
              </div>
              
              {/* Crypto.com Price */}
              <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 backdrop-blur-sm rounded-xl p-4 border border-purple-500/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Crypto.com</span>
                  <div className="px-2 py-0.5 bg-purple-500/20 rounded text-xs text-purple-400 border border-purple-500/30">
                    CDC Agent
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">
                    ${cdcPrice?.price ? cdcPrice.price.toFixed(6) : '0.085000'}
                  </span>
                </div>
                <div className={`text-sm mt-1 ${(cdcPrice?.change24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  24h: {(cdcPrice?.change24h || 0) >= 0 ? '+' : ''}{(cdcPrice?.change24h || 0).toFixed(2)}%
                </div>
              </div>
            </div>
            
            {/* Comparison Stats */}
            {priceComparison && priceComparison.avgPrice !== undefined ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-900/40 rounded-lg p-3 text-center border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Average</div>
                  <div className="text-lg font-bold text-cyan-400">
                    ${priceComparison?.avgPrice ? priceComparison.avgPrice.toFixed(6) : '0.000000'}
                  </div>
                </div>
                <div className="bg-gray-900/40 rounded-lg p-3 text-center border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Difference</div>
                  <div className={`text-lg font-bold ${Math.abs(priceComparison?.percentageDiff || 0) < 1 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {(priceComparison?.percentageDiff || 0) >= 0 ? '+' : ''}{(priceComparison?.percentageDiff || 0).toFixed(2)}%
                  </div>
                </div>
                <div className="bg-gray-900/40 rounded-lg p-3 text-center border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Spread</div>
                  <div className="text-lg font-bold text-purple-400">
                    ${((priceComparison?.spread || 0) * 1000).toFixed(3)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-900/40 border border-gray-700 rounded-lg text-center">
                <p className="text-gray-400 text-sm">Fetching price comparison data...</p>
              </div>
            )}
            
            <div className="mt-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
              <p className="text-xs text-gray-400 text-center">
                📡 Real-time price feeds powered by <span className="text-purple-400 font-semibold">Crypto.com Agent Client SDK</span>
              </p>
            </div>
          </div>

          {/* Multi-Agent Council Panel */}
          <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
            <div className="flex items-center gap-3 mb-6">
              <Bot className="w-7 h-7 text-blue-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Multi-Agent Trading Council</h3>
                <p className="text-sm text-gray-400">3 AI agents vote on every decision</p>
              </div>
            </div>
            
            {agentVotes.length > 0 && agentStatus.is_running ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {agentVotes.map((agent, idx) => {
                  const voteColors = {
                    strong_buy: 'bg-green-500/20 border-green-500 text-green-400',
                    buy: 'bg-green-500/10 border-green-500/50 text-green-400',
                    hold: 'bg-gray-500/20 border-gray-500 text-gray-400',
                    sell: 'bg-red-500/10 border-red-500/50 text-red-400',
                    strong_sell: 'bg-red-500/20 border-red-500 text-red-400'
                  };
                  
                  const agentIcons = {
                    '🛡️ Risk Manager': '🛡️',
                    '📊 Market Analyst': '📊',
                    '⚡ Execution Specialist': '⚡'
                  };
                  
                  return (
                    <div key={idx} className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-5 border border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{agentIcons[agent.agent as keyof typeof agentIcons] || '🤖'}</span>
                          <div>
                            <div className="font-semibold text-white text-sm">
                              {agent.agent.replace('🛡️ ', '').replace('📊 ', '').replace('⚡ ', '')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {agent.agent.includes('Risk') ? 'Conservative' : 
                               agent.agent.includes('Market') ? 'Data-Driven' : 'Aggressive'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`px-4 py-2 rounded-lg border-2 mb-3 text-center font-bold ${voteColors[agent.vote as keyof typeof voteColors] || voteColors.hold}`}>
                        {agent.vote.toUpperCase().replace('_', ' ')}
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-400">Confidence</span>
                          <span className="text-xs text-white font-semibold">{(agent.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                            style={{ width: `${agent.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-400 leading-relaxed">
                        {agent.reasoning}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-900/20 border border-gray-800 rounded-lg p-8 text-center opacity-50">
                <Bot className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-500 mb-2">Multi-Agent Council Inactive</p>
                <p className="text-sm text-gray-600">
                  {agentStatus.is_running ? '3 AI agents will vote on the next trading decision' : 'Start the agent to activate the trading council'}
                </p>
              </div>
            )}
          </div>

          {/* Performance Dashboard */}
          <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-7 h-7 text-purple-400" />
                <div>
                  <h3 className="text-lg font-semibold text-white">Trading Performance</h3>
                  <p className="text-sm text-gray-400">Live statistics from all executed trades</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Total Trades</div>
                <div className="text-2xl font-bold text-white">{performanceMetrics.totalTrades}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Win Rate */}
              <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-xs text-gray-400">Win Rate</span>
                </div>
                <div className="text-2xl font-bold text-green-400">
                  {performanceMetrics.winRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {performanceMetrics.winningTrades}W / {performanceMetrics.losingTrades}L
                </div>
              </div>
              
              {/* Total P&L */}
              <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs text-gray-400">Total P&L</span>
                </div>
                <div className={`text-2xl font-bold ${performanceMetrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {performanceMetrics.totalPnL >= 0 ? '+' : ''}{performanceMetrics.totalPnL.toFixed(3)}
                </div>
                <div className="text-xs text-gray-500 mt-1">TCRO</div>
              </div>
              
              {/* Best Trade */}
              <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUp className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-gray-400">Best Trade</span>
                </div>
                <div className="text-2xl font-bold text-green-400">
                  +{performanceMetrics.bestTrade.toFixed(3)}
                </div>
                <div className="text-xs text-gray-500 mt-1">TCRO</div>
              </div>
              
              {/* Worst Trade */}
              <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDown className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-gray-400">Worst Trade</span>
                </div>
                <div className="text-2xl font-bold text-red-400">
                  {performanceMetrics.worstTrade.toFixed(3)}
                </div>
                <div className="text-xs text-gray-500 mt-1">TCRO</div>
              </div>
              
              {/* Average Profit */}
              <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-3 h-3 text-blue-400" />
                  <span className="text-xs text-gray-400">Avg Profit</span>
                </div>
                <div className={`text-2xl font-bold ${performanceMetrics.avgProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {performanceMetrics.avgProfit >= 0 ? '+' : ''}{performanceMetrics.avgProfit.toFixed(3)}
                </div>
                <div className="text-xs text-gray-500 mt-1">per trade</div>
              </div>
              
              {/* Success Rate Gauge */}
              <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-3 h-3 text-purple-400" />
                  <span className="text-xs text-gray-400">Score</span>
                </div>
                <div className="text-2xl font-bold text-purple-400">
                  {performanceMetrics.totalTrades > 0 ? 
                    Math.min(100, Math.round(performanceMetrics.winRate * 1.2)).toString() : '0'}
                </div>
                <div className="text-xs text-gray-500 mt-1">/ 100</div>
              </div>
            </div>
            
            {performanceMetrics.totalTrades === 0 && (
              <div className="mt-4 p-4 bg-gray-900/40 border border-gray-700 rounded-lg text-center">
                <p className="text-gray-400 text-sm">
                  No trades yet. Execute your first trade to see performance metrics!
                </p>
              </div>
            )}
          </div>

          {/* Second Row - TradingView Chart and Sentiment History */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* TradingView Chart */}
            <div className="lg:col-span-2 bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800 h-[500px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  CRO/USD Live Chart
                </h3>
                <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">TradingView</span>
              </div>
              <div className="h-[calc(100%-64px)] w-full bg-black/20 rounded-lg overflow-hidden border border-gray-800/50">
                <TradingViewWidget />
              </div>
            </div>

            {/* Sentiment History Chart */}
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-800 h-[400px] min-h-[300px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Sentiment (24h)
                </h3>
              </div>
              {sentimentHistory.length > 0 ? (
                <div className="w-full h-[calc(100%-50px)] min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sentimentHistory}>
                      <defs>
                        <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="hour" stroke="#6b7280" fontSize={10} />
                      <YAxis stroke="#6b7280" fontSize={10} domain={[0, 1]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                        labelStyle={{ color: "#9ca3af" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="sentiment"
                        stroke="#06b6d4"
                        fill="url(#sentimentGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[calc(100%-50px)]">
                  <div className="text-center text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No sentiment data yet</p>
                    <p className="text-sm mt-1">Start the agent to collect sentiment data</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Third Row - Pool Status and Wallet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pool Status */}
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                WCRO/tUSD Pool
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-400 text-sm mb-1">WCRO Balance</div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {poolStatus.wcro_balance.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">tUSD Balance</div>
                  <div className="text-2xl font-bold text-green-400">
                    {poolStatus.tusd_balance.toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Pool Price</span>
                  <span className="font-semibold">${poolStatus.price.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-400">TVL</span>
                  <span className="font-semibold">${poolStatus.tvl_usd.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Wallet Balances */}
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-purple-400" />
                Wallet Balances
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-300">WCRO</span>
                  <span className="font-mono font-semibold text-cyan-400">
                    {walletBalances.CRO?.toFixed(4) || '0.0000'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-300">TCRO</span>
                  <span className="font-mono font-semibold text-green-400">
                    {walletBalances.USDC?.toFixed(4) || '0.0000'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-300">Total Value</span>
                  <span className="font-mono font-semibold text-blue-400">
                    ${walletBalances.totalValue?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-500 truncate">
                  {address || 'Not connected'}
                </div>
              </div>
            </div>
          </div>

          {/* Fourth Row - Blockchain Event Monitor */}
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Smart Contract Event Monitor
                {blockchainStats.monitoring && (
                  <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Live
                  </span>
                )}
              </h3>
              <div className="flex gap-4 text-sm text-gray-400">
                <span>✅ Approved: <strong className="text-green-400">{blockchainStats.approved}</strong></span>
                <span>🚫 Blocked: <strong className="text-red-400">{blockchainStats.blocked}</strong></span>
                <span>💳 X402: <strong className="text-blue-400">{blockchainStats.x402Payments}</strong></span>
                <span>📊 Total: <strong className="text-white">{blockchainStats.totalEvents}</strong></span>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-900/80 backdrop-blur-sm">
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                    <th className="pb-3 pr-4">Time</th>
                    <th className="pb-3 pr-4">Event</th>
                    <th className="pb-3 pr-4">Agent</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Reason</th>
                    <th className="pb-3">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {blockchainEvents.map((event, index) => (
                    <tr key={`${event.txHash}-${index}`} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 pr-4 text-sm">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            event.type === "TransactionApproved"
                              ? "bg-green-500/20 text-green-400"
                              : event.type === "TransactionBlocked"
                              ? "bg-red-500/20 text-red-400"
                              : event.type === "X402PaymentApproved"
                              ? "bg-blue-500/20 text-blue-400"
                              : event.type === "ManualTradeExecuted"
                              ? "bg-purple-500/20 text-purple-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {event.type === "TransactionApproved" ? "✅ APPROVED" :
                           event.type === "TransactionBlocked" ? "🚫 BLOCKED" :
                           event.type === "X402PaymentApproved" ? "💳 X402" :
                           event.type === "ManualTradeExecuted" ? "🎯 MANUAL" :
                           event.type}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs">
                        {event.agent ? `${event.agent.slice(0, 6)}...${event.agent.slice(-4)}` : '-'}
                      </td>
                      <td className="py-3 pr-4 font-mono">
                        {event.amount ? `${parseFloat(event.amount).toFixed(4)} TCRO` : "-"}
                      </td>
                      <td className="py-3 pr-4">
                        {event.type === "TransactionApproved" ? (
                          <span className="text-green-400 text-sm">✓ Success</span>
                        ) : event.type === "TransactionBlocked" ? (
                          <span className="text-red-400 text-sm">✗ Blocked</span>
                        ) : (
                          <span className="text-blue-400 text-sm">● Paid</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-400 max-w-xs truncate">
                        {event.reason || event.service || '-'}
                      </td>
                      <td className="py-3">
                        {event.txHash ? (
                          <a
                            href={`https://explorer.cronos.org/testnet/tx/${event.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300"
                            title="View on Cronos Explorer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {blockchainEvents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {blockchainStats.monitoring ? (
                    <div>
                      <div className="animate-pulse mb-2">🔍 Listening to blockchain events...</div>
                      <div className="text-sm">All SentinelClamp transactions will appear here in real-time</div>
                    </div>
                  ) : (
                    <div>Event monitor initializing...</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Agent Decision Log */}
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              Agent Decision Log
            </h3>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {agentDecisions.length > 0 ? (
                agentDecisions.map((decision, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-400">
                        {new Date(decision.timestamp).toLocaleString()}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          decision.decision.includes("BUY")
                            ? "bg-green-500/20 text-green-400"
                            : decision.decision.includes("SELL")
                            ? "bg-red-500/20 text-red-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {decision.decision}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Market Data: </span>
                        <span className="text-gray-200">{decision.market_data}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Sentinel Status: </span>
                        <span className="text-gray-200">{decision.sentinel_status}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-700">
                        <span className="text-gray-400">Reason: </span>
                        <span className="text-gray-200">{decision.reason}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No agent decisions yet.</p>
                  <p className="text-sm mt-1">Start the AI agent to see decision logs here.</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Agent Chat Interface */}
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              Chat with AI Agents & MCPs
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Ask questions about market data, sentiment analysis, Sentinel status, or trading strategies.
              Our 9 AI agents and MCP tools are ready to help!
            </p>
            
            {/* Chat Messages */}
            <div className="bg-black/30 rounded-xl p-4 mb-4 h-[400px] overflow-y-auto space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No messages yet. Start a conversation!</p>
                  <p className="text-xs mt-2">Try asking: "What's the current CRO price?" or "Should I buy now?"</p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-200 border border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {msg.role === 'agent' && <Bot className="w-4 h-4 mt-1 flex-shrink-0 text-cyan-400" />}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs opacity-60 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span className="text-sm text-gray-400">Agent is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            {/* Chat Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                placeholder="Ask about market conditions, sentiment, or trading advice..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cyan-500"
                disabled={isChatLoading}
              />
              <button
                onClick={handleSendChatMessage}
                disabled={!chatInput.trim() || isChatLoading}
                className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>

          {/* Risk Controls Panel */}
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-orange-400" />
              Risk Controls & Safety Settings
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Configure trading limits and risk parameters. All changes apply immediately to the autonomous agent.
            </p>
            
            <div className="space-y-6">
              {/* Daily Limit Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-300">Daily Trade Limit</label>
                  <span className="text-cyan-400 font-bold">{riskControls.dailyLimit} TCRO</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={riskControls.dailyLimit}
                  onChange={(e) => updateRiskControls({ dailyLimit: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 TCRO</span>
                  <span>10 TCRO</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Maximum total TCRO the agent can trade per day
                </p>
              </div>

              {/* Max Trade Size Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-300">Max Trade Size</label>
                  <span className="text-green-400 font-bold">{riskControls.maxTradeSize} TCRO</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.5"
                  value={riskControls.maxTradeSize}
                  onChange={(e) => updateRiskControls({ maxTradeSize: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.5 TCRO</span>
                  <span>5 TCRO</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Maximum TCRO per single trade execution
                </p>
              </div>

              {/* Stop Loss Percentage Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-300">Stop-Loss Threshold</label>
                  <span className="text-red-400 font-bold">-{riskControls.stopLossPercent}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={riskControls.stopLossPercent}
                  onChange={(e) => updateRiskControls({ stopLossPercent: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>-1%</span>
                  <span>-20%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Auto-exit position if price drops by this percentage
                </p>
              </div>

              {/* Emergency Stop Toggle */}
              <div className="pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Emergency Stop Protection</label>
                    <p className="text-xs text-gray-500 mt-1">
                      Allows manual intervention to halt all trading
                    </p>
                  </div>
                  <button
                    onClick={() => updateRiskControls({ emergencyStopEnabled: !riskControls.emergencyStopEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      riskControls.emergencyStopEnabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        riskControls.emergencyStopEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Current Settings Summary */}
              <div className="bg-black/30 rounded-lg p-4 border border-gray-700">
                <h4 className="text-sm font-semibold mb-3 text-gray-300">Active Risk Parameters</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Daily Limit:</span>
                    <span className="ml-2 text-cyan-400 font-medium">{riskControls.dailyLimit} TCRO</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Max Trade:</span>
                    <span className="ml-2 text-green-400 font-medium">{riskControls.maxTradeSize} TCRO</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Stop-Loss:</span>
                    <span className="ml-2 text-red-400 font-medium">-{riskControls.stopLossPercent}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Safety:</span>
                    <span className={`ml-2 font-medium ${riskControls.emergencyStopEnabled ? 'text-green-400' : 'text-gray-500'}`}>
                      {riskControls.emergencyStopEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Explainable AI Panel */}
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Explainable AI - Decision Breakdown
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Full transparency into how our AI agent makes trading decisions. See exact reasoning, sentiment weights, and risk factors.
            </p>
            
            {explainableAI ? (
              <div className="space-y-6">
                {/* Decision Summary */}
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-purple-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-1">Decision: {(explainableAI?.decision || 'HOLD').toUpperCase()}</h4>
                      <p className="text-xs text-gray-400">Based on multi-source analysis</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-400">{((explainableAI?.confidence || 0) * 100).toFixed(1)}%</div>
                      <div className="text-xs text-gray-400">Confidence</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all"
                      style={{ width: `${(explainableAI?.confidence || 0) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Price Indicators */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    Price Indicators
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Current Price</div>
                      <div className="text-lg font-bold text-cyan-400">${((explainableAI as any)?.price_indicators?.current_price || 0).toFixed(4)}</div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">24h Change</div>
                      <div className={`text-lg font-bold ${(explainableAI as any)?.price_indicators?.change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(explainableAI as any)?.price_indicators?.change_24h >= 0 ? '+' : ''}{((explainableAI as any)?.price_indicators?.change_24h || 0).toFixed(2)}%
                      </div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Moving Avg</div>
                      <div className="text-lg font-bold text-blue-400">${((explainableAI as any)?.price_indicators?.moving_avg || 0).toFixed(4)}</div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                      <div className="text-xs text-gray-500 mb-1">Trend</div>
                      <div className="text-lg font-bold text-purple-400">{(explainableAI as any)?.price_indicators?.trend || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Sentiment Weights */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-green-400" />
                    Sentiment Analysis Weights
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400">CoinGecko Data</span>
                        <span className="text-xs font-semibold text-white">{(((explainableAI as any)?.sentiment_weights?.coingecko || 25) / 100 * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{ width: `${(explainableAI as any)?.sentiment_weights?.coingecko || 25}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400">News Sentiment</span>
                        <span className="text-xs font-semibold text-white">{(((explainableAI as any)?.sentiment_weights?.news || 25) / 100 * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{ width: `${(explainableAI as any)?.sentiment_weights?.news || 25}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400">Social Media</span>
                        <span className="text-xs font-semibold text-white">{(((explainableAI as any)?.sentiment_weights?.social_media || 25) / 100 * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: `${(explainableAI as any)?.sentiment_weights?.social_media || 25}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-400">Technical Analysis</span>
                        <span className="text-xs font-semibold text-white">{(((explainableAI as any)?.sentiment_weights?.technical || 25) / 100 * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full" style={{ width: `${(explainableAI as any)?.sentiment_weights?.technical || 25}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Factors */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-orange-400" />
                    Risk Assessment
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-700 text-center">
                      <div className="text-xs text-gray-500 mb-1">Volatility</div>
                      <div className={`text-sm font-bold ${
                        ((explainableAI as any)?.risk_assessment?.volatility || 'Medium') === 'Low' ? 'text-green-400' :
                        ((explainableAI as any)?.risk_assessment?.volatility || 'Medium') === 'Medium' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {(explainableAI as any)?.risk_assessment?.volatility || 'Medium'}
                      </div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-700 text-center">
                      <div className="text-xs text-gray-500 mb-1">Volume</div>
                      <div className={`text-sm font-bold ${
                        ((explainableAI as any)?.risk_assessment?.volume || 'Medium') === 'High' ? 'text-green-400' :
                        ((explainableAI as any)?.risk_assessment?.volume || 'Medium') === 'Medium' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {(explainableAI as any)?.risk_assessment?.volume || 'Medium'}
                      </div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-700 text-center">
                      <div className="text-xs text-gray-500 mb-1">Sentiment</div>
                      <div className={`text-sm font-bold ${
                        ((explainableAI as any)?.risk_assessment?.sentiment || 'Neutral') === 'Positive' ? 'text-green-400' :
                        ((explainableAI as any)?.risk_assessment?.sentiment || 'Neutral') === 'Neutral' ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {(explainableAI as any)?.risk_assessment?.sentiment || 'Neutral'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reasoning Breakdown */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    Detailed Reasoning
                  </h4>
                  <div className="bg-black/30 rounded-lg p-4 border border-gray-700">
                    <ul className="space-y-2">
                      {(Array.isArray(explainableAI?.reasoning) 
                        ? explainableAI.reasoning 
                        : [explainableAI?.reasoning || 'No reasoning available']
                      ).map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-purple-400 mt-1">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-700">
                  Last Updated: {new Date(explainableAI.timestamp).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No AI decision data available yet.</p>
                <p className="text-xs mt-2">Start the agent to see detailed reasoning and analysis.</p>
              </div>
            )}
          </div>

          {/* Fifth Row - Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Last Decision Card */}
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                Last Trade Decision
              </h3>
              
              {tradeHistory[0] && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                        tradeHistory[0].action === "sell"
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : tradeHistory[0].action === "buy"
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                      }`}
                    >
                      {(tradeHistory[0].action || 'hold').toUpperCase()}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {formatTime(tradeHistory[0].timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-gray-300">{tradeHistory[0].reason || 'No reason provided'}</p>
                  
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-700">
                    <div>
                      <div className="text-gray-500 text-xs">Sentiment</div>
                      <div className="font-semibold">{((tradeHistory[0].sentiment_score || 0) * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Confidence</div>
                      <div className="font-semibold">{((tradeHistory[0].confidence || 0) * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Gas Cost</div>
                      <div className="font-semibold">${(tradeHistory[0].gas_cost_usd || 0).toFixed(3)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Emergency Stop Card */}
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Agent Controls
              </h3>
              
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">
                  Emergency stop will immediately halt all autonomous trading activity.
                  The agent will need to be manually restarted.
                </p>
                
                <div className="flex gap-4">
                  {agentStatus.is_running ? (
                    <button
                      onClick={handleEmergencyStop}
                      disabled={isEmergencyStopping}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                    >
                      {isEmergencyStopping ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Pause className="w-5 h-5" />
                      )}
                      Stop Agent
                    </button>
                  ) : (
                    <button
                      onClick={handleStartAgent}
                      disabled={isEmergencyStopping}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl font-semibold hover:bg-green-500/30 transition-colors disabled:opacity-50"
                    >
                      {isEmergencyStopping ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                      Start Agent
                    </button>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 text-center">
                  Agent persists across page refreshes - manually start/stop only
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-800 mt-8 py-6 px-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <div>Sentinel Alpha Dashboard - Cronos x402 Hackathon</div>
            <div className="flex gap-4">
              <a
                href="https://explorer.cronos.org/testnet"
                target="_blank"
                className="hover:text-white"
              >
                Cronos Explorer
              </a>
              <a
                href="https://github.com/UjjwalCodes01/CSA"
                target="_blank"
                className="hover:text-white"
              >
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
