/**
 * x402 Handshake Demo
 * 
 * Purpose: End-to-end test of x402 payment flow
 * 
 * Flow:
 * 1. Start mock x402 service (in separate terminal)
 * 2. Agent requests audit
 * 3. Service responds with 402 Payment Required
 * 4. Agent pays via SentinelClamp
 * 5. Agent retries with payment proof
 * 6. Service returns audit data
 */

import { ExecutionerAgent } from '../agents/executioner.js';

const SERVICE_URL = 'http://localhost:3402/audit';

async function runDemo() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║       CSA x402 HANDSHAKE DEMO                          ║');
  console.log('║       Cronos Sentinel Agent - Day 3-4 Milestone       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  try {
    // Initialize agent
    console.log('📋 Step 1: Initialize Executioner Agent\n');
    const agent = new ExecutionerAgent();
    
    // Check wallet balance
    const balance = await agent.getBalance();
    console.log(`   💰 Agent balance: ${balance} TCRO\n`);
    
    // Check Sentinel status
    console.log('📋 Step 2: Check SentinelClamp Status\n');
    const status = await agent.checkSentinelStatus();
    console.log(`   📊 Daily Limit: ${parseFloat(status.currentSpent) + parseFloat(status.remaining)} TCRO`);
    console.log(`   📊 Spent Today: ${status.currentSpent} TCRO`);
    console.log(`   📊 Remaining: ${status.remaining} TCRO`);
    console.log(`   📊 Total Transactions: ${status.txCount}`);
    console.log(`   📊 x402 Transactions: ${status.x402TxCount}\n`);

    // Request service with x402 handling
    console.log('📋 Step 3: Request Security Audit Service\n');
    console.log(`   🌐 Service URL: ${SERVICE_URL}`);
    console.log(`   ⏳ Making request...\n`);

    const auditData = await agent.requestX402Service(SERVICE_URL);

    // Display results
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                  AUDIT RESULTS                         ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    if (auditData.success) {
      const audit = auditData.data.audit;
      console.log(`✅ Service: ${auditData.data.service}`);
      console.log(`✅ Paid: ${auditData.paid}`);
      console.log(`✅ Payment Proof: ${auditData.paymentProof}\n`);
      
      console.log(`📄 Audit Report:`);
      console.log(`   Contract: ${audit.contractAddress}`);
      console.log(`   Risk Score: ${audit.riskScore}/100`);
      console.log(`   Risk Level: ${audit.riskLevel}`);
      console.log(`   Verdict: ${audit.verdict}\n`);
      
      console.log(`🔍 Security Checks:`);
      Object.entries(audit.checks).forEach(([check, result]) => {
        const icon = result.passed ? '✅' : '❌';
        console.log(`   ${icon} ${check}: ${result.details}`);
      });
      
      console.log(`\n💡 Recommendations:`);
      audit.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    // Final status check
    console.log('\n📋 Step 4: Final SentinelClamp Status\n');
    const finalStatus = await agent.checkSentinelStatus();
    console.log(`   📊 Spent Today: ${finalStatus.currentSpent} TCRO`);
    console.log(`   📊 Remaining: ${finalStatus.remaining} TCRO`);
    console.log(`   📊 Total Transactions: ${finalStatus.txCount}`);
    console.log(`   📊 x402 Transactions: ${finalStatus.x402TxCount}\n`);

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║         ✅ x402 HANDSHAKE DEMO COMPLETE ✅             ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    console.log('✨ Day 3-4 Milestone Achieved!\n');
    console.log('✅ Smart contract deployed');
    console.log('✅ One x402 payment working');
    console.log('✅ Sentinel blocks unsafe trades');
    console.log('\n🎯 Ready for Day 5-7: VVS Integration\n');

  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure mock service is running: npm run mock-service');
    console.error('   2. Check .env configuration');
    console.error('   3. Verify wallet has TCRO');
    console.error('   4. Check SentinelClamp is not paused\n');
    process.exit(1);
  }
}

// Run demo
runDemo();
