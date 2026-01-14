"use client";
import { useState, useEffect, useRef } from "react";
import { Vortex } from "@/components/ui/vortex";
import Image from "next/image";
import Link from "next/link";
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
import { useSentinelStatus, useWCROBalance, useTCROBalance } from "@/lib/contract-hooks";

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
    thinkingLog: wsThinkingLog
  } = useWebSocket();
  
  // Emergency stop hook
  const { emergencyStop } = useEmergencyStop();
  
  // Contract hooks for on-chain data
  const sentinelData = useSentinelStatus();
  const wcroBalance = useWCROBalance(address);
  const tcroBalance = useTCROBalance(address);
  
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
    is_running: false,
    last_cycle: new Date().toISOString(),
    total_cycles: 0,
    next_cycle_in: 0,
  });
  const [tradeHistory, setTradeHistory] = useState<TradeDecision[]>([]);
  const [sentimentHistory, setSentimentHistory] = useState<any[]>(() => {
    // Generate dummy sentiment data for last 24 hours
    const now = new Date();
    const dummyData = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      dummyData.push({
        hour: hour.getHours() + ':00',
        sentiment: 0.45 + Math.random() * 0.3, // Random sentiment between 0.45-0.75
        timestamp: hour.toISOString()
      });
    }
    return dummyData;
  });
  const [agentDecisions, setAgentDecisions] = useState<AgentDecision[]>([]);
  const [isEmergencyStopping, setIsEmergencyStopping] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [agentThinkingLog, setAgentThinkingLog] = useState<Array<{
    timestamp: string;
    type: 'analysis' | 'decision' | 'trade' | 'warning' | 'info';
    message: string;
  }>>([]);
  
  // Add thinking log entry
  const addThinkingLog = (type: 'analysis' | 'decision' | 'trade' | 'warning' | 'info', message: string) => {
    setAgentThinkingLog(prev => {
      const newLog = [{
        timestamp: new Date().toISOString(),
        type,
        message
      }, ...prev].slice(0, 50); // Keep last 50 entries
      return newLog;
    });
  };
  
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
      setSentinelStatus(prev => ({
        ...prev,
        is_active: sentinelData.canTrade,
        daily_limit: parseFloat(sentinelData.dailyLimit),
        daily_spent: parseFloat(sentinelData.dailySpent),
        remaining_limit: parseFloat(sentinelData.remainingLimit),
        total_transactions: sentinelData.totalTransactions,
        x402_transactions: sentinelData.x402Transactions,
      }));
    }
  }, [sentinelData.dailyLimit, sentinelData.dailySpent, sentinelData.remainingLimit, sentinelData.totalTransactions, sentinelData.x402Transactions, sentinelData.canTrade]);
  
  // Update from WebSocket
  useEffect(() => {
    if (wsAgentStatus && wsAgentStatus.lastUpdate) {
      setAgentStatus(prev => ({
        ...prev,
        is_running: wsAgentStatus.status !== 'stopped' && wsAgentStatus.status !== 'idle',
        current_action: wsAgentStatus.currentAction || 'Monitoring markets',
        last_trade_time: wsAgentStatus.lastUpdate,
        confidence_threshold: wsAgentStatus.confidence || 0.7,
      }));
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
        profit_loss: 0,
        gas_cost_usd: 0.001,
        tx_hash: trade.txHash,
        reason: `${trade.type || 'TRADE'} ${trade.amountIn || '0'} ${trade.tokenIn || ''} → ${trade.tokenOut || ''}`,
      }));
      setTradeHistory(newTrades);
    }
  }, [wsTrades?.length]);
  
  // Update sentiment from WebSocket
  useEffect(() => {
    if (wsSentiment && wsSentiment.timestamp) {
      setSentimentHistory(prev => {
        const lastEntry = prev[prev.length - 1];
        if (lastEntry?.timestamp === wsSentiment.timestamp) return prev;
        
        return [
          ...prev.slice(-23),
          {
            timestamp: wsSentiment.timestamp,
            score: wsSentiment.score,
            reddit: wsSentiment.sources.reddit,
            twitter: wsSentiment.sources.twitter,
            news: wsSentiment.sources.news,
          }
        ];
      });
      setMarketIntel(prev => ({
        ...prev,
        overall_sentiment: wsSentiment.score,
        reddit_sentiment: wsSentiment.sources.reddit,
        twitter_sentiment: wsSentiment.sources.twitter,
        news_sentiment: wsSentiment.sources.news,
      }));
    }
  }, [wsSentiment?.timestamp, wsSentiment?.score]);
  
  // Update thinking log from WebSocket
  useEffect(() => {
    if (wsThinkingLog && wsThinkingLog.length > 0) {
      setAgentThinkingLog(wsThinkingLog);
    }
  }, [wsThinkingLog]);
  
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
      
      // Fetch sentiment
      const sentimentRes = await fetch(`${API_BASE}/market/sentiment`);
      if (sentimentRes.ok) {
        const sentData = await sentimentRes.json();
        setMarketIntel(prev => ({
          ...prev,
          signal: sentData.signal || 'hold',
          sentiment: parseFloat(sentData.score) || 0,
          sources: sentData.sources?.length || 0,
          timestamp: sentData.timestamp || new Date().toISOString(),
        }));
      }
      
      // Fetch trade history
      const tradesRes = await fetch(`${API_BASE}/trades/history`);
      if (tradesRes.ok) {
        const tradesData = await tradesRes.json();
        if (tradesData.trades) {
          setTradeHistory(tradesData.trades);
        }
      }
      
      // Fetch agent decisions
      const decisionsRes = await fetch(`${API_BASE}/agent/decisions`);
      if (decisionsRes.ok) {
        const decisionsData = await decisionsRes.json();
        if (decisionsData.decisions) {
          setAgentDecisions(decisionsData.decisions);
        }
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsRefreshing(false);
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

  // Initial load only (no auto-refresh) - removed to fix hydration
  // Data loads from mock immediately, no loading state needed

  // Emergency stop handler - stops trading but keeps monitoring
  const handleEmergencyStop = async () => {
    setIsEmergencyStopping(true);
    try {
      const response = await fetch(`${API_BASE}/agent/emergency-stop`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        toast.error('🛑 Emergency Stop: All activities halted');
        setAgentStatus((prev) => ({ ...prev, is_running: false }));
      } else {
        toast.error('Failed to stop agent');
      }
    } catch (error) {
      toast.error('Error stopping agent');
      console.error(error);
    } finally {
      setIsEmergencyStopping(false);
    }
  };

  const handleStartAgent = async () => {
    setIsStarting(true);
    try {
      const response = await fetch(`${API_BASE}/agent/start`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        toast.success('🚀 AI Agent started successfully');
        setAgentStatus((prev) => ({ ...prev, is_running: true }));
      } else {
        toast.error(data.message || 'Failed to start agent');
      }
    } catch (error) {
      toast.error('Error starting agent');
      console.error(error);
    } finally {
      setIsStarting(false);
    }
  };
  
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

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-gray-800 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/logo.png" alt="Logo" width={40} height={40} className="rounded-full" />
                <span className="font-bold text-xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Sentinel Alpha
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
              <div className="text-3xl font-bold">${croPrice.price.toFixed(4)}</div>
              <div className={`flex items-center gap-1 mt-2 text-sm ${croPrice.change_24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                {croPrice.change_24h >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                {Math.abs(croPrice.change_24h).toFixed(2)}% (24h)
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
                {agentStatus.is_running && (
                  <>Next cycle in {formatCountdown(agentStatus.next_cycle_in)}</>
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
              <div className="text-3xl font-bold">{sentinelStatus.remaining_limit?.toFixed(2) || '0.00'} CRO</div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                  style={{ width: `${((sentinelStatus.remaining_limit || 0) / (sentinelStatus.daily_limit || 1)) * 100}%` }}
                />
              </div>
              <div className="text-sm text-gray-400 mt-2">
                {sentinelStatus.daily_spent?.toFixed(2) || '0.00'} / {sentinelStatus.daily_limit?.toFixed(2) || '0.00'} used today
              </div>
            </div>
          </div>

          {/* Agent Controls - Prominent Position */}
          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${agentStatus.is_running ? 'bg-green-500/20 border-2 border-green-500' : 'bg-gray-500/20 border-2 border-gray-500'}`}>
                  <Bot className={`w-6 h-6 ${agentStatus.is_running ? 'text-green-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AI Trading Agent</h3>
                  <p className="text-sm text-gray-400">
                    {agentStatus.is_running ? '🟢 Active - Running every 2 minutes' : '⚫ Stopped - Click to start'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                {agentStatus.is_running ? (
                  <button
                    onClick={handleEmergencyStop}
                    disabled={isEmergencyStopping}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-red-500/20 text-red-400 border-2 border-red-500/30 rounded-xl font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    {isEmergencyStopping ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Pause className="w-6 h-6" />
                    )}
                    <span className="text-lg">Emergency Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartAgent}
                    disabled={isStarting}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-green-500/20 text-green-400 border-2 border-green-500/30 rounded-xl font-semibold hover:bg-green-500/30 transition-colors disabled:opacity-50"
                  >
                    {isStarting ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                    <span className="text-lg">Start AI Agent</span>
                  </button>
                )}
              </div>
            </div>
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
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-800 h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Sentiment (24h)
                </h3>
              </div>
              <ResponsiveContainer width="100%" height="85%">
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

          {/* Fourth Row - Trade History */}
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Trade History
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                    <th className="pb-3 pr-4">Time</th>
                    <th className="pb-3 pr-4">Action</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Price</th>
                    <th className="pb-3 pr-4">Confidence</th>
                    <th className="pb-3 pr-4">Gas</th>
                    <th className="pb-3 pr-4">Reason</th>
                    <th className="pb-3">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.map((trade) => (
                    <tr key={trade.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 pr-4 text-sm">
                        {formatTime(trade.timestamp)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            trade.action === "sell"
                              ? "bg-green-500/20 text-green-400"
                              : trade.action === "buy"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {(trade.action || 'hold').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono">
                        {(trade.amount || 0) > 0 ? `${(trade.amount || 0).toFixed(2)} WCRO` : "-"}
                      </td>
                      <td className="py-3 pr-4 font-mono">${(trade.price || 0).toFixed(4)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-cyan-500 h-2 rounded-full"
                              style={{ width: `${(trade.confidence || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm">{((trade.confidence || 0) * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-400">
                        {(trade.gas_cost_usd || 0) > 0 ? `$${(trade.gas_cost_usd || 0).toFixed(3)}` : "-"}
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-400 max-w-xs truncate">
                        {trade.reason || '-'}
                      </td>
                      <td className="py-3">
                        {trade.tx_hash ? (
                          <a
                            href={`https://explorer.cronos.org/testnet3/tx/${trade.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300"
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
              {tradeHistory.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No trades yet. Agent will execute trades automatically when conditions are favorable.
                </div>
              )}
            </div>
          </div>

          {/* AI LIVE THINKING PANEL - NEW FEATURE */}
          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
                AI Agent Live Thinking
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-400">Live</span>
              </div>
            </div>
            
            <div className="bg-black/40 rounded-lg p-4 font-mono text-xs max-h-[500px] overflow-y-auto border border-gray-700">
              <div className="space-y-2">
                {/* Live AI Thinking Stream */}
                {agentThinkingLog.length > 0 ? (
                  agentThinkingLog.map((log, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 py-2 ${
                        idx === 0 ? 'animate-pulse' : 'opacity-80'
                      }`}
                    >
                      <span className="text-gray-500 text-xs font-mono shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="flex-1">
                        <span className={`text-sm ${
                          log.type === 'analysis' ? 'text-cyan-400' :
                          log.type === 'decision' ? 'text-purple-400' :
                          log.type === 'trade' ? 'text-green-400' :
                          log.type === 'warning' ? 'text-yellow-400' :
                          'text-gray-300'
                        }`}>
                          {log.message}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>AI agent not active</p>
                    <p className="text-sm mt-1">Start the agent to see live analysis</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* REMOVED - Controls moved to top for better visibility */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```
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
                      Emergency Stop
                    </button>
                  ) : (
                    <button
                      onClick={handleStartAgent}
                      disabled={isStarting}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl font-semibold hover:bg-green-500/30 transition-colors disabled:opacity-50"
                    >
                      {isStarting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                      Start Agent
                    </button>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 text-center">
                  Control the autonomous AI trading agent
                </div>
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
                href="https://explorer.cronos.org/testnet3"
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
