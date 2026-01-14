/**
 * CSA Backend Server - Main Entry Point
 * 
 * Integrates:
 * - REST API endpoints for frontend
 * - WebSocket server for real-time AI agent updates
 * - AI agent integration via Python child process
 * 
 * TRADING STRATEGY:
 * - Monitor: Real CRO/USDC market (CoinGecko, exchanges)
 * - Execute: Test trades TCRO ↔ WCRO on Cronos Testnet
 * - Purpose: Practice autonomous trading without real money risk
 */

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Cronos Testnet
const CRONOS_TESTNET_RPC = process.env.CRONOS_TESTNET_RPC || 'https://evm-t3.cronos.org';

// Contract addresses
const SENTINEL_ADDRESS = process.env.SENTINEL_ADDRESS || '0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff';
const MOCK_ROUTER_ADDRESS = process.env.MOCK_ROUTER_ADDRESS || '0x3796754AC5c3b1C866089cd686C84F625CE2e8a6';
const WCRO_ADDRESS = process.env.WCRO_ADDRESS || '0x5C7F8a570d578ED84e63FdFA7b5a2f628d2B4d2A';
const TUSD_ADDRESS = process.env.TUSD_ADDRESS || '0xc21223249CA28397B4B6541dfFaECc539BfF0c59';

// ============================================================================
// WEB3 SETUP
// ============================================================================

const provider = new ethers.JsonRpcProvider(CRONOS_TESTNET_RPC);

// ABIs (minimal - just what we need)
const SENTINEL_ABI = [
  "function getSentinelStatus(address user) external view returns (uint256 remainingLimit, uint256 lastReset, bool emergencyStop)",
  "function emergencyStop() external",
  "function resumeTrading() external"
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const sentinelContract = new ethers.Contract(SENTINEL_ADDRESS, SENTINEL_ABI, provider);
const wcroContract = new ethers.Contract(WCRO_ADDRESS, ERC20_ABI, provider);
const tusdContract = new ethers.Contract(TUSD_ADDRESS, ERC20_ABI, provider);

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

app.use(express.json());

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    network: 'cronos-testnet'
  });
});

// Get agent status
app.get('/api/agent/status', async (req, res) => {
  try {
    const address = req.query.address || process.env.AGENT_ADDRESS;
    
    if (!address) {
      return res.json({
        status: 'idle',
        lastUpdate: new Date().toISOString(),
        currentAction: 'Waiting for wallet connection',
        confidence: 0
      });
    }

    const sentinelStatus = await sentinelContract.getSentinelStatus(address);
    
    res.json({
      status: agentState.status,
      lastUpdate: agentState.lastUpdate,
      currentAction: agentState.currentAction,
      confidence: agentState.confidence,
      sentinelStatus: {
        remainingLimit: ethers.formatEther(sentinelStatus.remainingLimit),
        emergencyStop: sentinelStatus.emergencyStop
      }
    });
  } catch (error) {
    console.error('Error fetching agent status:', error);
    res.status(500).json({ error: 'Failed to fetch agent status' });
  }
});

// Get wallet balances
app.get('/api/wallet/balances', async (req, res) => {
  try {
    const address = req.query.address;
    
    if (!address) {
      return res.status(400).json({ error: 'Address required' });
    }

    // Ensure address is checksummed to avoid ENS resolution
    const checksummedAddress = ethers.getAddress(address);

    const [croBalance, wcroBalance, tusdBalance] = await Promise.all([
      provider.getBalance(checksummedAddress),
      wcroContract.balanceOf(checksummedAddress),
      tusdContract.balanceOf(checksummedAddress)
    ]);

    res.json({
      cro: ethers.formatEther(croBalance),
      wcro: ethers.formatEther(wcroBalance),
      tusd: ethers.formatUnits(tusdBalance, 6) // tUSD has 6 decimals
    });
  } catch (error) {
    console.error('Error fetching balances:', error);
    res.status(500).json({ error: 'Failed to fetch balances' });
  }
});

