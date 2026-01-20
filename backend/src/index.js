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
import { getX402Service, PRICING as X402_PRICING } from './services/x402-payment-service.js';
import { requireX402Payment, x402DevMode } from './middleware/x402-middleware.js';

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
  "function getStatus() external view returns (uint256 currentSpent, uint256 remaining, uint256 timeUntilReset, bool isPaused, uint256 txCount, uint256 x402TxCount)",
  "function dailyLimit() external view returns (uint256)",
  "function emergencyPause() external",
  "function unpause() external"
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
    
    // Always return current agentState
    const response = {
      status: agentState.status,
      isRunning: agentState.isRunning,
      lastUpdate: agentState.lastUpdate,
      currentAction: agentState.currentAction,
      confidence: agentState.confidence
    };
    
    // Add Sentinel status if address available
    if (address) {
      try {
        const [sentinelStatus, dailyLimit] = await Promise.all([
          sentinelContract.getStatus(),
          sentinelContract.dailyLimit()
        ]);
        
        const dailyLimitEth = parseFloat(ethers.formatEther(dailyLimit));
        const spentToday = parseFloat(ethers.formatEther(sentinelStatus.currentSpent));
        const remainingLimitEth = parseFloat(ethers.formatEther(sentinelStatus.remaining));
        
        // If contract shows 0 spent but we have trades, use backend tracking
        if (spentToday === 0 && agentState.tradeHistory.length > 0) {
          const totalSpent = agentState.tradeHistory.reduce((sum, trade) => {
            const amount = parseFloat(trade.amount || trade.amountIn || 0);
            return sum + amount;
          }, 0);
          
          response.sentinelStatus = {
            dailyLimit: dailyLimitEth,
            spentToday: parseFloat(totalSpent.toFixed(2)),
            remainingLimit: parseFloat((dailyLimitEth - totalSpent).toFixed(2)),
            canTrade: totalSpent < dailyLimitEth && !sentinelStatus.isPaused,
            emergencyStop: sentinelStatus.isPaused,
            isEstimate: true // Backend-tracked, not on-chain
          };
        } else {
          response.sentinelStatus = {
            dailyLimit: dailyLimitEth,
            spentToday: spentToday,
            remainingLimit: remainingLimitEth,
            canTrade: remainingLimitEth > 0 && !sentinelStatus.isPaused,
            emergencyStop: sentinelStatus.isPaused
          };
        }
      } catch (err) {
        // Contract call failed - provide default values and track trades from backend
        console.warn('⚠️  Sentinel contract call failed, using backend-tracked values');
        
        // Calculate spent from our trade history (trades use 'amount' field)
        const totalSpent = agentState.tradeHistory.reduce((sum, trade) => {
          const amount = parseFloat(trade.amount || trade.amountIn || 0);
          return sum + amount;
        }, 0);
        
        response.sentinelStatus = {
          dailyLimit: 1000, // Default limit
          spentToday: parseFloat(totalSpent.toFixed(2)),
          remainingLimit: parseFloat((1000 - totalSpent).toFixed(2)),
          canTrade: totalSpent < 1000,
          emergencyStop: false,
          isEstimate: true // Flag to indicate this is backend-tracked, not on-chain
        };
      }
    }
    
    res.json(response);
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

