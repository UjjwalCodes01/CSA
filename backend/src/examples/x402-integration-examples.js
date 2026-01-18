/**
 * Example: How to Apply HTTP 402 Payment Protection to Endpoints
 * 
 * This file demonstrates various ways to integrate x402 payment protocol
 * into your backend API endpoints.
 */

import express from 'express';
import { requireX402Payment, trackX402Payment, x402DevMode } from '../middleware/x402-middleware.js';

const router = express.Router();

// ============================================================================
// EXAMPLE 1: Require Payment for Endpoint
// ============================================================================

/**
 * This endpoint REQUIRES payment before accessing
 * Returns 402 if no valid payment proof provided
 */
router.post('/api/agent/decision',
  requireX402Payment('AI_DECISION'),  // 0.001 CRO required
  (req, res) => {
    // Only executes if payment verified
    const { decision, confidence } = req.body;
    
    // Access payment info from middleware
    console.log('Payment verified:', req.x402Payment);
    
    res.json({
      status: 'success',
      decision,
      confidence,
      payment: req.x402Payment
    });
  }
);

// ============================================================================
// EXAMPLE 2: Track Payments (Optional, Non-Blocking)
// ============================================================================

/**
 * This endpoint tracks payments but doesn't block access
 * Useful for freemium models or analytics
 */
router.post('/api/market/sentiment',
  trackX402Payment('SENTIMENT_ANALYSIS'),  // Tracks but doesn't require
  (req, res) => {
    const { signal, score } = req.body;
    
    // Check if user paid (optional premium features)
    if (req.x402Payment?.verified) {
      console.log('Premium user - payment verified');
      // Provide enhanced data
    } else {
      console.log('Free tier user');
      // Provide basic data
    }
    
    res.json({ signal, score });
  }
);

// ============================================================================
// EXAMPLE 3: Development Mode Bypass
// ============================================================================

/**
 * Use dev mode middleware to bypass payments during development
 * Automatically allows requests when X402_DEV_MODE=true
 */
router.post('/api/test/protected',
  x402DevMode(),  // Bypass in dev mode
  requireX402Payment('AI_DECISION'),
  (req, res) => {
    if (req.x402Payment?.devMode) {
      console.log('Dev mode - payment bypassed');
    }
    
    res.json({ status: 'success' });
  }
);

// ============================================================================
// EXAMPLE 4: Multiple Services, Different Pricing
// ============================================================================

/**
 * Different endpoints with different payment requirements
 */

// Basic sentiment analysis - 0.0005 CRO
router.get('/api/sentiment/basic',
  requireX402Payment('SENTIMENT_ANALYSIS'),
  (req, res) => {
    res.json({ sentiment: 'bullish', confidence: 0.7 });
  }
);

// Advanced AI decision - 0.001 CRO
router.post('/api/ai/decision',
  requireX402Payment('AI_DECISION'),
  (req, res) => {
    res.json({ decision: 'BUY', confidence: 0.85 });
  }
);

// Multi-agent voting - 0.0015 CRO
router.post('/api/council/vote',
  requireX402Payment('MULTI_AGENT_VOTE'),
  (req, res) => {
    res.json({ consensus: 'BUY', votes: [] });
  }
);

// Trade execution - 0.002 CRO
router.post('/api/trade/execute',
  requireX402Payment('TRADE_EXECUTION'),
  (req, res) => {
    res.json({ txHash: '0x123...', status: 'success' });
  }
);

// ============================================================================
// EXAMPLE 5: Conditional Payment Based on Request
// ============================================================================

/**
 * Custom logic to determine if payment is required
 */
router.post('/api/custom/endpoint', async (req, res) => {
  const { premium, requestType } = req.body;
  
  // Only require payment for premium requests
  if (premium) {
    const middleware = requireX402Payment('AI_DECISION');
    return middleware(req, res, () => {
      // Payment verified, proceed with premium processing
      res.json({ premium: true, data: 'enhanced' });
    });
  }
  
  // Free tier - no payment required
  res.json({ premium: false, data: 'basic' });
});

// ============================================================================
// EXAMPLE 6: Manual Payment Check
// ============================================================================

/**
 * Manually check for payment without middleware
 */
router.post('/api/manual/check', async (req, res) => {
  const x402Service = getX402Service();
  
  const paymentProof = req.headers['x-payment-proof'];
  const paymentNonce = req.headers['x-payment-nonce'];
  
  if (!paymentProof || !paymentNonce) {
    // Generate 402 response
    const payment402 = x402Service.generate402Response('AI_DECISION');
    return res.status(402).json(payment402);
  }
  
  // Verify payment
  const isValid = await x402Service.verifyPaymentProof(paymentNonce, paymentProof);
  
  if (!isValid) {
    const payment402 = x402Service.generate402Response('AI_DECISION');
    return res.status(402).json({
      ...payment402,
      error: 'Invalid payment proof'
    });
  }
  
  // Payment verified
  res.json({ status: 'success', paid: true });
});

// ============================================================================
// APPLYING TO EXISTING ENDPOINTS
// ============================================================================

/**
 * To add x402 protection to an existing endpoint:
 * 
 * BEFORE:
 * app.post('/api/endpoint', (req, res) => { ... });
 * 
 * AFTER:
 * import { requireX402Payment } from './middleware/x402-middleware.js';
 * app.post('/api/endpoint', 
 *   requireX402Payment('SERVICE_TYPE'),
 *   (req, res) => { ... }
 * );
 */

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

/**
 * Add to backend/.env:
 * 
 * # X402 Payment Protocol
 * X402_DEV_MODE=false          # Set to true to bypass payments in dev
 * PRIVATE_KEY=0x...            # Wallet private key for payment processing
 * RPC_URL=https://evm-t3.cronos.org
 * 
 * # In development:
 * X402_DEV_MODE=true           # Payments bypassed
 * 
 * # In production:
 * X402_DEV_MODE=false          # Payments enforced
 */

export default router;
