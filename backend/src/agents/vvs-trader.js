// VVS Finance Trader Agent
// Executes token swaps on VVS DEX with SentinelClamp safety checks

import { ethers } from 'ethers';
import { VVS_ROUTER_ABI } from '../abi/VVSRouter.js';
import { ERC20_ABI } from '../abi/ERC20.js';
import { SENTINEL_CLAMP_ABI } from '../abi/SentinelClamp.js';

export class VVSTraderAgent {
  constructor() {
    // Network configuration
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, this.provider);
    
    // Contract addresses from environment (use getAddress to fix checksums)
    this.vvsRouterAddress = ethers.getAddress(process.env.VVS_ROUTER_ADDRESS);
    this.wcroAddress = ethers.getAddress(process.env.WCRO_ADDRESS.toLowerCase());
    this.usdcAddress = ethers.getAddress(process.env.USDC_CONTRACT_ADDRESS);
    this.sentinelAddress = ethers.getAddress(process.env.SENTINEL_CLAMP_ADDRESS);
    
    // Initialize contracts
    this.vvsRouter = new ethers.Contract(this.vvsRouterAddress, VVS_ROUTER_ABI, this.wallet);
    this.sentinel = new ethers.Contract(this.sentinelAddress, SENTINEL_CLAMP_ABI, this.wallet);
    
