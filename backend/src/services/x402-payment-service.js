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
        
        console.log('✅ X402 Payment Service initialized');
        console.log(`   Agent Address: ${this.agentAddress}`);
        console.log(`   Mode: ${this.devMode ? 'DEVELOPMENT (simulated payments)' : 'PRODUCTION (real x402 payments)'}`);
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
