/**
 * Cronos Sentinel API Server
 * REST API for Telegram bot to execute trades
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { VVSTraderAgent } from './agents/vvs-trader.js';
import { ExecutionerAgent } from './agents/executioner.js';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple API key authentication
const API_KEY = process.env.API_KEY || 'sentinel-api-key-change-me';

function authenticateRequest(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized - Invalid API key' 
    });
  }
  
  next();
}

// Initialize agents
let trader;
let executioner;

try {
  trader = new VVSTraderAgent();
  executioner = new ExecutionerAgent();
  console.log('✅ Agents initialized');
} catch (error) {
  console.error('❌ Failed to initialize agents:', error.message);
  process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Cronos Sentinel API'
  });
});

// Get Sentinel status
app.get('/api/sentinel/status', authenticateRequest, async (req, res) => {
  try {
    const status = await executioner.checkSentinelStatus();
    
    res.json({
      success: true,
      data: {
        currentSpent: status.currentSpent,
        remaining: status.remaining,
        timeUntilReset: status.timeUntilReset,
        isPaused: status.isPaused,
        txCount: status.txCount,
        x402TxCount: status.x402TxCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get wallet balances
app.get('/api/wallet/balance', authenticateRequest, async (req, res) => {
  try {
    const wcroAddress = process.env.WCRO_ADDRESS;
    const usdcAddress = process.env.USDC_CONTRACT_ADDRESS;
    
    const [tcroBalance, wcroBalance, usdcBalance] = await Promise.all([
      trader.getTokenBalance(ethers.ZeroAddress),
      trader.getTokenBalance(wcroAddress),
      trader.getTokenBalance(usdcAddress)
    ]);
    
    res.json({
      success: true,
      data: {
        TCRO: tcroBalance,
        WCRO: wcroBalance,
        USDC: usdcBalance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Execute trade
app.post('/api/trade/execute', authenticateRequest, async (req, res) => {
  try {
    const { amount, tokenIn, tokenOut, slippage } = req.body;
    
    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }
    
    // Default tokens
    // For native CRO: use ethers.ZeroAddress
    // For WCRO: use WCRO_ADDRESS
    // If tokenIn is null or explicitly "native", use ZeroAddress
    let tokenInAddress;
    if (tokenIn === null || tokenIn === undefined || tokenIn === "native") {
      tokenInAddress = ethers.ZeroAddress;  // Native CRO
    } else {
      tokenInAddress = tokenIn;
    }
    
    const tokenOutAddress = tokenOut || process.env.USDC_CONTRACT_ADDRESS;
    const slippageTolerance = slippage || 5;
    
    console.log(`\n🔄 Executing trade: ${amount} CRO → USDC`);
    console.log(`   Token In: ${tokenInAddress}`);
    console.log(`   Token Out: ${tokenOutAddress}`);
    console.log(`   Slippage: ${slippageTolerance}%`);
    
    // Convert amount to Wei
    const amountWei = ethers.parseEther(amount.toString());
    
    // Execute swap
    const result = await trader.executeSwap(
      tokenInAddress,
      tokenOutAddress,
      amountWei,
      null, // minOut calculated automatically
      slippageTolerance
    );
    
    if (result.success) {
      console.log('✅ Trade executed successfully');
      console.log(`   Sentinel TX: ${result.sentinelTx}`);
      console.log(`   Swap TX: ${result.swapTx}`);
      
      res.json({
        success: true,
        data: {
          sentinelTx: result.sentinelTx,
          swapTx: result.swapTx,
          blockNumber: result.blockNumber,
          amountIn: result.amountIn,
          expectedOut: result.expectedOut,
          minOut: result.minOut,
          finalBalance: result.finalBalance,
          explorerUrl: `https://explorer.cronos.org/testnet/tx/${result.swapTx}`
        }
      });
    } else {
      console.log('❌ Trade execution failed');
      res.status(400).json({
        success: false,
        error: result.error || 'Trade execution failed'
      });
    }
    
  } catch (error) {
    console.error('❌ Trade execution error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get swap quote
app.post('/api/trade/quote', authenticateRequest, async (req, res) => {
  try {
    const { amount, tokenIn, tokenOut } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }
    
    // Handle native CRO vs WCRO
    let tokenInAddress;
    if (tokenIn === null || tokenIn === undefined || tokenIn === "native") {
      tokenInAddress = ethers.ZeroAddress;  // Native CRO
    } else {
      tokenInAddress = tokenIn;
    }
    
    const tokenOutAddress = tokenOut || process.env.USDC_CONTRACT_ADDRESS;
    const amountWei = ethers.parseEther(amount.toString());
    
    const quote = await trader.getQuote(tokenInAddress, tokenOutAddress, amountWei);
    
    res.json({
      success: true,
      data: {
        amountIn: amount,
        amountOut: quote.amountOut,
        priceImpact: quote.priceImpact
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        CRONOS SENTINEL API SERVER                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log();
  console.log('Available endpoints:');
  console.log('  GET  /health');
  console.log('  GET  /api/sentinel/status');
  console.log('  GET  /api/wallet/balance');
  console.log('  POST /api/trade/execute');
  console.log('  POST /api/trade/quote');
  console.log();
  console.log('⚠️  Remember to set X-API-Key header for authenticated endpoints');
  console.log();
});

export default app;
