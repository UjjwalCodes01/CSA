// API service to connect to Sentinel Alpha backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface MarketIntelligence {
  signal: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  sentiment: number;
  strength: number;
  sources: number;
  timestamp: string;
}

export interface CROPrice {
  price: number;
  change_24h: number;
  volume_24h: number;
  high_24h: number;
  low_24h: number;
}

export interface PoolStatus {
  wcro_balance: number;
  tusd_balance: number;
  price: number;
  tvl_usd: number;
}

export interface WalletBalances {
  tcro: number;
  wcro: number;
  tusd: number;
  wallet_address: string;
}

export interface SentinelStatus {
  daily_limit: number;
  spent_today: number;
  remaining: number;
  can_trade: boolean;
}

export interface TradeDecision {
  id: string;
  timestamp: string;
  action: 'buy' | 'sell' | 'hold';
  amount: number;
  price: number;
  sentiment_score: number;
  confidence: number;
  gas_cost_usd: number;
  tx_hash?: string;
  reason: string;
}

export interface AgentStatus {
  is_running: boolean;
  last_cycle: string;
  total_cycles: number;
  next_cycle_in: number;
}

// Mock data for development (replace with real API calls)
export const mockData = {
  marketIntelligence: {
    signal: 'strong_buy' as const,
    sentiment: 0.68,
    strength: 3,
    sources: 4,
    timestamp: new Date().toISOString(),
  },
  croPrice: {
    price: 0.0994,
    change_24h: 2.34,
    volume_24h: 15234567,
    high_24h: 0.1012,
    low_24h: 0.0978,
  },
  poolStatus: {
    wcro_balance: 102.0,
    tusd_balance: 78.44,
    price: 0.769,
    tvl_usd: 180.44,
  },
  walletBalances: {
    tcro: 69.2233,
    wcro: 0.5,
    tusd: 10.0,
    wallet_address: '0xa22Db5E0...6FAABE94',
  },
  sentinelStatus: {
    daily_limit: 1.0,
    spent_today: 0.0,
    remaining: 1.0,
    can_trade: true,
  },
  agentStatus: {
    is_running: true,
    last_cycle: new Date().toISOString(),
    total_cycles: 12,
    next_cycle_in: 847,
  },
  tradeHistory: [
    {
      id: '1',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      action: 'sell' as const,
      amount: 0.5,
      price: 0.769,
      sentiment_score: 0.68,
      confidence: 0.85,
      gas_cost_usd: 0.02,
      tx_hash: '0x1234...5678',
      reason: 'Strong buy signal with 3/4 source confirmation',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      action: 'hold' as const,
      amount: 0,
      price: 0.765,
      sentiment_score: 0.52,
      confidence: 0.65,
      gas_cost_usd: 0,
      reason: 'Weak signal, waiting for stronger confirmation',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 2700000).toISOString(),
      action: 'sell' as const,
      amount: 0.3,
      price: 0.772,
      sentiment_score: 0.71,
      confidence: 0.88,
      gas_cost_usd: 0.018,
      tx_hash: '0xabcd...efgh',
      reason: 'Strong buy with high confidence',
    },
  ],
  sentimentHistory: Array.from({ length: 24 }, (_, i) => ({
    hour: `${23 - i}:00`,
    sentiment: 0.4 + Math.random() * 0.4,
    price: 0.095 + Math.random() * 0.01,
  })).reverse(),
};

// API Functions (use mock data for now, replace with real API calls)
export async function getMarketIntelligence(): Promise<MarketIntelligence> {
  try {
    const res = await fetch(`${API_BASE}/api/market-intelligence`);
    if (!res.ok) throw new Error('API error');
    return res.json();
  } catch {
    return mockData.marketIntelligence;
  }
}

export async function getCROPrice(): Promise<CROPrice> {
  try {
    const res = await fetch(`${API_BASE}/api/cro-price`);
    if (!res.ok) throw new Error('API error');
    return res.json();
  } catch {
    return mockData.croPrice;
  }
}

export async function getPoolStatus(): Promise<PoolStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/pool-status`);
    if (!res.ok) throw new Error('API error');
    return res.json();
  } catch {
    return mockData.poolStatus;
  }
}

export async function getWalletBalances(): Promise<WalletBalances> {
  try {
    const res = await fetch(`${API_BASE}/api/wallet-balances`);
    if (!res.ok) throw new Error('API error');
    return res.json();
  } catch {
    return mockData.walletBalances;
  }
}

export async function getSentinelStatus(): Promise<SentinelStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/sentinel-status`);
    if (!res.ok) throw new Error('API error');
    return res.json();
  } catch {
    return mockData.sentinelStatus;
  }
}

export async function getAgentStatus(): Promise<AgentStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/agent-status`);
    if (!res.ok) throw new Error('API error');
    return res.json();
  } catch {
    return mockData.agentStatus;
  }
}

export async function getTradeHistory(): Promise<TradeDecision[]> {
  try {
    const res = await fetch(`${API_BASE}/api/trade-history`);
    if (!res.ok) throw new Error('API error');
    return res.json();
  } catch {
    return mockData.tradeHistory;
  }
}

export async function getSentimentHistory(): Promise<{ hour: string; sentiment: number; price: number }[]> {
  try {
    const res = await fetch(`${API_BASE}/api/sentiment-history`);
    if (!res.ok) throw new Error('API error');
    return res.json();
  } catch {
    return mockData.sentimentHistory;
  }
}

export async function emergencyStop(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/emergency-stop`, { method: 'POST' });
    if (!res.ok) throw new Error('API error');
    return res.json();
  } catch {
    return { success: true, message: 'Agent stopped (mock)' };
  }
}
