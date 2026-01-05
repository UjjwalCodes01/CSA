// DEX Execution Adapter
// Routes execution to appropriate backend (Mock or VVS)

import 'dotenv/config';
import { MockExecutor } from './dex-mock-executor.js';
import { VVSExecutor } from './dex-vvs-executor.js';

export class DEXExecutor {
  constructor() {
    this.mode = process.env.EXECUTION_MODE || 'mock';
    
    console.log(`🔀 DEX Executor initialized in ${this.mode.toUpperCase()} mode`);
    
    // Initialize appropriate backend
    if (this.mode === 'mock') {
      this.backend = new MockExecutor();
    } else if (this.mode === 'vvs') {
      this.backend = new VVSExecutor();
    } else {
      throw new Error(`Invalid EXECUTION_MODE: ${this.mode}. Use 'mock' or 'vvs'`);
    }
  }

  /**
   * Execute trade through appropriate backend
   * 
   * @param {Object} tradeRequest Trade parameters
   * @param {string} tradeRequest.tokenIn Input token address
   * @param {string} tradeRequest.tokenOut Output token address  
   * @param {BigInt} tradeRequest.amountIn Amount to swap
   * @param {BigInt} tradeRequest.amountOutMin Minimum output (slippage)
   * @param {number} tradeRequest.slippagePercent Slippage tolerance
   * @returns {Object} Execution result with tx hashes and amounts
   */
  async executeTrade(tradeRequest) {
    console.log('\n🔄 Executing trade via', this.mode, 'backend');
    
    try {
      const result = await this.backend.executeTrade(tradeRequest);
      
      return {
        success: true,
        mode: this.mode,
        ...result
      };
    } catch (error) {
      console.error('❌ Trade execution failed:', error.message);
      throw error;
    }
  }

  /**
   * Get quote for trade
   */
  async getQuote(tokenIn, tokenOut, amountIn) {
    return await this.backend.getQuote(tokenIn, tokenOut, amountIn);
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress) {
    return await this.backend.getTokenBalance(tokenAddress);
  }

  /**
   * Display current status
   */
  async displayStatus() {
    await this.backend.displayStatus();
  }

  /**
   * Get Sentinel status
   */
  async getSentinelStatus() {
    return await this.backend.getSentinelStatus();
  }

  /**
   * Switch execution mode (for testing)
   */
  switchMode(newMode) {
    if (newMode !== 'mock' && newMode !== 'vvs') {
      throw new Error(`Invalid mode: ${newMode}`);
    }
    
    console.log(`Switching from ${this.mode} to ${newMode} mode`);
    this.mode = newMode;
    
    if (newMode === 'mock') {
      this.backend = new MockExecutor();
    } else {
      this.backend = new VVSExecutor();
    }
  }
}
