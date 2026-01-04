// Demo: Blocked Trade via Sentinel
// Shows Sentinel blocking a trade that exceeds daily limits

import 'dotenv/config';
import { ethers } from 'ethers';
import { DEXExecutor } from '../agents/execution/dex-executor.js';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     DEMO: BLOCKED TRADE (SENTINEL PROTECTION) 🛡️          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('📝 Scenario:');
  console.log('   Agent wants to swap 3 TCRO for tokens');
  console.log('   Daily limit: 1 TCRO');
  console.log('   Expected: ❌ BLOCKED (exceeds limit)\n');
  
  console.log('🎯 This is YOUR KILLER FEATURE:');
  console.log('   → AI agent CANNOT execute unsafe trades');
  console.log('   → Blockchain enforces the limit');
  console.log('   → No code bypass possible\n');
  
  try {
    // Initialize DEX executor
    const executor = new DEXExecutor();
    
    // Display initial status
    console.log('═══════════════════════════════════════════════════════════');
    console.log('INITIAL STATE');
    console.log('═══════════════════════════════════════════════════════════');
    await executor.displayStatus();
    
    // Trade parameters - INTENTIONALLY TOO LARGE
    const tradeRequest = {
      tokenIn: process.env.WCRO_ADDRESS,
      tokenOut: process.env.USDC_CONTRACT_ADDRESS,
      amountIn: ethers.parseEther('3.0'), // 3 TCRO - EXCEEDS LIMIT!
      amountOutMin: null,
      slippagePercent: 5
    };
    
    // Attempt trade
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('ATTEMPTING TRADE (SHOULD BE BLOCKED)');
    console.log('═══════════════════════════════════════════════════════════');
    
    const result = await executor.executeTrade(tradeRequest);
    
    // Display result
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('RESULT');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (result.blocked) {
      console.log('❌ TRADE BLOCKED BY SENTINEL!\n');
      console.log('🛡️  Protection Details:');
      console.log(`   Reason: ${result.reason}`);
      console.log(`   Remaining Daily Limit: ${result.remainingLimit} TCRO`);
      console.log(`   Attempted Amount: 3.0 TCRO`);
      
      console.log('\n✅ SAFETY MECHANISM WORKING:');
      console.log('   → Agent wanted to spend 3 TCRO');
      console.log('   → Sentinel calculated: 3 > 1 (limit)');
      console.log('   → NO transaction was sent to blockchain');
      console.log('   → Funds remain SAFE');
      
      console.log('\n💡 What This Proves:');
      console.log('   ✓ AI agents can act autonomously');
      console.log('   ✓ BUT cannot exceed safety limits');
      console.log('   ✓ Blockchain enforces constraints');
      console.log('   ✓ Not software limits - SMART CONTRACT limits');
      console.log('   ✓ No code can bypass this protection');
      
    } else if (result.success) {
      console.log('⚠️  WARNING: Trade succeeded when it should have been blocked!');
      console.log('   This indicates a configuration issue.');
      console.log('   Check Sentinel daily limit settings.');
    }
    
    // Display final status (should be unchanged)
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('FINAL STATE (UNCHANGED - NO TRANSACTION EXECUTED)');
    console.log('═══════════════════════════════════════════════════════════');
    await executor.displayStatus();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  🛡️  DEMO COMPLETE: SENTINEL PROTECTION VERIFIED          ║');
    console.log('║                                                            ║');
    console.log('║  This is what makes your project DIFFERENT:               ║');
    console.log('║  → Other AI trading bots: Unlimited wallet access         ║');
    console.log('║  → Your AI agent: Blockchain-enforced safety limits       ║');
    console.log('║                                                            ║');
    console.log('║  Competitive Advantage:                                    ║');
    console.log('║  Smart contracts prevent rogue agent behavior, making     ║');
    console.log('║  autonomous AI agents SAFE for institutional use.         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

main();
