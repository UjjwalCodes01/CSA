/**
 * x402 Handshake Test
 * 
 * Purpose: Simple test script for x402 payment flow
 */

import { ExecutionerAgent } from '../agents/executioner.js';

async function test() {
  console.log('🧪 Testing x402 Handshake...\n');

  const agent = new ExecutionerAgent();
  
  // Test 1: Check status
  console.log('Test 1: Sentinel Status');
  const status = await agent.checkSentinelStatus();
  console.log('✅ Status retrieved:', status);
  
  // Test 2: Request x402 service
  console.log('\nTest 2: x402 Service Request');
  try {
    const data = await agent.requestX402Service('http://localhost:3402/audit');
    console.log('✅ Service data received:', data);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();
