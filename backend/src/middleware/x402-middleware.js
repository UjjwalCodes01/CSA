/**
 * X402 Middleware - HTTP 402 Payment Required Protocol
 * Protects API endpoints with x402 micropayments
 */

import { getX402Service } from '../services/x402-payment-service.js';

/**
 * Middleware to require x402 payment for endpoint access
 * @param {string} serviceType - Type of service requiring payment
 * @returns {Function} Express middleware function
 */
export function requireX402Payment(serviceType) {
    return async (req, res, next) => {
        try {
            const x402Service = getX402Service();
            
            // Check for payment proof in headers
            const paymentProof = req.headers['x-payment-proof'];
            const paymentNonce = req.headers['x-payment-nonce'];

            // If no payment proof provided, return 402 Payment Required
            if (!paymentProof || !paymentNonce) {
                const payment402 = x402Service.generate402Response(serviceType);
                return res.status(402).json(payment402);
            }

            // Verify payment proof
            const isValid = await x402Service.verifyPaymentProof(paymentNonce, paymentProof);
            
            if (!isValid) {
                // Payment proof invalid - return 402 with new nonce
                const payment402 = x402Service.generate402Response(serviceType);
                return res.status(402).json({
                    ...payment402,
                    error: 'Invalid or expired payment proof. New payment required.'
                });
            }

            // Payment verified - allow request to proceed
            console.log(`✅ X402 Payment verified for ${serviceType} - Request authorized`);
            req.x402Payment = {
                nonce: paymentNonce,
                proof: paymentProof,
                serviceType,
                verified: true
            };
            
            next();

        } catch (error) {
            console.error('❌ X402 middleware error:', error);
            res.status(500).json({
                error: 'Payment verification failed',
                message: error.message
            });
        }
    };
}

/**
 * Optional middleware - logs x402 payments but doesn't block requests
 * Useful for endpoints that should track payments but remain accessible
 */
export function trackX402Payment(serviceType) {
    return async (req, res, next) => {
        try {
            const x402Service = getX402Service();
            const paymentProof = req.headers['x-payment-proof'];
            const paymentNonce = req.headers['x-payment-nonce'];

            if (paymentProof && paymentNonce) {
                const isValid = await x402Service.verifyPaymentProof(paymentNonce, paymentProof);
                req.x402Payment = {
                    nonce: paymentNonce,
                    proof: paymentProof,
                    serviceType,
                    verified: isValid
                };
                
                if (isValid) {
                    console.log(`📊 X402 Payment tracked: ${serviceType}`);
                }
            } else {
                req.x402Payment = { verified: false };
            }
            
            next();
        } catch (error) {
            console.error('❌ X402 tracking error:', error);
            next(); // Continue even if tracking fails
        }
    };
}

/**
 * Middleware to handle 402 responses in development mode
 * Automatically approves payments when in dev mode
 */
export function x402DevMode() {
    return (req, res, next) => {
        if (process.env.NODE_ENV === 'development' || process.env.X402_DEV_MODE === 'true') {
            // In dev mode, bypass payment verification
            req.x402Payment = {
                verified: true,
                devMode: true
            };
            console.log('🔓 X402 Dev Mode: Payment bypassed');
        }
        next();
    };
}

export default {
    requireX402Payment,
    trackX402Payment,
    x402DevMode
};
