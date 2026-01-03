#!/usr/bin/env node
/**
 * Quick utility to check agent configuration
 */

import { ExecutionerAgent } from '../agents/executioner.js';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  🔍 Agent Configuration Check                             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function checkConfig() {
  try {
    // Initialize agent
    const agent = new ExecutionerAgent();
    
    // Get balance
    const balance = await agent.getBalance();
    
    // Get Sentinel status
    const status = await agent.checkSentinelStatus();
    
    console.log('✅ Configuration Valid\n');
    
    console.log('📍 Network Configuration:');
    console.log(`   RPC URL: ${process.env.RPC_URL}`);
    console.log(`   Chain ID: ${process.env.CHAIN_ID || '338'}`);
    console.log(`   Network: ${process.env.FACILITATOR_NETWORK}\n`);
    
    console.log('🤖 Agent Wallet:');
    console.log(`   Address: ${agent.wallet.address}`);
    console.log(`   Balance: ${balance} TCRO`);
    
    if (parseFloat(balance) < 0.1) {
      console.log(`   ⚠️  Low balance! Get testnet TCRO from: https://cronos.org/faucet\n`);
    } else {
      console.log(`   ✅ Sufficient balance for testing\n`);
    }
    
    console.log('🛡️  SentinelClamp Contract:');
    console.log(`   Address: ${process.env.SENTINEL_CLAMP_ADDRESS}`);
    console.log(`   Daily Limit: 1 TCRO (hardcoded in contract)`);
    console.log(`   Daily Spent: ${status.currentSpent} TCRO`);
    console.log(`   Remaining: ${status.remaining} TCRO`);
    console.log(`   Paused: ${status.isPaused ? '🔴 YES' : '🟢 NO'}`);
    console.log(`   Total Transactions: ${status.txCount}`);
    console.log(`   x402 Transactions: ${status.x402TxCount}\n`);
    
    console.log('🔐 Facilitator Configuration:');
    console.log(`   Base URL: ${process.env.FACILITATOR_BASE_URL}`);
    console.log(`   Network: ${process.env.FACILITATOR_NETWORK}`);
    console.log(`   USDC.e Contract: ${process.env.USDC_CONTRACT_ADDRESS}\n`);
    
    console.log('🧪 Mock Service:');
    console.log(`   Port: ${process.env.MOCK_SERVICE_PORT || 3402}`);
    console.log(`   Payment Amount: ${process.env.MOCK_SERVICE_PAYMENT_AMOUNT || '50000000000000000'} (smallest unit)\n`);
    
    console.log('✅ All systems ready!\n');
    console.log('Next steps:');
    console.log('  1. Start service: npm run service');
    console.log('  2. Run demo: npm run demo:full\n');
    
    if (parseFloat(balance) < 0.1) {
      console.log('⚠️  Important: Get testnet TCRO first!');
      console.log(`   Visit: https://cronos.org/faucet`);
      console.log(`   Enter: ${agent.wallet.address}\n`);
    }
    
  } catch (error) {
    console.error('❌ Configuration Error:', error.message);
    console.error('\nPlease check:');
    console.error('  1. backend/.env file exists');
    console.error('  2. AGENT_PRIVATE_KEY is set');
    console.error('  3. RPC_URL is accessible');
    console.error('  4. SENTINEL_CLAMP_ADDRESS is correct\n');
    process.exit(1);
  }
}

checkConfig();
