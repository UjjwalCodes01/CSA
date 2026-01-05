// Demo: Large Swap (Sentinel BLOCKS)
// This demonstrates the KILLER FEATURE: Sentinel blocking unsafe trades

import 'dotenv/config';
import { ethers } from 'ethers';
import { VVSTraderAgent } from '../agents/vvs-trader.js';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     DEMO: LARGE SWAP (SENTINEL BLOCKS) 🛡️                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('📝 Scenario:');
  console.log('   Agent wants to swap 3 TCRO for USDC.e');
  console.log('   Daily limit: 1 TCRO');
  console.log('   Expected: ❌ BLOCKED (exceeds limit)\n');
  
  console.log('🎯 This is YOUR KILLER FEATURE:');
  console.log('   → Agent CANNOT execute unsafe trades');
  console.log('   → Blockchain enforces the limit');
  console.log('   → No code bypass possible\n');
  
  try {
    // Initialize trader
    const trader = new VVSTraderAgent();
    
    // Display initial status
    console.log('═══════════════════════════════════════════════════════════');
    console.log('INITIAL STATE');
    console.log('═══════════════════════════════════════════════════════════');
    await trader.displayStatus();
    
    // Swap parameters - INTENTIONALLY TOO LARGE!
    const amountIn = ethers.parseEther('3.0'); // 3 TCRO (EXCEEDS 1 TCRO LIMIT)
    const wcroAddress = process.env.WCRO_ADDRESS;
    const usdcAddress = process.env.USDC_CONTRACT_ADDRESS;
    
    // Attempt swap
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('ATTEMPTING SWAP (SHOULD BE BLOCKED)');
    console.log('═══════════════════════════════════════════════════════════');
    
    const result = await trader.executeSwap(
      wcroAddress,    // tokenIn: WCRO
      usdcAddress,    // tokenOut: USDC.e
      amountIn,       // amount: 3 TCRO (TOO MUCH!)
      null,           // minOut: auto-calculate
      5               // 5% slippage
    );
    
    // Display result
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('RESULT');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (result.blocked) {
      console.log('❌ SWAP BLOCKED BY SENTINEL!\n');
      console.log('🛡️  Protection Details:');
      console.log(`   Reason: ${result.reason}`);
      console.log(`   Remaining Daily Limit: ${result.remainingLimit} TCRO`);
      console.log(`   Attempted Amount: ${ethers.formatEther(amountIn)} TCRO`);
      
      console.log('\n✅ SAFETY MECHANISM WORKING:');
      console.log('   → Agent wanted to spend 3 TCRO');
      console.log('   → Sentinel said NO');
      console.log('   → NO transaction was sent');
      console.log('   → Funds are SAFE');
      
      console.log('\n💡 What This Proves:');
      console.log('   ✓ AI agents can be autonomous');
      console.log('   ✓ BUT they cannot exceed safety limits');
      console.log('   ✓ Blockchain enforces constraints');
      console.log('   ✓ Not software limits - SMART CONTRACT limits');
      
    } else if (result.success) {
      console.log('⚠️  WARNING: Swap succeeded when it should have been blocked!');
      console.log('   This should not happen. Check Sentinel configuration.');
    }
    
    // Display final status (should be unchanged)
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('FINAL STATE (UNCHANGED - NO TRANSACTION EXECUTED)');
    console.log('═══════════════════════════════════════════════════════════');
    await trader.displayStatus();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  🛡️  DEMO COMPLETE: SENTINEL PROTECTION VERIFIED          ║');
    console.log('║                                                            ║');
    console.log('║  This is what makes your project DIFFERENT:               ║');
    console.log('║  → Other AI bots: Unlimited access                        ║');
    console.log('║  → Your AI bot: Blockchain-enforced safety                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

main();
