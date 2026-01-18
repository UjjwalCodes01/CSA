/**
 * X402 Payment Service - Micropayment Protocol for AI Agent Services
 * Handles pay-per-request model for autonomous trading decisions
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// X402 Payment Receiver Contract Address (on Cronos Testnet)
// This is where micropayments will be sent for x402 services
const X402_RECEIVER_ADDRESS = '0x0000000000000000000000000000000000000402'; // x402 protocol address

// X402 Service Pricing (in CRO)
export const PRICING = {
    AI_DECISION: '0.001',           // 0.001 CRO per AI agent decision
    SENTIMENT_ANALYSIS: '0.0005',   // 0.0005 CRO per sentiment analysis
    TRADE_EXECUTION: '0.002',       // 0.002 CRO per trade execution
    MULTI_AGENT_VOTE: '0.0015',     // 0.0015 CRO per council vote
    MARKET_DATA: '0.0003',          // 0.0003 CRO per market data fetch
};

class X402PaymentService {
    constructor() {
        try {
            this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || process.env.CRONOS_TESTNET_RPC);
            
            // Check if private key exists and is valid
            const privateKey = process.env.PRIVATE_KEY;
            if (!privateKey || privateKey.length < 64) {
                console.warn('⚠️  X402 Payment Service: No valid private key found');
                console.warn('   X402 payments will be simulated (dev mode)');
                this.wallet = null;
                this.facilitator = null;
                this.devMode = true;
            } else {
                this.wallet = new ethers.Wallet(privateKey, this.provider);
                this.devMode = false;
                console.log('✅ X402 wallet configured for REAL on-chain payments');
            }
        } catch (error) {
            console.warn('⚠️  X402 Payment Service initialization failed:', error.message);
            console.warn('   Running in dev mode - payments will be simulated');
            this.wallet = null;
            this.facilitator = null;
            this.devMode = true;
        }
        
        this.payments = new Map(); // Track payment history
        this.paymentHistory = []; // Payment log
        this.agentAddress = process.env.AGENT_WALLET_ADDRESS || (this.wallet ? this.wallet.address : 'dev-mode-agent');
        
        // HTTP 402 Protocol Support
        this.pendingPayments = new Map(); // Track pending payment nonces
        this.paymentProofs = new Map(); // Track verified payment proofs
        
        console.log('✅ X402 Payment Service initialized (HTTP 402 Protocol)');
        console.log(`   Agent Address: ${this.agentAddress}`);
        console.log(`   Mode: ${this.devMode ? 'DEVELOPMENT (simulated payments)' : 'PRODUCTION (real x402 payments)'}`);
    }

    /**
     * Generate HTTP 402 Payment Required response
     * @param {string} serviceType - Type of service being requested
     * @param {string} requestId - Unique request identifier
     * @returns {object} 402 response with payment details
     */
    generate402Response(serviceType, requestId = null) {
        const nonce = requestId || `x402_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const amount = PRICING[serviceType];
        
        if (!amount) {
            throw new Error(`Unknown service type: ${serviceType}`);
        }

        const paymentRequest = {
            status: 402,
            message: 'Payment Required',
            payment: {
                nonce,
                amount,
                currency: 'CRO',
                receiver: X402_RECEIVER_ADDRESS,
                serviceType,
                chainId: 338, // Cronos Testnet
                expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
            },
            instructions: 'Send payment transaction to the receiver address with nonce as data, then retry request with payment proof.'
        };

        // Store pending payment
        this.pendingPayments.set(nonce, {
            serviceType,
            amount,
            createdAt: Date.now(),
            expiresAt: paymentRequest.payment.expiresAt
        });

        console.log(`🔒 Generated 402 Payment Required: ${serviceType} (${amount} CRO) - Nonce: ${nonce}`);
        
        return paymentRequest;
    }

    /**
     * Verify payment proof from transaction hash
     * @param {string} nonce - Payment nonce from 402 response
     * @param {string} txHash - Transaction hash as payment proof
     * @returns {boolean} True if payment is valid
     */
    async verifyPaymentProof(nonce, txHash) {
        try {
            // Check if nonce exists
            const pendingPayment = this.pendingPayments.get(nonce);
            if (!pendingPayment) {
                console.log(`❌ Payment verification failed: Unknown nonce ${nonce}`);
                return false;
            }

            // Check if expired
            if (Date.now() > pendingPayment.expiresAt) {
                console.log(`❌ Payment verification failed: Nonce expired ${nonce}`);
                this.pendingPayments.delete(nonce);
                return false;
            }

            // Check if already verified (prevent double-use)
            if (this.paymentProofs.has(nonce)) {
                console.log(`✅ Payment already verified (cached): ${nonce}`);
                return true;
            }

            console.log(`🔍 Verifying payment proof: ${txHash} for nonce: ${nonce}`);

            // Get transaction receipt
            const receipt = await this.provider.getTransactionReceipt(txHash);
            
            if (!receipt) {
                console.log(`❌ Payment verification failed: Transaction not found ${txHash}`);
                return false;
            }

            if (receipt.status !== 1) {
                console.log(`❌ Payment verification failed: Transaction failed ${txHash}`);
                return false;
            }

            // Get transaction details
            const tx = await this.provider.getTransaction(txHash);
            
            if (!tx) {
                console.log(`❌ Payment verification failed: Transaction details not found ${txHash}`);
                return false;
            }

            // Verify receiver address
            if (tx.to.toLowerCase() !== X402_RECEIVER_ADDRESS.toLowerCase()) {
                console.log(`❌ Payment verification failed: Wrong receiver ${tx.to}`);
                return false;
            }

            // Verify payment amount
            const expectedAmount = ethers.parseEther(pendingPayment.amount);
            if (tx.value < expectedAmount) {
                console.log(`❌ Payment verification failed: Insufficient amount ${ethers.formatEther(tx.value)} < ${pendingPayment.amount}`);
                return false;
            }

            // Verify nonce in transaction data (optional but recommended)
            if (tx.data && tx.data !== '0x') {
                const dataStr = ethers.toUtf8String(tx.data);
                if (dataStr !== pendingPayment.serviceType && !dataStr.includes(nonce)) {
                    console.log(`⚠️  Warning: Transaction data mismatch (got: ${dataStr}, expected: ${pendingPayment.serviceType})`);
                }
            }

            // Payment verified! Store proof
            this.paymentProofs.set(nonce, {
                txHash,
                serviceType: pendingPayment.serviceType,
                amount: pendingPayment.amount,
                verifiedAt: Date.now(),
                blockNumber: receipt.blockNumber,
            });

            // Add to payment history
            this.paymentHistory.push({
                id: nonce,
                serviceType: pendingPayment.serviceType,
                cost: pendingPayment.amount,
                transactionHash: txHash,
                blockNumber: receipt.blockNumber,
                timestamp: new Date().toISOString(),
                status: 'verified',
                simulated: false,
            });

            // Clean up pending payment
            this.pendingPayments.delete(nonce);

            console.log(`✅ Payment verified: ${txHash} for ${pendingPayment.serviceType}`);
            
            return true;

        } catch (error) {
            console.error(`❌ Payment verification error:`, error.message);
            return false;
        }
    }

    /**
     * Check if payment is required for service (middleware helper)
     * @param {string} serviceType - Type of service
     * @param {object} req - Express request object
     * @returns {object|null} 402 response if payment required, null if authorized
     */
    checkPaymentRequired(serviceType, req) {
        // Check for payment proof in headers
        const paymentProof = req.headers['x-payment-proof'];
        const paymentNonce = req.headers['x-payment-nonce'];

        if (!paymentProof || !paymentNonce) {
            // No payment proof provided - return 402
            return this.generate402Response(serviceType);
        }

        // Validate payment proof (will be async verified in middleware)
        return null; // Will be handled by verifyPaymentProof
    }

    /**
     * Process x402 payment for AI agent service
     * @param {string} serviceType - Type of service (AI_DECISION, TRADE_EXECUTION, etc.)
     * @param {object} metadata - Additional payment metadata
     * @returns {object} Payment result with transaction hash
     */
    async processPayment(serviceType, metadata = {}) {
        // Dev mode simulation
        if (this.devMode) {
            const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
            const payment = {
                serviceType,
                cost: PRICING[serviceType],
                timestamp: new Date().toISOString(),
                transactionHash: mockTxHash,
                metadata,
                simulated: true
            };
            this.paymentHistory.push(payment);
            console.log(`💳 [DEV MODE] Simulated x402 Payment: ${serviceType} (${PRICING[serviceType]} CRO)`);
            return payment;
        }

        // Real payment processing
        try {
            const amount = PRICING[serviceType];
            if (!amount) {
                throw new Error(`Unknown service type: ${serviceType}`);
            }

            console.log(`💳 Processing x402 payment: ${serviceType} (${amount} CRO)`);

            // Create compact payment identifier (use service type as data)
            // This minimizes gas costs while maintaining on-chain record
            const dataPayload = ethers.toUtf8Bytes(serviceType);

            // Estimate gas needed for transaction with data
            const gasEstimate = await this.provider.estimateGas({
                from: this.wallet.address,
                to: X402_RECEIVER_ADDRESS,
                value: ethers.parseEther(amount),
                data: dataPayload,
            });

            // Add 20% buffer to gas estimate
            const gasLimit = gasEstimate * 120n / 100n;

            console.log(`💡 Gas estimated: ${gasEstimate}, using: ${gasLimit}`);

            // Execute REAL on-chain x402 payment
            // Send micropayment to x402 receiver address
            const tx = await this.wallet.sendTransaction({
                to: X402_RECEIVER_ADDRESS,
                value: ethers.parseEther(amount),
                data: dataPayload,
                gasLimit: gasLimit,
            });

            console.log(`📡 Transaction sent: ${tx.hash}`);
            
            // Wait for confirmation
            const receipt = await tx.wait();

            const payment = {
                id: `x402_${Date.now()}`,
                serviceType,
                cost: amount,
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                timestamp: new Date().toISOString(),
                status: 'confirmed',
                metadata: metadata,  // Store original metadata locally
                simulated: false, // REAL on-chain payment
            };

            // Store payment record
            this.paymentHistory.push(payment);

            console.log(`✅ X402 payment confirmed on-chain: ${receipt.hash}`);
            
            return payment;

        } catch (error) {
            console.error(`❌ X402 payment failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Charge for AI decision making service
     */
    async chargeAIDecision(decisionData) {
        return this.processPayment('AI_DECISION', {
            signal: decisionData.signal,
            sentiment: decisionData.sentiment,
            confidence: decisionData.confidence,
        });
    }

    /**
     * Charge for sentiment analysis service
     */
    async chargeSentimentAnalysis(sources) {
        return this.processPayment('SENTIMENT_ANALYSIS', {
            sources: sources.length,
            timestamp: Date.now(),
        });
    }

    /**
     * Charge for trade execution service
     */
    async chargeTradeExecution(tradeData) {
        return this.processPayment('TRADE_EXECUTION', {
            direction: tradeData.direction,
            amount: tradeData.amount,
            tokenIn: tradeData.tokenIn,
            tokenOut: tradeData.tokenOut,
        });
    }

    /**
     * Charge for multi-agent council vote
     */
    async chargeMultiAgentVote(voteData) {
        return this.processPayment('MULTI_AGENT_VOTE', {
            consensus: voteData.consensus,
            confidence: voteData.confidence,
            agents: voteData.agents,
        });
    }

    /**
     * Charge for market data access
     */
    async chargeMarketData(dataType) {
        return this.processPayment('MARKET_DATA', {
            dataType,
            timestamp: Date.now(),
        });
    }

    /**
     * Get payment history
     */
    getPaymentHistory(limit = 50) {
        return Array.from(this.payments.values())
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    /**
     * Get total payments for service type
     */
    getTotalPayments(serviceType = null) {
        const payments = Array.from(this.payments.values());
        
        if (serviceType) {
            return payments
                .filter(p => p.serviceType === serviceType)
                .reduce((sum, p) => sum + parseFloat(p.amount), 0);
        }
        
        return payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    }

    /**
     * Check if service is authorized (payment successful)
     */
    isAuthorized(paymentResult) {
        return paymentResult && paymentResult.success && paymentResult.authorized;
    }

    /**
     * Get pricing information
     */
    getPricing() {
        return PRICING;
    }

    /**
     * Calculate cost estimate for operation
     */
    estimateCost(operations) {
        let total = 0;
        for (const [service, count] of Object.entries(operations)) {
            if (PRICING[service]) {
                total += parseFloat(PRICING[service]) * count;
            }
        }
        return total.toFixed(6);
    }
}

// Singleton instance
let x402Service = null;

export function getX402Service() {
    if (!x402Service) {
        x402Service = new X402PaymentService();
    }
    return x402Service;
}

export { X402PaymentService };
