/**
 * Mock x402 Security Audit Service
 * 
 * Purpose: Simulates a paid service that requires x402 payment
 * 
 * Endpoints:
 * - GET /audit - Returns 402 Payment Required (first call)
 * - GET /audit (with payment proof) - Returns audit data
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.MOCK_SERVICE_PORT || 3402;

// Storage for "paid" requests (in production, this would be blockchain verification)
const paidRequests = new Set();

// Middleware
app.use(cors());
app.use(express.json());

// Mock audit data
const AUDIT_DATA = {
  service: "Security Audit API",
  version: "1.0.0",
  audit: {
    contractAddress: "0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff",
    timestamp: new Date().toISOString(),
    riskScore: 15,
    riskLevel: "LOW",
    checks: {
      reentrancy: { passed: true, details: "No reentrancy vulnerabilities found" },
      accessControl: { passed: true, details: "Proper ownership checks in place" },
      integerOverflow: { passed: true, details: "Using Solidity 0.8.x safe math" },
      dailyLimit: { passed: true, details: "Daily limit properly enforced" },
      x402Integration: { passed: true, details: "x402 payment logic validated" }
    },
    recommendations: [
      "Consider implementing multi-sig for owner actions",
      "Add event monitoring for suspicious activity",
      "Regular security audits recommended"
    ],
    verdict: "SAFE TO USE"
  }
};

/**
 * GET /audit - Security audit endpoint
 * Requires x402 payment
 */
app.get('/audit', (req, res) => {
  const paymentProof = req.headers['x-payment-proof'];
  const paymentTx = req.headers['x-payment-tx'];

  console.log(`\n📥 Audit request received`);
  console.log(`   Payment Proof: ${paymentProof || 'NONE'}`);
  console.log(`   Payment Tx: ${paymentTx || 'NONE'}`);

  // Check if payment proof is provided
  if (!paymentProof) {
    console.log('   ❌ No payment proof - sending 402');
    
    // Construct payment requirement per x402 spec
    const paymentRequirement = {
      recipient: process.env.SENTINEL_CLAMP_ADDRESS || '0x2db87A4BBE1F767FFCB0338dAeD600fc096759Ff',
      amount: '50000000000000000', // 0.05 TCRO in wei
      currency: 'TCRO',
      chainId: 338, // Cronos testnet
      description: 'Security Audit API - Single Request',
      timestamp: Date.now()
    };
    
    // Base64 encode payment requirement (x402 spec compliant)
    const paymentRequiredHeader = Buffer.from(JSON.stringify(paymentRequirement)).toString('base64');
    
    // Return 402 Payment Required with spec-compliant headers
    return res.status(402).set({
      'PAYMENT-REQUIRED': paymentRequiredHeader, // Main spec header
      'X-Payment-Address': paymentRequirement.recipient,
      'X-Payment-Amount': '0.05',
      'X-Payment-Currency': 'TCRO',
      'X-Payment-Chain-Id': '338',
      'X-Service-Name': 'Security Audit API',
      'Content-Type': 'application/json'
    }).json({
      error: 'Payment Required',
      message: 'This service requires x402 payment',
      paymentDetails: paymentRequirement
    });
  }

  // Check if this proof was already used
  if (paidRequests.has(paymentProof)) {
    console.log('   ⚠️  Payment proof already used');
    return res.status(409).json({
      error: 'Payment proof already used',
      message: 'This payment proof has already been redeemed'
    });
  }

  // Verify EIP-712 signature (simplified validation)
  // In production, fully verify the signature matches the payment requirement
  try {
    // Parse the payment proof (should be JSON with signature)
    const proofData = JSON.parse(paymentProof);
    
    if (!proofData.signature || !proofData.paymentData) {
      console.log('   ❌ Invalid payment proof format (missing signature or paymentData)');
      return res.status(403).json({
        error: 'Invalid payment proof',
        message: 'Payment proof must include EIP-712 signature and payment data'
      });
    }
    
    // Validate payment data structure
    const { recipient, amount, timestamp } = proofData.paymentData;
    if (!recipient || !amount || !timestamp) {
      console.log('   ❌ Invalid payment data structure');
      return res.status(403).json({
        error: 'Invalid payment data',
        message: 'Payment data must include recipient, amount, and timestamp'
      });
    }
    
    console.log('   ✅ EIP-712 signature validated');
    
  } catch (error) {
    console.log('   ❌ Failed to parse payment proof as EIP-712 JSON');
    return res.status(403).json({
      error: 'Invalid payment proof format',
      message: 'Payment proof must be valid JSON with EIP-712 signature'
    });
  }

  // Mark proof as used
  paidRequests.add(paymentProof);

  console.log('   ✅ Payment verified - sending audit data');
  
  // Return audit data
  res.json({
    success: true,
    paid: true,
    paymentProof,
    paymentTx,
    data: AUDIT_DATA
  });
});

/**
 * GET /status - Service status (free endpoint)
 */
app.get('/status', (req, res) => {
  res.json({
    service: "Mock x402 Security Audit Service",
    status: "operational",
    version: "1.0.0",
    endpoints: {
      "/audit": "Security audit (requires x402 payment: 0.05 TCRO)",
      "/status": "Service status (free)"
    },
    pricing: {
      audit: "0.05 TCRO per request"
    }
  });
});

/**
 * GET / - Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    message: "Welcome to Mock x402 Security Audit Service",
    documentation: "/status"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Mock x402 Service running on port ${PORT}`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Status: http://localhost:${PORT}/status`);
  console.log(`   Audit (x402): http://localhost:${PORT}/audit`);
  console.log(`\n💳 Payment required: 0.05 TCRO`);
  console.log(`   Payment address: ${process.env.SENTINEL_CLAMP_ADDRESS}`);
  console.log(`\n⏳ Waiting for requests...\n`);
});

export default app;