// Get market data (from AI agent MCP tools)
app.get('/api/market/price', async (req, res) => {
  try {
    // In production, this should call your MCP server's check_cro_price tool
    // For now, returning state data
    res.json({
      price: agentState.marketData.price,
      change24h: agentState.marketData.change24h,
      volume_24h: 0,
      high_24h: 0,
      low_24h: 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching market price:', error);
    res.status(500).json({ error: 'Failed to fetch market price' });
  }
});

// Get pool status
app.get('/api/market/pool', async (req, res) => {
  try {
    res.json({
      wcro_balance: agentState.poolData?.wcro_balance || 102.0,
      tusd_balance: agentState.poolData?.tusd_balance || 78.44,
      price: agentState.poolData?.price || 0.769,
      tvl_usd: agentState.poolData?.tvl_usd || 180.44,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching pool status:', error);
    res.status(500).json({ error: 'Failed to fetch pool status' });
  }
});

// Get sentiment analysis
app.get('/api/market/sentiment', async (req, res) => {
  try {
    res.json({
      signal: agentState.sentiment.signal,
      score: agentState.sentiment.score,
      sources: agentState.sentiment.sources,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching sentiment:', error);
    res.status(500).json({ error: 'Failed to fetch sentiment' });
  }
});

// Get trade history
app.get('/api/trades/history', async (req, res) => {
  try {
    res.json({
      trades: agentState.tradeHistory,
      total: agentState.tradeHistory.length
    });
  } catch (error) {
    console.error('Error fetching trade history:', error);
    res.status(500).json({ error: 'Failed to fetch trade history' });
  }
});

// Get pending approvals
app.get('/api/trades/pending', async (req, res) => {
  try {
    res.json({
      approvals: agentState.pendingApprovals
    });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

// Get agent decisions
app.get('/api/agent/decisions', async (req, res) => {
  try {
    res.json({
      decisions: agentState.decisions
    });
  } catch (error) {
    console.error('Error fetching agent decisions:', error);
    res.status(500).json({ error: 'Failed to fetch agent decisions' });
  }
});

// Start agent
app.post('/api/agent/start', async (req, res) => {
  try {
    if (agentState.isRunning) {
      return res.json({ 
        success: false, 
        message: 'Agent is already running' 
      });
    }

    console.log('🚀 Starting AI agent...');
    
    // Update state
    agentState.isRunning = true;
    agentState.status = 'running';
    agentState.currentAction = 'Agent started - monitoring markets';
    agentState.lastUpdate = new Date().toISOString();
    
    // Broadcast to clients
    broadcastToAll({
      type: 'agent_status',
      data: {
        status: 'running',
        lastUpdate: agentState.lastUpdate,
        currentAction: agentState.currentAction,
        confidence: 0,
        isRunning: true
      }
    });
    
    // Log decision
    addAgentDecision(
      'Agent manually started by user',
      'Ready to monitor and trade',
      'AGENT STARTED',
      'AI agent activated. Will monitor real CRO/USDC market and execute test trades on Cronos Testnet.'
    );
    
    res.json({ 
      success: true, 
      message: 'Agent started successfully',
      status: agentState.status
    });
  } catch (error) {
    console.error('Error starting agent:', error);
    res.status(500).json({ error: 'Failed to start agent' });
  }
});

// Stop agent
app.post('/api/agent/stop', async (req, res) => {
  try {
    if (!agentState.isRunning) {
      return res.json({ 
        success: false, 
        message: 'Agent is already stopped' 
      });
    }

    console.log('🛑 Stopping AI agent...');
    
    // Update state
    agentState.isRunning = false;
    agentState.status = 'stopped';
    agentState.currentAction = 'Agent stopped by user';
    agentState.lastUpdate = new Date().toISOString();
    
    // Broadcast to clients
    broadcastToAll({
      type: 'agent_status',
      data: {
        status: 'stopped',
        lastUpdate: agentState.lastUpdate,
        currentAction: agentState.currentAction,
        confidence: 0,
        isRunning: false
      }
    });
    
    // Log decision
    addAgentDecision(
      'Agent manually stopped by user',
      'No longer monitoring or trading',
      'AGENT STOPPED',
      'AI agent deactivated by user request. All monitoring and trading halted.'
    );
    
    res.json({ 
      success: true, 
      message: 'Agent stopped successfully',
      status: agentState.status
    });
  } catch (error) {
    console.error('Error stopping agent:', error);
    res.status(500).json({ error: 'Failed to stop agent' });
  }
});

// Emergency stop (kept for compatibility)
app.post('/api/agent/emergency-stop', async (req, res) => {
  try {
    console.log('🛑 Emergency stop triggered via API');
    
    // Same as regular stop for now
    agentState.isRunning = false;
    agentState.status = 'stopped';
    agentState.currentAction = 'Emergency stop activated';
    
    // Broadcast to WebSocket clients
    broadcastToAll({
      type: 'agent_status',
      data: {
        status: 'stopped',
        lastUpdate: new Date().toISOString(),
        currentAction: 'Emergency stop activated',
        confidence: 0,
        isRunning: false
      }
    });
    
    // Log the decision
    addAgentDecision(
      'Emergency stop activated',
      'All operations halted',
      'EMERGENCY STOP',
      'Emergency stop triggered by user. All trading and monitoring halted.'
    );
    
    res.json({ 
      success: true, 
      message: 'Emergency stop activated'
    });
  } catch (error) {
    console.error('Error activating emergency stop:', error);
    res.status(500).json({ error: 'Failed to activate emergency stop' });
  }
});

// Execute trade (add to history)
app.post('/api/trades/execute', async (req, res) => {
  try {
    const { txHash, tokenIn, tokenOut, amountIn, amountOut, type, status, timestamp } = req.body;
    
    const trade = {
      id: txHash,
      txHash,
      timestamp: timestamp || new Date().toISOString(),
      type: type || 'BUY',
      tokenIn: tokenIn || 'TCRO',
      tokenOut: tokenOut || 'WCRO',
      amountIn: amountIn || '0',
      amountOut: amountOut || '0',
      status: status || 'completed',
      gasFee: '0.001'
    };
    
    console.log(`📝 Trade executed: ${type} ${amountIn} ${tokenIn} → ${tokenOut}`);
    
    // Add to trade history and broadcast
    broadcastTradeEvent(trade);
    
    res.json({ success: true, trade });
  } catch (error) {
    console.error('Error recording trade:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve trade
app.post('/api/trades/approve', async (req, res) => {
  try {
    const { tradeId, approved } = req.body;
    
    console.log(`Trade ${tradeId} ${approved ? 'approved' : 'rejected'}`);
    
    // Remove from pending approvals
    agentState.pendingApprovals = agentState.pendingApprovals.filter(
      approval => approval.id !== tradeId
    );
    
    // Broadcast to WebSocket clients
    broadcastToAll({
      type: 'trade_approved',
      data: {
        tradeId,
        approved,
        timestamp: new Date().toISOString()
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error approving trade:', error);
    res.status(500).json({ error: 'Failed to approve trade' });
  }
});

// ============================================================================
// AI AGENT DATA INGESTION ENDPOINTS
// ============================================================================

// Receive agent decision from Python AI agent
app.post('/api/agent/decision', async (req, res) => {
  try {
    const { market_data, sentinel_status, decision, reason, timestamp } = req.body;
    
    addAgentDecision(market_data, sentinel_status, decision, reason);
    
    res.json({ success: true, message: 'Decision received' });
  } catch (error) {
    console.error('Error receiving agent decision:', error);
    res.status(500).json({ error: 'Failed to receive decision' });
  }
});

// Receive sentiment update from Python AI agent
app.post('/api/market/sentiment/update', async (req, res) => {
  try {
    const { signal, score, sources, is_trending } = req.body;
    
    // Update agent state
    broadcastSentimentUpdate({
      signal,
      score: parseFloat(score),
      sources: sources || [],
      is_trending: is_trending || false,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, message: 'Sentiment updated' });
  } catch (error) {
    console.error('Error updating sentiment:', error);
    res.status(500).json({ error: 'Failed to update sentiment' });
  }
});

// Receive agent status update from Python AI agent
app.post('/api/agent/status/update', async (req, res) => {
  try {
    const { status, action, confidence } = req.body;
    
    broadcastAgentStatus(status, action, parseFloat(confidence) || 0);
    
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Receive price update from Python AI agent
app.post('/api/market/price/update', async (req, res) => {
  try {
    const { price, change_24h } = req.body;
    
    agentState.marketData.price = parseFloat(price);
    agentState.marketData.change24h = parseFloat(change_24h) || 0;
    
    res.json({ success: true, message: 'Price updated' });
  } catch (error) {
    console.error('Error updating price:', error);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

// ============================================================================
// AGENT STATE MANAGEMENT
// ============================================================================

let agentState = {
  status: 'stopped', // stopped, running
  isRunning: false,   // Agent only runs when manually started
  lastUpdate: new Date().toISOString(),
  currentAction: 'Agent stopped - click Start to begin',
  confidence: 0,
  marketData: {
    price: 0,
    change24h: 0
  },
  poolData: {
    wcro_balance: 0,
    tusd_balance: 0,
    price: 0,
    tvl_usd: 0
  },
  sentiment: {
    signal: 'hold',
    score: 0,
    sources: []
  },
  tradeHistory: [],
  pendingApprovals: [],
  decisions: [], // Agent decision log
  agentProcess: null // Store Python agent process
};

// ============================================================================
// WEBSOCKET SERVER
// ============================================================================

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set();

wss.on('connection', (ws) => {
  console.log('✅ WebSocket client connected');
  clients.add(ws);

  // Send current agent state on connection
  ws.send(JSON.stringify({
    type: 'agent_status',
    data: {
      status: agentState.status,
      lastUpdate: agentState.lastUpdate,
      currentAction: agentState.currentAction,
      confidence: agentState.confidence
    }
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebSocketCommand(data, ws);
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('❌ WebSocket client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

function handleWebSocketCommand(data, ws) {
  const { type, action } = data;

  if (type === 'command') {
    if (action === 'emergency_stop') {
      console.log('🛑 Emergency stop received via WebSocket');
      agentState.status = 'stopped';
      agentState.currentAction = 'Emergency stop activated';
      broadcastToAll({
        type: 'agent_status',
        data: {
          status: 'stopped',
          lastUpdate: new Date().toISOString(),
          currentAction: 'Emergency stop activated',
          confidence: 0
        }
      });
    }
  }
}

function broadcastToAll(message) {
  const payload = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  });
}

// Export for AI agent integration
export function broadcastAgentStatus(status, action = '', confidence = 0) {
  agentState.status = status;
  agentState.currentAction = action;
  agentState.confidence = confidence;
  agentState.lastUpdate = new Date().toISOString();

  broadcastToAll({
    type: 'agent_status',
    data: {
      status,
      lastUpdate: agentState.lastUpdate,
      currentAction: action,
      confidence
    }
  });
}

export function broadcastTradeEvent(trade) {
  agentState.tradeHistory.unshift(trade);
  if (agentState.tradeHistory.length > 50) {
    agentState.tradeHistory = agentState.tradeHistory.slice(0, 50);
  }

  broadcastToAll({
    type: 'trade_event',
    data: trade
  });
}

export function broadcastSentimentUpdate(sentiment) {
  agentState.sentiment = sentiment;

  broadcastToAll({
    type: 'sentiment_update',
    data: sentiment
  });
}

export function addAgentDecision(marketData, sentinelStatus, decision, reason) {
  const newDecision = {
    timestamp: new Date().toISOString(),
    market_data: marketData,
    sentinel_status: sentinelStatus,
    decision: decision,
    reason: reason
  };
  
  // Keep only last 20 decisions
  agentState.decisions.unshift(newDecision);
  if (agentState.decisions.length > 20) {
    agentState.decisions = agentState.decisions.slice(0, 20);
  }
  
  console.log(`📝 Agent Decision: ${decision} - ${reason}`);
  
  // Broadcast to connected clients
  broadcastToAll({
    type: 'agent_decision',
    data: newDecision
  });
}

// ============================================================================
// AI AGENT INTEGRATION (Optional)
// ============================================================================

let aiAgentProcess = null;

function startAIAgent() {
  const aiAgentPath = path.join(__dirname, '../../ai-agent/run_autonomous_trader.py');
  
  console.log('🤖 Starting AI Agent...');
  
  aiAgentProcess = spawn('python', [aiAgentPath], {
    cwd: path.join(__dirname, '../../ai-agent')
  });

  aiAgentProcess.stdout.on('data', (data) => {
    console.log(`[AI Agent] ${data}`);
    // Parse agent output and broadcast updates
  });

  aiAgentProcess.stderr.on('data', (data) => {
    console.error(`[AI Agent Error] ${data}`);
  });

  aiAgentProcess.on('close', (code) => {
    console.log(`AI Agent process exited with code ${code}`);
    aiAgentProcess = null;
  });
}

// Uncomment to auto-start AI agent with backend
// startAIAgent();

// ============================================================================
// PERIODIC UPDATES (Agent always monitoring)
// ============================================================================

// Agent always monitors market - update every 30 seconds
setInterval(() => {
  // Randomly update sentiment (in production, this comes from AI agent)
  const signals = ['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell'];
  const randomSignal = signals[Math.floor(Math.random() * signals.length)];
  const sentimentScore = (Math.random() * 2 - 1).toFixed(2);
  
  broadcastSentimentUpdate({
    signal: randomSignal,
    score: parseFloat(sentimentScore),
    sources: ['CoinGecko', 'Price Action'],
    timestamp: new Date().toISOString()
  });

  // Update market price
  const newPrice = (0.0994 + (Math.random() * 0.01 - 0.005)).toFixed(4);
  const priceChange = (Math.random() * 10 - 5).toFixed(2);
  agentState.marketData.price = parseFloat(newPrice);
  agentState.marketData.change24h = parseFloat(priceChange);
  
  // Update agent status
  if (agentState.isTradingEnabled) {
    agentState.status = randomSignal === 'strong_buy' || randomSignal === 'strong_sell' ? 'analyzing' : 'monitoring';
    agentState.currentAction = `Monitoring markets - ${randomSignal.replace('_', ' ').toUpperCase()}`;
  } else {
    agentState.status = 'monitoring';
    agentState.currentAction = 'Trading halted - monitoring only';
  }
  
  broadcastAgentStatus(
    agentState.status,
    agentState.currentAction,
    Math.abs(parseFloat(sentimentScore))
  );
}, 30000);

// ============================================================================
// START SERVER
// ============================================================================

server.listen(PORT, () => {
  console.log('🚀 CSA Backend Server Started!');
  console.log('━'.repeat(60));
  console.log(`📡 REST API:     http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket:    ws://localhost:${PORT}/ws`);
  console.log(`🌐 Frontend:     ${FRONTEND_URL}`);
  console.log(`⛓️  Network:      Cronos Testnet`);
  console.log(`📝 Sentinel:     ${SENTINEL_ADDRESS}`);
  console.log('━'.repeat(60));
  console.log('');
  console.log('💡 Endpoints:');
  console.log('   GET  /api/health');
  console.log('   GET  /api/agent/status');
  console.log('   GET  /api/agent/decisions');
  console.log('   GET  /api/wallet/balances?address=0x...');
  console.log('   GET  /api/market/price');
  console.log('   GET  /api/market/pool');
  console.log('   GET  /api/market/sentiment');
  console.log('   GET  /api/trades/history');
  console.log('   GET  /api/trades/pending');
  console.log('   POST /api/agent/emergency-stop');
  console.log('   POST /api/trades/approve');
  console.log('');
  console.log('🤖 Agent Status:');
  console.log('   Monitoring: Always Active');
  console.log('   Trading: Enabled (use emergency stop to disable)');
  console.log('');
  console.log('💡 To start AI agent manually:');
  console.log('   cd ../ai-agent && python run_autonomous_trader.py');
  console.log('');
  
  // Add initial decision log
  addAgentDecision(
    `CRO/USD price: $${agentState.marketData.price}, Change: ${agentState.marketData.change24h > 0 ? '+' : ''}${agentState.marketData.change24h}%`,
    'Monitoring active, trading enabled',
    'MONITORING',
    'Agent initialized and monitoring markets in real-time. Ready to execute trades when favorable conditions are detected.'
  );
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down backend server...');
  
  if (aiAgentProcess) {
    aiAgentProcess.kill();
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
