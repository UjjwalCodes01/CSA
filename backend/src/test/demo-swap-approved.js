// Demo: Small Swap (Sentinel Approves)
// This demonstrates a swap WITHIN daily limits that gets approved

import 'dotenv/config';
import { ethers } from 'ethers';
import { VVSTraderAgent } from '../agents/vvs-trader.js';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     DEMO: SMALL SWAP (SENTINEL APPROVES)                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('📝 Scenario:');
  console.log('   Agent wants to swap 0.05 TCRO for USDC.e');
  console.log('   Daily limit: 1 TCRO');
  console.log('   Expected: ✅ APPROVED (within limit)\n');
  
  try {
    // Initialize trader
    const trader = new VVSTraderAgent();
    
    // Display initial status
    console.log('═══════════════════════════════════════════════════════════');
    console.log('INITIAL STATE');
    console.log('═══════════════════════════════════════════════════════════');
    await trader.displayStatus();
    
    // Swap parameters
    const amountIn = ethers.parseEther('0.05'); // 0.05 TCRO (well within 1 TCRO limit)
    const wcroAddress = process.env.WCRO_ADDRESS;
    const usdcAddress = process.env.USDC_CONTRACT_ADDRESS;
    
    // Execute swap
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('EXECUTING SWAP');
    console.log('═══════════════════════════════════════════════════════════');
    
    const result = await trader.executeSwap(
      wcroAddress,    // tokenIn: WCRO
      usdcAddress,    // tokenOut: USDC.e
      amountIn,       // amount: 0.05 TCRO
      null,           // minOut: auto-calculate with 5% slippage
      5               // 5% slippage tolerance
    );
    
    // Display result
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('RESULT');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (result.success) {
      console.log('✅ SWAP SUCCESSFUL!\n');
      console.log('Transaction Details:');
      console.log(`   Sentinel Approval: ${result.sentinelTx}`);
      console.log(`   Swap Transaction: ${result.swapTx}`);
      console.log(`   Block Number: ${result.blockNumber}`);
      console.log(`\nSwap Details:`);
      console.log(`   Amount In: ${result.amountIn} WCRO`);
      console.log(`   Expected Out: ${result.expectedOut} USDC.e`);
      console.log(`   Min Out: ${result.minOut} USDC.e`);
      console.log(`   Final USDC.e Balance: ${result.finalBalance}`);
      
      console.log('\n🔗 View on Explorer:');
      console.log(`   https://explorer.cronos.org/testnet/tx/${result.swapTx}`);
    }
    
    // Display final status
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('FINAL STATE');
    console.log('═══════════════════════════════════════════════════════════');
    await trader.displayStatus();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ DEMO COMPLETE: SWAP APPROVED & EXECUTED               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

main();