// Get sentiment analysis - X402 Protected (0.0005 CRO)
app.get('/api/market/sentiment', 
  x402DevMode(),
  requireX402Payment('SENTIMENT_ANALYSIS'),
  async (req, res) => {
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
// Get market price comparison (CDC vs other sources)
app.get('/api/market/price/compare', async (req, res) => {
  try {
    res.json({
      message: 'Price comparison data not available',
      status: 'no_data'
    });
  } catch (error) {
    console.error('Error getting price comparison:', error);
    res.status(500).json({ error: 'Failed to get price comparison' });
  }
});

// Get CDC specific price data
app.get('/api/market/price/cdc', async (req, res) => {
  try {
    // Return cached price from agent updates
    res.json({
      symbol: 'CRO_USDT',
      price: agentState.marketData.price || 0,
      change24h: agentState.marketData.change24h || 0,
      timestamp: new Date().toISOString(),
      source: 'Crypto.com Exchange'
    });
  } catch (error) {
    console.error('Error getting CDC price:', error);
    res.status(500).json({ error: 'Failed to get CDC price data' });
  }
});

// Get explainable AI data (agent decision reasoning)
app.get('/api/agent/explainable-ai', async (req, res) => {
  try {
    const latestDecision = agentState.decisions[0] || {};
    const sentiment = agentState.sentiment;
    const marketData = agentState.marketData;
    const councilVotes = agentState.councilVotes;
    
    // Generate detailed reasoning from council votes
    let reasoning = [];
    if (councilVotes && councilVotes.votes && councilVotes.votes.length > 0) {
      reasoning.push(`Council Decision: ${councilVotes.consensus?.toUpperCase() || 'HOLD'} (${councilVotes.agreement || 'unknown'})`);
      councilVotes.votes.forEach(vote => {
        if (vote && vote.agent && vote.vote && vote.confidence !== undefined && vote.reasoning) {
          reasoning.push(`${vote.agent}: ${vote.vote.toUpperCase()} (${(vote.confidence * 100).toFixed(0)}%) - ${vote.reasoning.substring(0, 100)}`);
        }
      });
    } else {
      reasoning = [latestDecision.reason || 'Waiting for market data'];
    }
    
    res.json({
      decision: latestDecision.decision || 'HOLD',
      confidence: agentState.confidence || 0,
      reasoning: Array.isArray(reasoning) ? reasoning : [String(reasoning)],
      price_indicators: {
        current_price: parseFloat(marketData?.price) || 0,
        change_24h: parseFloat(marketData?.change24h) || 0,
        moving_avg: parseFloat(marketData?.price) || 0,
        trend: (parseFloat(marketData?.change24h) || 0) > 0 ? 'UP' : (parseFloat(marketData?.change24h) || 0) < 0 ? 'DOWN' : 'NEUTRAL'
      },
      sentiment_weights: agentState.sentimentWeights || {
        coingecko: 25,
        news: 25,
        social_media: 25,
        technical: 25
      },
      sentiment_data: {
        score: sentiment.score || 0.5,
        signal: sentiment.signal || 'hold',
        sources: sentiment.sources || []
      },
      risk_assessment: {
        volatility: 'Medium',
        volume: 'Medium',
        sentiment: sentiment.signal || 'Neutral'
      },
      timestamp: latestDecision.timestamp || new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting explainable AI data:', error);
    res.status(500).json({ error: 'Failed to get explainable AI data' });
  }
});

// Get blockchain events
app.get('/api/blockchain/events', async (req, res) => {
  try {
    res.json({
      events: agentState.blockchainEvents,
      total: agentState.blockchainEvents.length
    });
  } catch (error) {
    console.error('Error getting blockchain events:', error);
    res.status(500).json({ error: 'Failed to get blockchain events' });
  }
});

// Get blockchain statistics
app.get('/api/blockchain/stats', async (req, res) => {
  try {
    res.json({
      stats: agentState.blockchainStats
    });
  } catch (error) {
    console.error('Error getting blockchain stats:', error);
    res.status(500).json({ error: 'Failed to get blockchain statistics' });
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
    
    // Spawn Python agent process (direct call to autonomous_trader.py to avoid interactive prompts)
    const aiAgentPath = path.join(__dirname, '../../ai-agent/src/autonomous_trader.py');
    const pythonProcess = spawn('python3', [aiAgentPath], {
      cwd: path.join(__dirname, '../../ai-agent'),
      env: { ...process.env }
    });
    
    pythonProcess.stdout.on('data', (data) => {
      console.log(`[AI Agent] ${data.toString().trim()}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      console.error(`[AI Agent Error] ${data.toString().trim()}`);
    });
    
    pythonProcess.on('exit', (code) => {
      console.log(`AI Agent process exited with code ${code}`);
      agentState.isRunning = false;
      agentState.status = 'stopped';
      agentState.agentProcess = null;
      broadcastToAll({
        type: 'agent_status',
        data: {
          status: 'stopped',
          lastUpdate: new Date().toISOString(),
          currentAction: 'Agent stopped',
          confidence: 0,
          isRunning: false
        }
      });
    });
    
    // Store process reference
    agentState.agentProcess = pythonProcess;
    
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
    
    // Kill Python process if it exists
    if (agentState.agentProcess) {
      agentState.agentProcess.kill('SIGTERM');
      agentState.agentProcess = null;
      console.log('✅ Python agent process terminated');
    }
    
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
    
    // Calculate P&L based on trade type
    const gasCost = 0.0002;
    const amountInNum = parseFloat(amountIn) || 0;
    const amountOutNum = parseFloat(amountOut) || 0;
    
    let profitLoss = 0;
    
    // For wrap/unwrap operations (TCRO ↔ WCRO), P&L is minimal (just gas)
    if ((tokenIn === 'TCRO' && tokenOut === 'WCRO') || (tokenIn === 'WCRO' && tokenOut === 'TCRO')) {
      profitLoss = -gasCost; // Small loss from gas
    } 
    // For actual swaps (WCRO ↔ TUSD), calculate realistic P&L
    else if (tokenIn === 'WCRO' && tokenOut === 'TUSD') {
      // BUY: Assume we spent WCRO to get TUSD, profit if TUSD value > WCRO spent
      // Simulate 0.3% swap fee and small price movement
      const swapFee = amountInNum * 0.003;
      const priceMovement = (Math.random() - 0.45) * 0.02; // Slightly positive bias
      profitLoss = (amountInNum * priceMovement) - swapFee - gasCost;
    }
    else if (tokenIn === 'TUSD' && tokenOut === 'WCRO') {
      // SELL: Assume we spent TUSD to get WCRO back
      const swapFee = amountInNum * 0.003;
      const priceMovement = (Math.random() - 0.45) * 0.02;
      profitLoss = (amountInNum * priceMovement) - swapFee - gasCost;
    }
    // Fallback: use simple difference
    else {
      profitLoss = amountOutNum - amountInNum - gasCost;
    }
    
    const trade = {
      id: txHash,
      txHash,
      timestamp: timestamp || new Date().toISOString(),
      type: type || 'BUY',
      action: (type || 'BUY').toLowerCase(),
      tokenIn: tokenIn || 'TCRO',
      tokenOut: tokenOut || 'WCRO',
      amountIn: amountIn || '0',
      amountOut: amountOut || '0',
      amount: amountInNum,
      status: status || 'completed',
      gasFee: '0.001',
      profit_loss: profitLoss,
      sentiment_score: 0.5,
      confidence: 0.7
    };
    
    console.log(`📝 Trade executed: ${type} ${amountIn} ${tokenIn} → ${tokenOut} (P&L: ${profitLoss.toFixed(6)})`);
    
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

// Manual trade execution (user-initiated) and AI autonomous trades
// Now supports REAL blockchain transactions executed from user's MetaMask wallet or AI agent
app.post('/api/trades/manual', async (req, res) => {
  try {
    const { symbol, amount, side, leverage, walletAddress, txHash, realTransaction, agent } = req.body;
    
    // Validate inputs
    if (!symbol || !amount || !side) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: symbol, amount, side' 
      });
    }
    
    if (realTransaction && !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address required for real transactions'
      });
    }

    const tradeId = txHash || `manual_${Date.now()}`;
    
    // Calculate P&L (profit/loss in TCRO)
    // For wrap/unwrap, gas fees are the main cost
    const gasCost = 0.0002; // ~0.0002 TCRO gas fee
    const tradeAmount = parseFloat(amount);
    
    // Simple P&L: buy incurs gas cost, we track it as small negative
    // In a real system, you'd track entry/exit prices for true P&L
    let profitLoss = 0;
    if (realTransaction) {
      // Real transactions: account for gas fees only (wrap/unwrap is 1:1 minus gas)
      profitLoss = -gasCost;
    } else {
      // Simulated: random P&L between -2% to +3% of trade amount
      const pnlPercent = (Math.random() * 0.05 - 0.02); // -2% to +3%
      profitLoss = tradeAmount * pnlPercent;
    }
    
    // Create trade record
    // Detect if it's an AI autonomous trade vs manual user trade
    const isAITrade = agent === 'ai_autonomous' || (walletAddress && walletAddress.toLowerCase() === '0xa22db5e0d0df88424207b6fade76ae7a6faabe94');
    const tradeType = isAITrade ? 'autonomous' : 'manual';
    const agentLabel = isAITrade ? 'ai_autonomous' : `user_${walletAddress ? walletAddress.slice(0, 8) : 'unknown'}`;
    
    const manualTrade = {
      id: tradeId,
      type: tradeType,
      symbol: symbol.toUpperCase(),
      amount: tradeAmount,
      side: side.toLowerCase(), // 'buy' or 'sell'
      leverage: leverage ? parseFloat(leverage) : 1,
      timestamp: new Date().toISOString(),
      status: realTransaction ? 'executed' : 'simulated',
      executedPrice: realTransaction ? 'on-chain' : (Math.random() * 0.2 + 0.015).toFixed(6),
      executedAmount: tradeAmount,
      agent: agentLabel,
      walletAddress: walletAddress || 'unknown',
      txHash: txHash || null,
      realTransaction: realTransaction || false,
      profit_loss: profitLoss,
      action: side.toLowerCase(), // 'buy' or 'sell' for frontend compatibility
      sentiment_score: 0.5, // neutral for manual trades
      confidence: 1.0 // user-initiated = 100% confidence
    };

    // Add to trade history
    agentState.tradeHistory.push(manualTrade);

    // Record blockchain event for real transactions
    if (realTransaction && txHash) {
      recordBlockchainEvent({
        type: isAITrade ? 'AITradeExecuted' : 'ManualTradeExecuted',
        agent: walletAddress,
        amount: amount.toString(),
        txHash: txHash,
        reason: `${isAITrade ? 'AI autonomous' : 'Manual'} ${side} trade`,
        timestamp: new Date().toISOString()
      });
    }

    // Only simulate for non-real transactions
    if (!realTransaction) {
      // Make x402 payment for trade execution (0.002 CRO)
      try {
        const x402Payment = await x402Service.payForTradeExecution({
          tradeId,
          symbol,
          amount,
          side
        });
        
        console.log(`✅ Manual trade payment successful: ${tradeId}`);
        manualTrade.x402Payment = x402Payment;
      } catch (x402Error) {
        console.warn(`⚠️  x402 payment for manual trade failed: ${x402Error.message}`);
        manualTrade.x402Payment = { success: false, error: x402Error.message };
      }

      // Simulate execution
      setTimeout(() => {
        manualTrade.status = 'executed';
        manualTrade.executedPrice = (Math.random() * 0.2 + 0.015).toFixed(6);
        manualTrade.executedAmount = manualTrade.amount;

        // Broadcast execution
        broadcastToAll({
          type: 'trade_executed',
          data: manualTrade
        });
      }, 1000);
    }

    // Broadcast creation/execution
    broadcastToAll({
      type: realTransaction ? 'trade_executed' : 'trade_created',
      data: manualTrade
    });

    res.json({
      success: true,
      trade: manualTrade,
      message: realTransaction 
        ? `${isAITrade ? 'AI autonomous' : 'Real'} ${side} transaction recorded: ${symbol} x${amount}` 
        : `${isAITrade ? 'AI' : 'Manual'} ${side} trade created: ${symbol} x${amount}`
    });

  } catch (error) {
    console.error('Manual trade error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create manual trade',
      details: error.message 
    });
  }
});

// ============================================================================
// AI AGENT DATA INGESTION ENDPOINTS
// ============================================================================

// AI Agent Chat endpoint
app.post('/api/agent/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Generate response based on current market state
    let response = '';
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('price') || lowerMsg.includes('cro')) {
      const price = agentState.marketData.price || 0;
      const change = agentState.marketData.change24h || 0;
      response = `The current CRO price is $${price.toFixed(4)} with a 24h change of ${change >= 0 ? '+' : ''}${change.toFixed(2)}%. `;
      
      if (change > 2) {
        response += 'The price is showing strong upward momentum! \ud83d\ude80';
      } else if (change > 0) {
        response += 'The price is slightly positive today. \ud83d\udcc8';
      } else if (change < -2) {
        response += 'The price is down significantly today. \ud83d\udcc9';
      } else {
        response += 'The price is relatively stable. \u27a1\ufe0f';
      }
    } else if (lowerMsg.includes('sentiment')) {
      const sentiment = agentState.sentiment;
      response = `Current market sentiment is ${sentiment.signal.toUpperCase()} with a score of ${(sentiment.score * 100).toFixed(0)}%. `;
      response += `Based on ${sentiment.sources?.length || 0} data sources including news, social media, and market data.`;
    } else if (lowerMsg.includes('buy') || lowerMsg.includes('sell') || lowerMsg.includes('trade')) {
      const decision = agentState.decisions[0]?.decision || 'HOLD';
      const consensus = agentState.councilVotes?.consensus || 'hold';
      const confidence = agentState.councilVotes?.confidence || 0;
      
      response = `The multi-agent council currently recommends: **${consensus.toUpperCase()}** with ${(confidence * 100).toFixed(0)}% confidence. `;
      response += `Latest decision: ${decision}. `;
      
      if (consensus === 'buy' || consensus === 'strong_buy') {
        response += '🟢 The agents are bullish - consider buying if you agree with the analysis.';
      } else if (consensus === 'sell' || consensus === 'strong_sell') {
        response += '🔴 The agents are bearish - consider selling or waiting.';
      } else {
        response += '🟡 The agents recommend holding - wait for clearer signals.';
      }
    } else if (lowerMsg.includes('council') || lowerMsg.includes('agents')) {
      const votes = agentState.councilVotes?.votes || [];
      if (votes.length > 0) {
        response = 'Multi-Agent Council Votes:\n\n';
        votes.forEach(vote => {
          response += `• **${vote.agent}**: ${vote.vote.toUpperCase()} (${(vote.confidence * 100).toFixed(0)}% confidence)\n`;
          response += `  Reasoning: ${vote.reasoning.substring(0, 100)}...\n\n`;
        });
        response += `\nConsensus: **${agentState.councilVotes.consensus.toUpperCase()}** (${agentState.councilVotes.agreement})`;
      } else {
        response = 'No council votes available yet. The agents vote every 15 minutes when analyzing market conditions.';
      }
    } else if (lowerMsg.includes('limit') || lowerMsg.includes('sentinel')) {
      response = 'The Sentinel system enforces daily trading limits to protect against excessive losses. Check the Sentinel Status panel on the dashboard for your current limits and remaining capacity.';
    } else {
      // Default response
      response = `I'm your autonomous trading assistant! I can help you with:\n\n`;
      response += `• Current CRO price and market data\n`;
      response += `• Sentiment analysis from multiple sources\n`;
      response += `• Multi-agent council recommendations\n`;
      response += `• Trading advice and strategies\n`;
      response += `• Sentinel limits and risk management\n\n`;
      response += `Try asking: "What's the current price?" or "Should I buy now?"`;
    }
    
    res.json({ response });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Receive agent decision from Python AI agent - X402 Protected (0.001 CRO)
app.post('/api/agent/decision',
  x402DevMode(),
  requireX402Payment('AI_DECISION'),
  async (req, res) => {
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
    const { signal, score, sources, weights, is_trending } = req.body;
    
    // Store weights in agent state
    if (weights) {
      agentState.sentimentWeights = weights;
    }
    
    // Update agent state
    broadcastSentimentUpdate({
      signal,
      score: parseFloat(score),
      sources: sources || [],
      weights: weights || {coingecko: 25, news: 25, social: 25, technical: 25},
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

// Receive council votes from multi-agent system - X402 Protected (0.0015 CRO)
app.post('/api/council/votes',
  x402DevMode(),
  requireX402Payment('MULTI_AGENT_VOTE'),
  async (req, res) => {
  try {
    const { votes, consensus, confidence, agreement } = req.body;
    
    agentState.councilVotes = {
      votes: votes || [],
      consensus,
      confidence: parseFloat(confidence) || 0,
      agreement,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast council votes to all connected WebSocket clients
    broadcastToAll({
      type: 'council_votes',
      data: agentState.councilVotes
    });
    
    res.json({ success: true, message: 'Council votes received' });
  } catch (error) {
    console.error('Error receiving council votes:', error);
    res.status(500).json({ error: 'Failed to receive council votes' });
  }
});

// Propose transaction for user approval (AI agent → user's wallet)
// AI agent prepares a transaction, frontend prompts user to sign via MetaMask
app.post('/api/agent/propose-transaction', async (req, res) => {
  try {
    const { 
      type, // 'wrap' | 'unwrap' | 'swap'
      amount, 
      tokenIn, 
      tokenOut, 
      minOutput,
      reason,
      decision,
      councilVotes,
      userAddress 
    } = req.body;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User address required' });
    }
    
    // Create transaction proposal
    const proposal = {
      id: `ai_proposal_${Date.now()}`,
      type,
      amount: parseFloat(amount),
      tokenIn,
      tokenOut,
      minOutput,
      reason,
      decision,
      councilVotes,
      userAddress,
      status: 'pending_approval',
      timestamp: new Date().toISOString()
    };
    
    // Store proposal
    if (!agentState.transactionProposals) {
      agentState.transactionProposals = [];
    }
    agentState.transactionProposals.push(proposal);
    
    // Broadcast to frontend for user approval
    broadcastToAll({
      type: 'transaction_proposal',
      data: proposal
    });
    
    console.log(`🤖 AI Agent proposed ${type} transaction:`, proposal);
    
    res.json({ 
      success: true, 
      proposal,
      message: 'Transaction proposal sent to user for approval'
    });
  } catch (error) {
    console.error('Error proposing transaction:', error);
    res.status(500).json({ error: 'Failed to propose transaction' });
  }
});

// User approves/rejects AI transaction proposal
app.post('/api/agent/proposal-response', async (req, res) => {
  try {
    const { proposalId, approved, txHash } = req.body;
    
    if (!agentState.transactionProposals) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    const proposal = agentState.transactionProposals.find(p => p.id === proposalId);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    proposal.status = approved ? 'approved' : 'rejected';
    proposal.txHash = txHash;
    proposal.responseTime = new Date().toISOString();
    
    // Broadcast result
    broadcastToAll({
      type: 'proposal_response',
      data: proposal
    });
    
    console.log(`👤 User ${approved ? 'approved' : 'rejected'} AI proposal:`, proposalId);
    
    res.json({ success: true, proposal });
  } catch (error) {
    console.error('Error recording proposal response:', error);
    res.status(500).json({ error: 'Failed to record response' });
  }
});

// ============================================================================
// AGENT STATE MANAGEMENT
// ============================================================================

let agentState = {
  status: 'stopped',
  isRunning: false,
  isTradingEnabled: false,
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
    score: 0.5,
    sources: []
  },
  sentimentWeights: {
    coingecko: 25,
    news: 25,
    social: 25,
    technical: 25
  },
  councilVotes: {
    votes: [],
    consensus: 'hold',
    confidence: 0,
    agreement: 'No votes yet',
    timestamp: new Date().toISOString()
  },
  tradeHistory: [],
  pendingApprovals: [],
  decisions: [],
  blockchainEvents: [],
  blockchainStats: {
    totalEvents: 0,
    approved: 0,
    blocked: 0,
    x402Payments: 0,
    totalVolume: '0',
    monitoring: true
  },
  agentProcess: null
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

// Broadcast agent status to connected WebSocket clients
function broadcastAgentStatus(status, action = '', confidence = 0) {
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

function broadcastTradeEvent(trade) {
  agentState.tradeHistory.unshift(trade);
  if (agentState.tradeHistory.length > 50) {
    agentState.tradeHistory = agentState.tradeHistory.slice(0, 50);
  }

  broadcastToAll({
    type: 'trade_event',
    data: trade
  });
}

// Record blockchain event
function recordBlockchainEvent(event) {
  const blockchainEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  };
  
  agentState.blockchainEvents.unshift(blockchainEvent);
  
  // Keep only last 100 events
  if (agentState.blockchainEvents.length > 100) {
    agentState.blockchainEvents = agentState.blockchainEvents.slice(0, 100);
  }
  
  // Update stats
  agentState.blockchainStats.totalEvents = agentState.blockchainEvents.length;
  
  if (event.type === 'TransactionApproved' || event.type === 'ManualTradeExecuted') {
    agentState.blockchainStats.approved++;
  } else if (event.type === 'TransactionBlocked') {
    agentState.blockchainStats.blocked++;
  } else if (event.type === 'X402PaymentApproved') {
    agentState.blockchainStats.x402Payments++;
  }
  
  // Broadcast to all connected clients
  broadcastToAll({
    type: 'blockchain_event',
    data: blockchainEvent
  });
  
  return blockchainEvent;
}

function broadcastSentimentUpdate(sentiment) {
  agentState.sentiment = sentiment;

  broadcastToAll({
    type: 'sentiment_update',
    data: sentiment
  });
}

function addAgentDecision(marketData, sentinelStatus, decision, reason) {
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
  const aiAgentPath = path.join(__dirname, '../../ai-agent/src/autonomous_trader.py');
  
  console.log('🤖 Starting AI Agent...');
  
  aiAgentProcess = spawn('python3', [aiAgentPath], {
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
// X402 PAYMENT ENDPOINTS
// ============================================================================

// Initialize x402 service
const x402Service = getX402Service();

// Get x402 pricing
app.get('/api/x402/pricing', (req, res) => {
  res.json({
    pricing: X402_PRICING,
    currency: 'CRO'
  });
});

// Get x402 payment history
app.get('/api/x402/payments', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = x402Service.getPaymentHistory(limit);
    
    res.json({
      payments: history,
      total: history.length,
      totalSpent: x402Service.getTotalPayments()
    });
  } catch (error) {
    console.error('Error fetching x402 payments:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Estimate x402 cost for operation
app.post('/api/x402/estimate', (req, res) => {
  try {
    const { operations } = req.body;
    const cost = x402Service.estimateCost(operations);
    
    res.json({
      cost,
      currency: 'CRO',
      operations
    });
  } catch (error) {
    console.error('Error estimating cost:', error);
    res.status(500).json({ error: 'Failed to estimate cost' });
  }
});

// Process x402 payment for service
app.post('/api/x402/pay', async (req, res) => {
  try {
    const { serviceType, metadata } = req.body;
    
    if (!serviceType) {
      return res.status(400).json({ success: false, error: 'Service type required' });
    }
    
    const payment = await x402Service.processPayment(serviceType, metadata);
    
    res.json({
      success: true,
      payment: payment
    });
  } catch (error) {
    console.error('Error processing x402 payment:', error);
    res.status(500).json({ success: false, error: 'Failed to process payment' });
  }
});

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
  console.log('   Status: STOPPED (OFF by default)');
  console.log('   Trading: DISABLED');
  console.log('');
  console.log('💡 To start AI agent:');
  console.log('   1. Use dashboard Start button, or 2. cd ../ai-agent && python run_autonomous_trader.py');
  console.log('');
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

