/**
 * Real x402 Service with Cronos Facilitator Integration
 * 
 * This service demonstrates a production-ready x402 payment-gated API
 * that uses the official Cronos Facilitator for payment verification.
 * 
 * Flow:
 * 1. Client requests resource → 402 Payment Required
 * 2. Client signs EIP-712 authorization
 * 3. Client retries with X-PAYMENT header
 * 4. Service verifies payment with facilitator
 * 5. Service settles payment on-chain
 * 6. Service delivers protected resource
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.MOCK_SERVICE_PORT || 3402;

// Facilitator configuration
const FACILITATOR_BASE_URL = process.env.FACILITATOR_BASE_URL || 'https://facilitator.cronoslabs.org/v2/x402';
const FACILITATOR_NETWORK = process.env.FACILITATOR_NETWORK || 'cronos-testnet';
const USDC_CONTRACT = process.env.USDC_CONTRACT_ADDRESS || '0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0';
const PAYMENT_AMOUNT = process.env.MOCK_SERVICE_PAYMENT_AMOUNT || '50000000000000000'; // 0.05 TCRO

// Middleware
app.use(cors());
app.use(express.json());

// Store settled payments (in production, use a database)
const settledPayments = new Map();

// Mock audit data
const AUDIT_DATA = {
  service: "Security Audit API (Facilitator-Verified)",
  version: "2.0.0",
  verifiedBy: "Cronos x402 Facilitator",
  audit: {
    contractAddress: process.env.SENTINEL_CLAMP_ADDRESS,
    timestamp: new Date().toISOString(),
    riskScore: 15,
    riskLevel: "LOW",
    checks: {
      reentrancy: { 
        passed: true, 
        details: "No reentrancy vulnerabilities found" 
      },
      accessControl: { 
        passed: true, 
        details: "Proper ownership checks in place" 
      },
      integerOverflow: { 
        passed: true, 
        details: "Using Solidity 0.8.x safe math" 
      },
      dailyLimit: { 
        passed: true, 
        details: "Daily limit properly enforced with 24h reset" 
      },
      x402Integration: { 
        passed: true, 
        details: "x402 payment logic validated" 
      },
      emergencyPause: {
        passed: true,
        details: "Emergency pause mechanism implemented"
      }
    },
    recommendations: [
      "Consider implementing multi-sig for owner actions",
      "Add event monitoring for suspicious activity patterns",
      "Regular security audits recommended every 6 months",
      "Monitor daily limit resets for unusual patterns"
    ],
    verdict: "PRODUCTION READY - SAFE TO USE"
  }
};

/**
 * GET /audit - Security audit endpoint with REAL facilitator verification
 * 
 * This is the main x402-gated resource.
 */