    console.log('🦈 VVS Trader Agent initialized');
    console.log(`   Wallet: ${this.wallet.address}`);
    console.log(`   VVS Router: ${this.vvsRouterAddress}`);
    console.log(`   Sentinel: ${this.sentinelAddress}`);
  }

  /**
   * Get token balance
   */
  async getTokenBalance(tokenAddress) {
    try {
      if (tokenAddress === ethers.ZeroAddress || tokenAddress.toLowerCase() === 'native') {
        // Native TCRO balance
        const balance = await this.provider.getBalance(this.wallet.address);
        return ethers.formatEther(balance);
      } else {
        // ERC20 token balance
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
        const balance = await token.balanceOf(this.wallet.address);
        const decimals = await token.decimals();
        return ethers.formatUnits(balance, decimals);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not fetch balance for ${tokenAddress}: ${error.message}`);
      // Return mock balance for demo purposes
      return "10.0";
    }
  }

  /**
   * Get swap quote from VVS Router
   * Returns expected output amount
   */
  async getQuote(tokenIn, tokenOut, amountIn) {
    try {
      // Build path array
      const path = [tokenIn, tokenOut];
      
      // Get amounts out from router
      const amounts = await this.vvsRouter.getAmountsOut(amountIn, path);
      
      // amounts[0] = amountIn, amounts[1] = amountOut
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
   * Check token approval and approve if needed
   */
  async ensureTokenApproval(tokenAddress, amount) {
    try {
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
      
      // Check current allowance
      const allowance = await token.allowance(this.wallet.address, this.vvsRouterAddress);
      
      if (allowance < amount) {
        console.log(`   Approving ${ethers.formatEther(amount)} tokens for VVS Router...`);
        const tx = await token.approve(this.vvsRouterAddress, amount);
        await tx.wait();
        console.log(`   ✅ Approval confirmed: ${tx.hash}`);
      } else {
        console.log(`   ✅ Token already approved`);
      }
    } catch (error) {
      console.log(`   ⚠️  Approval skipped (MockRouter doesn't need real tokens): ${error.message}`);
      // MockRouter doesn't require real token approvals
    }
  }

  /**
   * Execute swap via SentinelClamp
   * This is the SAFE method - Sentinel must approve first!
   */
  async executeSwap(tokenIn, tokenOut, amountIn, minAmountOut, slippagePercent = 5) {
    console.log('\n🔄 Initiating VVS Swap...');
    console.log(`   Token In: ${tokenIn === this.wcroAddress ? 'WCRO' : 'USDC'}`);
    console.log(`   Token Out: ${tokenOut === this.wcroAddress ? 'WCRO' : 'USDC'}`);
    console.log(`   Amount In: ${ethers.formatEther(amountIn)}`);
    
    try {
      // Step 1: Get quote
      console.log('\n📊 Step 1: Getting quote from VVS...');
      const quote = await this.getQuote(tokenIn, tokenOut, amountIn);
      console.log(`   Expected Out: ${ethers.formatEther(quote.amountOut)}`);
      
      // Calculate min amount with slippage
      const calculatedMinOut = (quote.amountOut * BigInt(100 - slippagePercent)) / BigInt(100);
      const finalMinOut = minAmountOut || calculatedMinOut;
      console.log(`   Min Out (${slippagePercent}% slippage): ${ethers.formatEther(finalMinOut)}`);
      
      // Step 2: Simulate Sentinel check (READ-ONLY, doesn't change state)
      console.log('\n🛡️  Step 2: Checking with Sentinel (simulation)...');
      const [approved, reason, remaining] = await this.sentinel.simulateCheck(
        this.vvsRouterAddress,
        amountIn
      );
      
      console.log(`   Decision: ${approved ? '✅ APPROVED' : '❌ BLOCKED'}`);
      console.log(`   Reason: ${reason}`);
      console.log(`   Remaining Limit: ${ethers.formatEther(remaining)} TCRO`);
      
      if (!approved) {
        console.log('\n❌ SWAP BLOCKED BY SENTINEL');
        console.log(`   Reason: ${reason}`);
        return {
          success: false,
          blocked: true,
          reason: reason,
          remainingLimit: ethers.formatEther(remaining)
        };
      }
      
      // Step 3: Approve token spending (if ERC20)
      if (tokenIn !== ethers.ZeroAddress) {
        console.log('\n💰 Step 3: Ensuring token approval...');
        await this.ensureTokenApproval(tokenIn, amountIn);
      }
      
      // Step 4: Check and approve with Sentinel (WRITE, records transaction)
      console.log('\n🛡️  Step 4: Recording approval in Sentinel...');
      const approveTx = await this.sentinel.checkAndApprove(this.vvsRouterAddress, amountIn);
      const approveReceipt = await approveTx.wait();
      console.log(`   ✅ Sentinel approved: ${approveReceipt.hash}`);
      
      // Step 5: Execute swap on VVS
      console.log('\n🔄 Step 5: Executing swap on VVS Router...');
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      
      const swapTx = await this.vvsRouter.swapExactTokensForTokens(
        amountIn,
        finalMinOut,
        quote.path,
        this.wallet.address,
        deadline
      );
      
      console.log(`   Transaction sent: ${swapTx.hash}`);
      console.log(`   Waiting for confirmation...`);
      
      const swapReceipt = await swapTx.wait();
      console.log(`   ✅ Swap confirmed at block ${swapReceipt.blockNumber}`);
      
      // Get final balances
      const balanceOut = await this.getTokenBalance(tokenOut);
      
      return {
        success: true,
        blocked: false,
        sentinelTx: approveReceipt.hash,
        swapTx: swapReceipt.hash,
        blockNumber: swapReceipt.blockNumber,
        amountIn: ethers.formatEther(amountIn),
        expectedOut: ethers.formatEther(quote.amountOut),
        minOut: ethers.formatEther(finalMinOut),
        finalBalance: balanceOut
      };
      
    } catch (error) {
      console.error('\n❌ Swap failed:', error.message);
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
    console.log('\n📊 Current Status:');
    
    // Wallet balance
    const tcroBalance = await this.provider.getBalance(this.wallet.address);
    console.log(`   TCRO Balance: ${ethers.formatEther(tcroBalance)}`);
    
    // Token balances
    const wcroBalance = await this.getTokenBalance(this.wcroAddress);
    const usdcBalance = await this.getTokenBalance(this.usdcAddress);
    console.log(`   WCRO Balance: ${wcroBalance}`);
    console.log(`   USDC.e Balance: ${usdcBalance}`);
    
    // Sentinel status
    const status = await this.getSentinelStatus();
    console.log(`\n🛡️  Sentinel Status:`);
    console.log(`   Daily Spent: ${status.dailySpent} TCRO`);
    console.log(`   Remaining: ${status.remainingLimit} TCRO`);
    console.log(`   Total Transactions: ${status.totalTransactions}`);
    console.log(`   x402 Payments: ${status.x402Transactions}`);
  }
}
