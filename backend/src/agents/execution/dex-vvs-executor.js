// VVS DEX Executor  
// Executes real trades through VVS Finance Router (mainnet)

import { ethers } from 'ethers';
import { VVS_ROUTER_ABI } from '../../abi/VVSRouter.js';
import { ERC20_ABI } from '../../abi/ERC20.js';
import { SENTINEL_CLAMP_ABI } from '../../abi/SentinelClamp.js';

export class VVSExecutor {
  constructor() {
    // Network configuration
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, this.provider);
    
    // Contract addresses
    this.vvsRouterAddress = process.env.VVS_ROUTER_ADDRESS;
    this.wcroAddress = process.env.WCRO_ADDRESS;
    this.usdcAddress = process.env.USDC_CONTRACT_ADDRESS;
    this.sentinelAddress = process.env.SENTINEL_CLAMP_ADDRESS;
    
    // Initialize contracts
    this.vvsRouter = new ethers.Contract(this.vvsRouterAddress, VVS_ROUTER_ABI, this.wallet);
    this.sentinel = new ethers.Contract(this.sentinelAddress, SENTINEL_CLAMP_ABI, this.wallet);
    
    console.log('🦈 VVS Executor initialized');
    console.log(`   Wallet: ${this.wallet.address}`);
    console.log(`   VVS Router: ${this.vvsRouterAddress}`);
    console.log(`   Sentinel: ${this.sentinelAddress}`);
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress) {
    if (tokenAddress === ethers.ZeroAddress || tokenAddress.toLowerCase() === 'native') {
      const balance = await this.provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } else {
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const balance = await token.balanceOf(this.wallet.address);
      const decimals = await token.decimals();
      return ethers.formatUnits(balance, decimals);
    }
  }

  /**
   * Get swap quote from VVS Router
   */
  async getQuote(tokenIn, tokenOut, amountIn) {
    try {
      const path = [tokenIn, tokenOut];
      const amounts = await this.vvsRouter.getAmountsOut(amountIn, path);
      
      return {
        amountIn: amounts[0],
        amountOut: amounts[1],
        path: path
      };
    } catch (error) {
      throw new Error(`Failed to get quote: ${error.message}`);
    }
  }

  /**
   * Check and approve token spending if needed
   */
  async ensureTokenApproval(tokenAddress, amount) {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
    
    const allowance = await token.allowance(this.wallet.address, this.vvsRouterAddress);
    
    if (allowance < amount) {
      console.log(`   Approving ${ethers.formatEther(amount)} tokens for VVS Router...`);
      const tx = await token.approve(this.vvsRouterAddress, amount);
      await tx.wait();
      console.log(`   ✅ Approval confirmed`);
    } else {
      console.log(`   ✅ Token already approved`);
    }
  }

  /**
   * Execute real trade through VVS Router with Sentinel approval
   * 
   * FLOW:
   * 1. Get quote from VVS
   * 2. Simulate Sentinel check
   * 3. Approve tokens if needed
   * 4. Record in Sentinel
   * 5. Execute real swap on VVS
   * 6. Return result
   */
  async executeTrade({ tokenIn, tokenOut, amountIn, amountOutMin, slippagePercent = 5 }) {
    console.log('\n🦈 VVS Execution Flow Starting...');
    console.log(`   Token In: ${tokenIn}`);
    console.log(`   Token Out: ${tokenOut}`);
    console.log(`   Amount In: ${ethers.formatEther(amountIn)}`);
    
    try {
      // Step 1: Get quote
      console.log('\n📊 Step 1: Getting quote from VVS...');
      const quote = await this.getQuote(tokenIn, tokenOut, amountIn);
      console.log(`   Expected Out: ${ethers.formatEther(quote.amountOut)}`);
      
      const calculatedMinOut = (quote.amountOut * BigInt(100 - slippagePercent)) / BigInt(100);
      const finalMinOut = amountOutMin || calculatedMinOut;
      console.log(`   Min Out (${slippagePercent}% slippage): ${ethers.formatEther(finalMinOut)}`);
      
      // Step 2: Simulate Sentinel check
      console.log('\n🛡️  Step 2: Checking with Sentinel (simulation)...');
      const [approved, reason, remaining] = await this.sentinel.simulateCheck(
        this.vvsRouterAddress,
        amountIn
      );
      
      console.log(`   Decision: ${approved ? '✅ APPROVED' : '❌ BLOCKED'}`);
      console.log(`   Reason: ${reason}`);
      console.log(`   Remaining Limit: ${ethers.formatEther(remaining)} TCRO`);
      
      if (!approved) {
        console.log('\n❌ TRADE BLOCKED BY SENTINEL');
        return {
          success: false,
          blocked: true,
          reason: reason,
          remainingLimit: ethers.formatEther(remaining)
        };
      }
      
      // Step 3: Approve tokens if ERC20
      if (tokenIn !== ethers.ZeroAddress && tokenIn.toLowerCase() !== 'native') {
        console.log('\n💰 Step 3: Ensuring token approval...');
        await this.ensureTokenApproval(tokenIn, amountIn);
      }
      
      // Step 4: Record in Sentinel
      console.log('\n🛡️  Step 4: Recording approval in Sentinel...');
      const approveTx = await this.sentinel.checkAndApprove(this.vvsRouterAddress, amountIn);
      const approveReceipt = await approveTx.wait();
      console.log(`   ✅ Sentinel approved: ${approveReceipt.hash}`);
      
      // Step 5: Execute real swap on VVS
      console.log('\n🔄 Step 5: Executing real swap on VVS Router...');
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
      
      let swapTx, swapReceipt;
      
      if (tokenIn === ethers.ZeroAddress || tokenIn.toLowerCase() === 'native') {
        // Native CRO swap
        swapTx = await this.vvsRouter.swapExactETHForTokens(
          finalMinOut,
          quote.path,
          this.wallet.address,
          deadline,
          { value: amountIn }
        );
      } else {
        // Token swap
        swapTx = await this.vvsRouter.swapExactTokensForTokens(
          amountIn,
          finalMinOut,
          quote.path,
          this.wallet.address,
          deadline
        );
      }
      
      console.log(`   Transaction sent: ${swapTx.hash}`);
      swapReceipt = await swapTx.wait();
      console.log(`   ✅ Real swap confirmed at block ${swapReceipt.blockNumber}`);
      
      // Get final balance
      const finalBalance = await this.getTokenBalance(tokenOut);
      
      return {
        success: true,
        blocked: false,
        sentinelTx: approveReceipt.hash,
        swapTx: swapReceipt.hash,
        blockNumber: swapReceipt.blockNumber,
        amountIn: ethers.formatEther(amountIn),
        expectedOut: ethers.formatEther(quote.amountOut),
        minOut: ethers.formatEther(finalMinOut),
        finalBalance: finalBalance,
        executionMode: 'VVS_REAL'
      };
      
    } catch (error) {
      console.error('\n❌ VVS execution failed:', error.message);
      throw error;
    }
  }

  /**
   * Get Sentinel status
   */
  async getSentinelStatus() {
    const [spent, remaining, resetTime, paused, txCount, x402Count] = await this.sentinel.getStatus();
    
    return {
      dailySpent: ethers.formatEther(spent),
      remainingLimit: ethers.formatEther(remaining),
      timeUntilReset: Number(resetTime),
      isPaused: paused,
      totalTransactions: Number(txCount),
      x402Transactions: Number(x402Count)
    };
  }

  /**
   * Display current status
   */
  async displayStatus() {
    console.log('\n📊 VVS Executor Status:');
    
    const tcroBalance = await this.provider.getBalance(this.wallet.address);
    console.log(`   TCRO Balance: ${ethers.formatEther(tcroBalance)}`);
    
    const wcroBalance = await this.getTokenBalance(this.wcroAddress);
    const usdcBalance = await this.getTokenBalance(this.usdcAddress);
    console.log(`   WCRO Balance: ${wcroBalance}`);
    console.log(`   USDC Balance: ${usdcBalance}`);
    
    const status = await this.getSentinelStatus();
    console.log(`\n🛡️  Sentinel Status:`);
    console.log(`   Daily Spent: ${status.dailySpent} TCRO`);
    console.log(`   Remaining: ${status.remainingLimit} TCRO`);
    console.log(`   Total Transactions: ${status.totalTransactions}`);
  }
}