app.get('/audit', async (req, res) => {
  const paymentHeader = req.headers['x-payment'];
  
  console.log(`\n📥 Audit request received at ${new Date().toISOString()}`);
  console.log(`   Payment Header: ${paymentHeader ? 'PROVIDED ✓' : 'NONE ✗'}`);

  // ═══════════════════════════════════════════════════
  // Step 1: No payment - send 402 Payment Required
  // ═══════════════════════════════════════════════════
  
  if (!paymentHeader) {
    console.log('   ❌ No payment header - sending 402 Payment Required\n');
    
    // Create payment requirements (x402 spec)
    const paymentRequirements = {
      x402Version: 1,
      paymentRequirements: {
        scheme: "exact",
        network: FACILITATOR_NETWORK,
        payTo: process.env.SENTINEL_CLAMP_ADDRESS,
        asset: USDC_CONTRACT,
        maxAmountRequired: PAYMENT_AMOUNT,
        maxTimeoutSeconds: 300,
        description: "Security Audit API - Single Request",
        mimeType: "application/json"
      }
    };
    
    return res.status(402).json({
      error: "Payment Required",
      message: "This endpoint requires x402 payment",
      ...paymentRequirements
    });
  }

  // ═══════════════════════════════════════════════════
  // Step 2: Payment provided - verify with facilitator
  // ═══════════════════════════════════════════════════
  
  try {
    console.log('   🔐 Decoding payment header...');
    
    // Decode Base64 payment header
    let paymentData;
    try {
      const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      paymentData = JSON.parse(decoded);
      console.log('   ✓ Payment header decoded successfully');
    } catch (e) {
      console.log('   ✗ Failed to decode payment header');
      return res.status(400).json({
        error: 'Invalid payment header',
        message: 'Payment header must be valid Base64-encoded JSON'
      });
    }

    // Check if already settled (idempotency)
    const nonce = paymentData.payload?.nonce;
    if (nonce && settledPayments.has(nonce)) {
      console.log('   ⚠️  Payment already settled - returning cached result');
      const cached = settledPayments.get(nonce);
      return res.json({
        success: true,
        paid: true,
        cached: true,
        settlement: cached,
        data: AUDIT_DATA
      });
    }

    // ═══════════════════════════════════════════════════
    // Step 3: Verify payment with facilitator
    // ═══════════════════════════════════════════════════
    
    console.log('   🔍 Verifying payment with Cronos Facilitator...');
    console.log(`      URL: ${FACILITATOR_BASE_URL}/verify`);
    
    const verifyPayload = {
      x402Version: 1,
      paymentHeader: paymentHeader,
      paymentRequirements: {
        scheme: "exact",
        network: FACILITATOR_NETWORK,
        payTo: process.env.SENTINEL_CLAMP_ADDRESS,
        asset: USDC_CONTRACT,
        maxAmountRequired: PAYMENT_AMOUNT,
        maxTimeoutSeconds: 300,
        description: "Security Audit API - Single Request",
        mimeType: "application/json"
      }
    };

    let verifyResponse;
    try {
      verifyResponse = await axios.post(
        `${FACILITATOR_BASE_URL}/verify`,
        verifyPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X402-Version': '1'
          }
        }
      );
    } catch (error) {
      console.log('   ✗ Facilitator verification failed');
      console.log(`      Error: ${error.response?.data?.invalidReason || error.message}`);
      return res.status(403).json({
        error: 'Payment verification failed',
        message: error.response?.data?.invalidReason || error.message,
        details: error.response?.data
      });
    }

    if (!verifyResponse.data.isValid) {
      console.log('   ✗ Payment validation failed');
      console.log(`      Reason: ${verifyResponse.data.invalidReason}`);
      return res.status(403).json({
        error: 'Invalid payment',
        message: verifyResponse.data.invalidReason
      });
    }

    console.log('   ✓ Payment verified by facilitator');

    // ═══════════════════════════════════════════════════
    // Step 4: Settle payment on-chain
    // ═══════════════════════════════════════════════════
    
    console.log('   ⛓️  Settling payment on-chain...');
    
    const settlePayload = {
      x402Version: 1,
      paymentHeader: paymentHeader,
      paymentRequirements: {
        scheme: "exact",
        network: FACILITATOR_NETWORK,
        payTo: process.env.SENTINEL_CLAMP_ADDRESS,
        asset: USDC_CONTRACT,
        maxAmountRequired: PAYMENT_AMOUNT,
        maxTimeoutSeconds: 300,
        description: "Security Audit API - Single Request",
        mimeType: "application/json"
      }
    };

    let settleResponse;
    try {
      settleResponse = await axios.post(
        `${FACILITATOR_BASE_URL}/settle`,
        settlePayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X402-Version': '1'
          },
          timeout: 60000 // 60s timeout for on-chain settlement
        }
      );
    } catch (error) {
      console.log('   ✗ Settlement failed');
      console.log(`      Error: ${error.response?.data?.error || error.message}`);
      return res.status(500).json({
        error: 'Settlement failed',
        message: error.response?.data?.error || error.message,
        details: error.response?.data
      });
    }

    const settlement = settleResponse.data;
    
    if (settlement.event === 'payment.settled') {
      console.log('   ✅ Payment settled successfully!');
      console.log(`      Tx Hash: ${settlement.txHash}`);
      console.log(`      Block: ${settlement.blockNumber}`);
      console.log(`      Amount: ${settlement.value} (smallest unit)`);
      console.log(`      From: ${settlement.from}`);
      console.log(`      To: ${settlement.to}`);
      
      // Cache settlement (idempotency)
      if (nonce) {
        settledPayments.set(nonce, settlement);
      }

      // ═══════════════════════════════════════════════════
      // Step 5: Deliver protected resource
      // ═══════════════════════════════════════════════════
      
      return res.json({
        success: true,
        paid: true,
        settlement: {
          txHash: settlement.txHash,
          blockNumber: settlement.blockNumber,
          timestamp: settlement.timestamp,
          from: settlement.from,
          to: settlement.to,
          value: settlement.value,
          network: settlement.network
        },
        data: AUDIT_DATA
      });

    } else {
      console.log('   ✗ Payment settlement failed');
      console.log(`      Event: ${settlement.event}`);
      console.log(`      Error: ${settlement.error}`);
      return res.status(500).json({
        error: 'Settlement failed',
        message: settlement.error,
        details: settlement
      });
    }

  } catch (error) {
    console.log('   ✗ Unexpected error:', error.message);
    console.error(error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /status - Service status (free endpoint)
 */
app.get('/status', (req, res) => {
  res.json({
    service: "Real x402 Security Audit Service",
    status: "operational",
    version: "2.0.0",
    verification: "Cronos x402 Facilitator",
    facilitator: {
      baseUrl: FACILITATOR_BASE_URL,
      network: FACILITATOR_NETWORK,
      usdcContract: USDC_CONTRACT
    },
    endpoints: {
      "/audit": `Security audit (requires x402 payment: ${PAYMENT_AMOUNT} smallest units)`,
      "/status": "Service status (free)"
    },
    pricing: {
      audit: `${PAYMENT_AMOUNT} smallest units (TCRO on testnet)`
    }
  });
});

/**
 * GET /healthcheck - Facilitator health check proxy
 */
app.get('/healthcheck', async (req, res) => {
  try {
    const response = await axios.get(`${FACILITATOR_BASE_URL.replace('/v2/x402', '')}/healthcheck`);
    res.json({
      service: "x402 Audit Service",
      facilitator: response.data
    });
  } catch (error) {
    res.status(503).json({
      service: "x402 Audit Service",
      error: "Facilitator unavailable",
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║  🚀 Real x402 Service with Cronos Facilitator           ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝`);
  console.log(`\n📡 Server: http://localhost:${PORT}`);
  console.log(`   Status: http://localhost:${PORT}/status`);
  console.log(`   Audit (x402): http://localhost:${PORT}/audit`);
  console.log(`\n🔐 Facilitator Integration:`);
  console.log(`   Base URL: ${FACILITATOR_BASE_URL}`);
  console.log(`   Network: ${FACILITATOR_NETWORK}`);
  console.log(`   USDC Contract: ${USDC_CONTRACT}`);
  console.log(`\n💳 Payment Configuration:`);
  console.log(`   Amount: ${PAYMENT_AMOUNT} smallest units`);
  console.log(`   Recipient: ${process.env.SENTINEL_CLAMP_ADDRESS}`);
  console.log(`\n⏳ Waiting for x402 requests...\n`);
});

export default app;
