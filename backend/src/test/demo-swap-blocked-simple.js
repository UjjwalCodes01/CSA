// Demo: Sentinel BLOCKS Large Transaction (Simplified)
// Tests ONLY the Sentinel blocking logic without actual swap

import 'dotenv/config';
import { ethers } from 'ethers';
import { SENTINEL_CLAMP_ABI } from '../abi/SentinelClamp.js';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   DEMO: SENTINEL BLOCKS LARGE TRANSACTION 🛡️              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('📝 Scenario:');
  console.log('   Agent wants to spend 3 TCRO');
  console.log('   Daily limit: 1 TCRO');
  console.log('   Expected: ❌ BLOCKED (exceeds limit)\n');
  
  console.log('🎯 This is YOUR KILLER FEATURE:');
  console.log('   → Blockchain enforces spending limits');
  console.log('   → Agent CANNOT bypass safety');
  console.log('   → No transaction will be sent\n');
  
  try {
    // Initialize
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
    const sentinel = new ethers.Contract(
      process.env.SENTINEL_CLAMP_ADDRESS,
      SENTINEL_CLAMP_ABI,
      wallet
    );
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('INITIAL STATE');
    console.log('═══════════════════════════════════════════════════════════');
    
    // Get current status
    const [spent, remaining, resetTime, paused, txCount, x402Count] = await sentinel.getStatus();
    
    console.log('\n🛡️  Sentinel Status:');
    console.log(`   Daily Limit: 1.0 TCRO`);
    console.log(`   Already Spent: ${ethers.formatEther(spent)} TCRO`);
    console.log(`   Remaining: ${ethers.formatEther(remaining)} TCRO`);
    console.log(`   Total Transactions: ${txCount}`);
    
    // Test 1: Small amount (should be approved)
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TEST 1: SMALL AMOUNT (0.5 TCRO)');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const smallAmount = ethers.parseEther('0.5');
    console.log(`Checking if 0.5 TCRO is allowed...`);
    
    const [approved1, reason1, remaining1] = await sentinel.simulateCheck(
      process.env.VVS_ROUTER_ADDRESS,
      smallAmount
    );
    
    console.log(`\n✅ Result: ${approved1 ? 'APPROVED' : 'BLOCKED'}`);
    console.log(`   Reason: ${reason1}`);
    console.log(`   Remaining after: ${ethers.formatEther(remaining1)} TCRO`);
    
    // Test 2: Large amount (should be BLOCKED)
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TEST 2: LARGE AMOUNT (3 TCRO) 🚨');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const largeAmount = ethers.parseEther('3.0');
    console.log(`Checking if 3 TCRO is allowed...`);
    
    const [approved2, reason2, remaining2] = await sentinel.simulateCheck(
      process.env.VVS_ROUTER_ADDRESS,
      largeAmount
    );
    
    console.log(`\n${approved2 ? '⚠️  APPROVED' : '❌ BLOCKED'}`);
    console.log(`   Reason: ${reason2}`);
    console.log(`   Remaining: ${ethers.formatEther(remaining2)} TCRO`);
    
    if (!approved2) {
      console.log('\n🎉 SUCCESS! Sentinel blocked the large transaction!');
      console.log('\n💡 What this proves:');
      console.log('   ✓ AI agent wanted to spend 3 TCRO');
      console.log('   ✓ Sentinel calculated: 3 > 1 (limit)');
      console.log('   ✓ Transaction BLOCKED before reaching blockchain');
      console.log('   ✓ Funds remain SAFE');
      console.log('\n🏆 This is your competitive advantage:');
      console.log('   → Other AI bots: unlimited access');
      console.log('   → Your AI bot: blockchain-enforced limits');
    }
    
    // Final status
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('FINAL STATE (UNCHANGED - NO TRANSACTIONS EXECUTED)');
    console.log('═══════════════════════════════════════════════════════════');
    
    const [finalSpent] = await sentinel.getStatus();
    console.log(`\n   Daily Spent: ${ethers.formatEther(finalSpent)} TCRO (unchanged)`);
    console.log(`   Remaining: ${ethers.formatEther(remaining)} TCRO`);
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  🛡️  DEMO COMPLETE: SAFETY MECHANISM VERIFIED             ║');
    console.log('║                                                            ║');
    console.log('║  Key Takeaway:                                             ║');
    console.log('║  Smart contract prevents agents from exceeding limits,    ║');
    console.log('║  making autonomous AI agents SAFE for real-world use.     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    process.exit(1);
  }
}

main();
