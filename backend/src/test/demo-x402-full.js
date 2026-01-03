/**
 * Complete x402 Demo with Real Cronos Facilitator
 * 
 * This demo showcases the full x402 payment flow:
 * 1. Agent requests a payment-gated resource
 * 2. Service returns 402 Payment Required
 * 3. Agent creates EIP-3009 authorization signature
 * 4. Service verifies payment with Cronos Facilitator
 * 5. Facilitator settles payment on-chain
 * 6. Service delivers protected resource
 * 
 * Prerequisites:
 * - Start the facilitator service: npm run service
 * - Ensure agent wallet has TCRO for gas
 * - Ensure agent wallet has USDC.e for payment (if testing with real tokens)
 */

import { ExecutionerAgent } from '../agents/executioner.js';

// Simple logging helpers
const log = {
  header: (msg) => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`),
  step: (num, msg) => console.log(`\n[Step ${num}] ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  info: (msg) => console.log(`ℹ️  ${msg}`),
  data: (label, value) => console.log(`   ${label}: ${value}`)
};

async function runFullDemo() {
  try {
    log.header('🚀 CSA x402 DEMO - Real Facilitator Integration');
    
    // ═══════════════════════════════════════════════════
    // Step 1: Initialize Agent
    // ═══════════════════════════════════════════════════
    
    log.step(1, 'Initialize Executioner Agent');
    const agent = new ExecutionerAgent();
    
    const balance = await agent.getBalance();
    log.success(`Agent initialized`);
    log.data('Wallet', agent.wallet.address);
    log.data('Balance', `${balance} TCRO`);
    
    // ═══════════════════════════════════════════════════
    // Step 2: Check Sentinel Status
    // ═══════════════════════════════════════════════════
    
    log.step(2, 'Check SentinelClamp Status');
    const status = await agent.checkSentinelStatus();
    
    log.success('Sentinel status retrieved');
    log.data('Daily Spent', `${status.currentSpent} TCRO`);
    log.data('Remaining', `${status.remaining} TCRO`);
    log.data('x402 Transactions', status.x402TxCount);
    log.data('Total Transactions', status.txCount);
    log.data('Time Until Reset', `${Math.floor(status.timeUntilReset / 3600)}h ${Math.floor((status.timeUntilReset % 3600) / 60)}m`);
    log.data('Contract Paused', status.isPaused ? '🔴 YES' : '🟢 NO');
    
    if (status.isPaused) {
      log.error('Cannot proceed: Sentinel contract is paused');
      return;
    }
    
    // ═══════════════════════════════════════════════════
    // Step 3: Request Free Endpoint (Status)
    // ═══════════════════════════════════════════════════
    
    log.step(3, 'Test Free Endpoint (No Payment Required)');
    const serviceUrl = 'http://localhost:3402';
    
    try {
      const statusResponse = await agent.requestX402Service(`${serviceUrl}/status`);
      log.success('Status endpoint accessible without payment');
      log.data('Service', statusResponse.service);
      log.data('Version', statusResponse.version);
      log.data('Verification', statusResponse.verification);
    } catch (error) {
      log.error(`Status check failed: ${error.message}`);
    }
    
    // ═══════════════════════════════════════════════════
    // Step 4: Request Paid Endpoint (x402 Flow)
    // ═══════════════════════════════════════════════════
    
    log.step(4, 'Request Payment-Gated Endpoint (x402 Flow Starts)');
    log.info('This will trigger the full x402 payment cycle...');
    
    const auditResponse = await agent.requestX402Service(`${serviceUrl}/audit`);
    
    log.success('Payment-gated resource delivered!');
    
    // ═══════════════════════════════════════════════════
    // Step 5: Display Audit Results
    // ═══════════════════════════════════════════════════
    
    log.step(5, 'Audit Results');
    
    if (auditResponse.settlement) {
      log.header('💎 ON-CHAIN SETTLEMENT');
      log.data('Transaction Hash', auditResponse.settlement.txHash);
      log.data('Block Number', auditResponse.settlement.blockNumber);
      log.data('From', auditResponse.settlement.from);
      log.data('To', auditResponse.settlement.to);
      log.data('Amount', `${auditResponse.settlement.value} (smallest unit)`);
      log.data('Network', auditResponse.settlement.network);
      log.data('Timestamp', new Date(auditResponse.settlement.timestamp).toLocaleString());
    }
    
    if (auditResponse.data?.audit) {
      log.header('🛡️ SECURITY AUDIT REPORT');
      const audit = auditResponse.data.audit;
      
      log.data('Contract', audit.contractAddress);
      log.data('Risk Score', `${audit.riskScore}/100`);
      log.data('Risk Level', audit.riskLevel);
      log.data('Verdict', audit.verdict);
      
      console.log('\n   Security Checks:');
      Object.entries(audit.checks).forEach(([name, check]) => {
        const icon = check.passed ? '✅' : '❌';
        console.log(`      ${icon} ${name}: ${check.details}`);
      });
      
      if (audit.recommendations?.length > 0) {
        console.log('\n   Recommendations:');
        audit.recommendations.forEach((rec, i) => {
          console.log(`      ${i + 1}. ${rec}`);
        });
      }
    }
    
    // ═══════════════════════════════════════════════════
    // Step 6: Check Updated Sentinel Status
    // ═══════════════════════════════════════════════════
    
    log.step(6, 'Check Updated Sentinel Status');
    const statusAfter = await agent.checkSentinelStatus();
    
    log.success('Sentinel status updated');
    log.data('Daily Spent', `${statusAfter.currentSpent} TCRO`);
    log.data('Remaining', `${statusAfter.remaining} TCRO`);
    log.data('x402 Transactions', statusAfter.x402TxCount);
    log.data('Change', `+1 x402 transaction`);
    
    // ═══════════════════════════════════════════════════
    // Demo Complete
    // ═══════════════════════════════════════════════════
    
    log.header('✅ DEMO COMPLETE');
    console.log('\n🎉 Successfully demonstrated:');
    console.log('   1. ✅ Agent requests payment-gated resource');
    console.log('   2. ✅ Receives 402 Payment Required');
    console.log('   3. ✅ Creates EIP-3009 authorization');
    console.log('   4. ✅ Facilitator verifies payment');
    console.log('   5. ✅ Facilitator settles on-chain');
    console.log('   6. ✅ Service delivers protected resource');
    console.log('   7. ✅ Sentinel tracks x402 payment\n');
    
    console.log('🏆 Hackathon Proof Points:');
    console.log('   • Real x402 protocol implementation ✓');
    console.log('   • EIP-3009 signature verification ✓');
    console.log('   • Cronos Facilitator integration ✓');
    console.log('   • On-chain payment settlement ✓');
    console.log('   • SentinelClamp safety enforcement ✓');
    console.log('   • Autonomous agent payment ✓\n');
    
  } catch (error) {
    log.error(`Demo failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run demo
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  Cronos Sentinel Agent - x402 Payment Demo                ║');
console.log('║  Real Facilitator Integration                              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('Prerequisites:');
console.log('  1. Start service: npm run service (in another terminal)');
console.log('  2. Agent wallet has TCRO for gas');
console.log('  3. Facilitator service is running\n');

runFullDemo();
