// Mock DEX Executor
// Executes trades through MockRouter for testnet demonstrations

import { ethers } from 'ethers';
import { ERC20_ABI } from '../../abi/ERC20.js';
import { SENTINEL_CLAMP_ABI } from '../../abi/SentinelClamp.js';

// MockRouter ABI
const MOCK_ROUTER_ABI = [
  "function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)",
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)",
  "function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external payable returns (uint256[] memory amounts)",
  "function simulateSwap(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to) external returns (bool wouldSucceed, uint256 expectedOut, string memory reason)",
  "function getAgentStats(address agent) external view returns (uint256 tradeCount, uint256 volume)",
  "function totalMockTrades() external view returns (uint256)",
  "event MockTradeExecuted(address indexed agent, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 expectedOut, uint256 actualOut, string executionMode, uint256 timestamp)"
];

export class MockExecutor {
  constructor() {
    // Network configuration
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, this.provider);
    
    // Contract addresses
    this.mockRouterAddress = process.env.MOCK_ROUTER_ADDRESS;
    this.wcroAddress = process.env.WCRO_ADDRESS;
    this.usdcAddress = process.env.USDC_CONTRACT_ADDRESS;
    this.sentinelAddress = process.env.SENTINEL_CLAMP_ADDRESS;
    
    if (!this.mockRouterAddress) {
      throw new Error('MOCK_ROUTER_ADDRESS not configured in .env');
    }
    
    // Initialize contracts
    this.mockRouter = new ethers.Contract(this.mockRouterAddress, MOCK_ROUTER_ABI, this.wallet);
    this.sentinel = new ethers.Contract(this.sentinelAddress, SENTINEL_CLAMP_ABI, this.wallet);
    
    console.log('🎭 Mock Executor initialized');
    console.log(`   Wallet: ${this.wallet.address}`);
    console.log(`   Mock Router: ${this.mockRouterAddress}`);
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
   * Get swap quote from MockRouter
   */
  async getQuote(tokenIn, tokenOut, amountIn) {
    try {
      const path = [tokenIn, tokenOut];
      const amounts = await this.mockRouter.getAmountsOut(amountIn, path);
      
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
   * Execute trade through MockRouter with Sentinel approval
   * 
   * FLOW:
   * 1. Get quote from MockRouter
   * 2. Simulate Sentinel check (read-only)
   * 3. If approved, record in Sentinel (write)
   * 4. Execute mock swap (creates real tx)
   * 5. Return result with tx hashes
   */
  async executeTrade({ tokenIn, tokenOut, amountIn, amountOutMin, slippagePercent = 5 }) {
    console.log('\n🎭 Mock Execution Flow Starting...');
    console.log(`   Token In: ${tokenIn === this.wcroAddress ? 'WCRO' : 'USDC'}`);
    console.log(`   Token Out: ${tokenOut === this.wcroAddress ? 'WCRO' : 'USDC'}`);
    console.log(`   Amount In: ${ethers.formatEther(amountIn)}`);
    
    try {
      // Step 1: Get quote
      console.log('\n📊 Step 1: Getting quote from MockRouter...');
      const quote = await this.getQuote(tokenIn, tokenOut, amountIn);
      console.log(`   Expected Out: ${ethers.formatEther(quote.amountOut)}`);
      
      // Calculate min amount with slippage
      const calculatedMinOut = (quote.amountOut * BigInt(100 - slippagePercent)) / BigInt(100);
      const finalMinOut = amountOutMin || calculatedMinOut;
      console.log(`   Min Out (${slippagePercent}% slippage): ${ethers.formatEther(finalMinOut)}`);
      
      // Step 2: Simulate Sentinel check (READ-ONLY)
      console.log('\n🛡️  Step 2: Checking with Sentinel (simulation)...');
      const [approved, reason, remaining] = await this.sentinel.simulateCheck(
        this.mockRouterAddress,
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
      
      // Step 3: Record approval in Sentinel (WRITE)
      console.log('\n🛡️  Step 3: Recording approval in Sentinel...');
      const approveTx = await this.sentinel.checkAndApprove(this.mockRouterAddress, amountIn);
      const approveReceipt = await approveTx.wait();
      console.log(`   ✅ Sentinel approved: ${approveReceipt.hash}`);
      
      // Step 4: Execute mock swap (CREATES REAL TX)
      console.log('\n🔄 Step 4: Executing mock swap...');
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      
      let swapTx, swapReceipt;
      
      if (tokenIn === ethers.ZeroAddress || tokenIn.toLowerCase() === 'native') {
        // Native CRO swap
        swapTx = await this.mockRouter.swapExactETHForTokens(
          finalMinOut,
          quote.path,
          this.wallet.address,
          deadline,
          { value: amountIn }
        );
      } else {
        // Token swap
        swapTx = await this.mockRouter.swapExactTokensForTokens(
          amountIn,
          finalMinOut,
          quote.path,
          this.wallet.address,
          deadline
        );
      }
      
      console.log(`   Transaction sent: ${swapTx.hash}`);
      swapReceipt = await swapTx.wait();
      console.log(`   ✅ Mock swap confirmed at block ${swapReceipt.blockNumber}`);
      
      // Parse event logs
      const event = swapReceipt.logs.find(log => {
        try {
          const parsed = this.mockRouter.interface.parseLog(log);
          return parsed.name === 'MockTradeExecuted';
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = this.mockRouter.interface.parseLog(event);
        console.log(`   📋 Event: MockTradeExecuted`);
        console.log(`      Actual Out: ${ethers.formatEther(parsed.args.actualOut)}`);
      }
      
      return {
        success: true,
        blocked: false,
        sentinelTx: approveReceipt.hash,
        swapTx: swapReceipt.hash,
        blockNumber: swapReceipt.blockNumber,
        amountIn: ethers.formatEther(amountIn),
        expectedOut: ethers.formatEther(quote.amountOut),
        minOut: ethers.formatEther(finalMinOut),
        executionMode: 'MOCK'
      };
      
    } catch (error) {
      console.error('\n❌ Mock execution failed:', error.message);
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
    console.log('\n📊 Mock Executor Status:');
    
    // Wallet balance
    const tcroBalance = await this.provider.getBalance(this.wallet.address);
    console.log(`   TCRO Balance: ${ethers.formatEther(tcroBalance)}`);
    
    // Sentinel status
    const status = await this.getSentinelStatus();
    console.log(`\n🛡️  Sentinel Status:`);
    console.log(`   Daily Spent: ${status.dailySpent} TCRO`);
    console.log(`   Remaining: ${status.remainingLimit} TCRO`);
    console.log(`   Total Transactions: ${status.totalTransactions}`);
    
    // Mock Router stats
    try {
      const [tradeCount, volume] = await this.mockRouter.getAgentStats(this.wallet.address);
      const totalTrades = await this.mockRouter.totalMockTrades();
      
      console.log(`\n🎭 MockRouter Stats:`);
      console.log(`   Agent Trades: ${tradeCount}`);
      console.log(`   Agent Volume: ${ethers.formatEther(volume)} TCRO`);
      console.log(`   Total System Trades: ${totalTrades}`);
    } catch (error) {
      console.log(`\n🎭 MockRouter Stats: Not available (contract not deployed)`);
    }
  }
}
