// Demo: Approved Trade via DEX Executor
// Shows Sentinel approving a trade within daily limits

import 'dotenv/config';
import { ethers } from 'ethers';
import { DEXExecutor } from '../agents/execution/dex-executor.js';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     DEMO: APPROVED TRADE (SENTINEL SAFETY)                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('📝 Scenario:');
  console.log('   Agent wants to swap 0.05 TCRO for tokens');
  console.log('   Daily limit: 1 TCRO');
  console.log('   Expected: ✅ APPROVED (within limit)\n');
  
  try {
    // Initialize DEX executor (auto-detects mode from .env)
    const executor = new DEXExecutor();
    
    // Display initial status
    console.log('═══════════════════════════════════════════════════════════');
    console.log('INITIAL STATE');
    console.log('═══════════════════════════════════════════════════════════');
    await executor.displayStatus();
    
    // Trade parameters
    const tradeRequest = {
      tokenIn: process.env.WCRO_ADDRESS,
      tokenOut: process.env.USDC_CONTRACT_ADDRESS,
      amountIn: ethers.parseEther('0.05'), // 0.05 TCRO
      amountOutMin: null, // Auto-calculate with slippage
      slippagePercent: 5
    };
    
    // Execute trade
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('EXECUTING TRADE');
    console.log('═══════════════════════════════════════════════════════════');
    
    const result = await executor.executeTrade(tradeRequest);
    
    // Display result
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('RESULT');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (result.success) {
      console.log('✅ TRADE SUCCESSFUL!\n');
      console.log('Transaction Details:');
      console.log(`   Execution Mode: ${result.executionMode}`);
      console.log(`   Sentinel Approval: ${result.sentinelTx}`);
      console.log(`   Trade Transaction: ${result.swapTx}`);
      console.log(`   Block Number: ${result.blockNumber}`);
      console.log(`\nTrade Details:`);
      console.log(`   Amount In: ${result.amountIn} TCRO`);
      console.log(`   Expected Out: ${result.expectedOut} tokens`);
      console.log(`   Min Out: ${result.minOut} tokens`);
      
      console.log('\n🔗 View on Explorer:');
      console.log(`   Sentinel: https://explorer.cronos.org/testnet/tx/${result.sentinelTx}`);
      console.log(`   Trade: https://explorer.cronos.org/testnet/tx/${result.swapTx}`);
    }
    
    // Display final status
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('FINAL STATE');
    console.log('═══════════════════════════════════════════════════════════');
    await executor.displayStatus();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ DEMO COMPLETE: TRADE APPROVED & EXECUTED              ║');
    console.log('║                                                            ║');
    console.log('║  Key Points:                                               ║');
    console.log('║  → Agent requested 0.05 TCRO trade                         ║');
    console.log('║  → Sentinel calculated: 0.05 < 1.0 limit                   ║');
    console.log('║  → Trade APPROVED and recorded on-chain                    ║');
    console.log('║  → Execution completed with verifiable tx hash             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

main();
