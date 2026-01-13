"use client";
import { useState, useEffect, useRef } from "react";
import { Vortex } from "@/components/ui/vortex";
import Image from "next/image";
import Link from "next/link";
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
  mockData,
  type MarketIntelligence,
  type CROPrice,
  type PoolStatus,
  type WalletBalances,
  type SentinelStatus,
  type AgentStatus,
  type TradeDecision,
} from "@/lib/api";

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
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketIntel, setMarketIntel] = useState<MarketIntelligence>(mockData.marketIntelligence);
  const [croPrice, setCroPrice] = useState<CROPrice>(mockData.croPrice);
  const [poolStatus, setPoolStatus] = useState<PoolStatus>(mockData.poolStatus);
  const [walletBalances, setWalletBalances] = useState<WalletBalances>(mockData.walletBalances);
  const [sentinelStatus, setSentinelStatus] = useState<SentinelStatus>(mockData.sentinelStatus);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>(mockData.agentStatus);
  const [tradeHistory, setTradeHistory] = useState<TradeDecision[]>(mockData.tradeHistory);
  const [sentimentHistory, setSentimentHistory] = useState(mockData.sentimentHistory);
  const [isEmergencyStopping, setIsEmergencyStopping] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Load data function
  const loadData = async () => {
    setIsRefreshing(true);
    // In production, replace with actual API calls
    // For now, using mock data
    await new Promise((r) => setTimeout(r, 800));
    setIsRefreshing(false);
    setLastUpdate(new Date());
  };

  // Initial load only (no auto-refresh)
  useEffect(() => {
    const initialLoad = async () => {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 1000));
      setIsLoading(false);
      setLastUpdate(new Date());
    };
    initialLoad();
  }, []);

  // Emergency stop handler
  const handleEmergencyStop = async () => {
    setIsEmergencyStopping(true);
    await new Promise((r) => setTimeout(r, 1500));
    setAgentStatus((prev) => ({ ...prev, is_running: false }));
    setIsEmergencyStopping(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
                {marketIntel.strength}/4 sources confirming
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
              <div className="text-3xl font-bold">{sentinelStatus.remaining.toFixed(2)} CRO</div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                  style={{ width: `${(sentinelStatus.remaining / sentinelStatus.daily_limit) * 100}%` }}
                />
              </div>
              <div className="text-sm text-gray-400 mt-2">
                {sentinelStatus.spent_today.toFixed(2)} / {sentinelStatus.daily_limit.toFixed(2)} used today
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
                  <span className="text-gray-300">TCRO</span>
                  <span className="font-mono font-semibold text-cyan-400">
                    {walletBalances.tcro.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-300">WCRO</span>
                  <span className="font-mono font-semibold text-blue-400">
                    {walletBalances.wcro.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-300">tUSD</span>
                  <span className="font-mono font-semibold text-green-400">
                    {walletBalances.tusd.toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-500 truncate">
                  {walletBalances.wallet_address}
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
                          {trade.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono">
                        {trade.amount > 0 ? `${trade.amount.toFixed(2)} WCRO` : "-"}
                      </td>
                      <td className="py-3 pr-4 font-mono">${trade.price.toFixed(4)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-cyan-500 h-2 rounded-full"
                              style={{ width: `${trade.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-sm">{(trade.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-400">
                        {trade.gas_cost_usd > 0 ? `$${trade.gas_cost_usd.toFixed(3)}` : "-"}
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-400 max-w-xs truncate">
                        {trade.reason}
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
            </div>
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
                      {tradeHistory[0].action.toUpperCase()}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {formatTime(tradeHistory[0].timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-gray-300">{tradeHistory[0].reason}</p>
                  
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-700">
                    <div>
                      <div className="text-gray-500 text-xs">Sentiment</div>
                      <div className="font-semibold">{(tradeHistory[0].sentiment_score * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Confidence</div>
                      <div className="font-semibold">{(tradeHistory[0].confidence * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Gas Cost</div>
                      <div className="font-semibold">${tradeHistory[0].gas_cost_usd.toFixed(3)}</div>
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
                      onClick={() => setAgentStatus((prev) => ({ ...prev, is_running: true }))}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl font-semibold hover:bg-green-500/30 transition-colors"
                    >
                      <Play className="w-5 h-5" />
                      Start Agent
                    </button>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 text-center">
                  Agent status is simulated for demo purposes
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
