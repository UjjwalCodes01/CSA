/**
 * Executioner Agent
 * 
 * Purpose: Handles x402 payments via SentinelClamp
 * 
 * Flow:
 * 1. Agent requests service/data
 * 2. Receives 402 Payment Required
 * 3. Pays via SentinelClamp.checkAndApproveX402()
 * 4. Retries request with payment proof
 * 5. Receives data
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { SENTINEL_CLAMP_ABI } from '../abi/SentinelClamp.js';

dotenv.config();

export class ExecutionerAgent {
  constructor() {
    // Setup provider and wallet
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, this.provider);
    
    // Setup SentinelClamp contract
    this.sentinel = new ethers.Contract(
      process.env.SENTINEL_CLAMP_ADDRESS,
      SENTINEL_CLAMP_ABI,
      this.wallet
    );
    
    console.log(`🤖 Executioner Agent initialized`);
    console.log(`   Wallet: ${this.wallet.address}`);
    console.log(`   Sentinel: ${process.env.SENTINEL_CLAMP_ADDRESS}`);
  }

  /**
   * Check current Sentinel status
   */
  async checkSentinelStatus() {
    try {
      const [currentSpent, remaining, timeUntilReset, isPaused, txCount, x402TxCount] = 
        await this.sentinel.getStatus();
      
      return {
        currentSpent: ethers.formatEther(currentSpent),
        remaining: ethers.formatEther(remaining),
        timeUntilReset: Number(timeUntilReset),
        isPaused,
        txCount: Number(txCount),
        x402TxCount: Number(x402TxCount)
      };
    } catch (error) {
      console.error('❌ Error checking Sentinel status:', error.message);
      throw error;
    }
  }

  /**
   * Create EIP-712 signed payment proof
   * 
   * @param {Object} paymentData - Payment details (recipient, amount, timestamp, etc.)
   * @returns {string} JSON string with signature and payment data
   */
  async createEIP712PaymentProof(paymentData) {
    try {
      // EIP-712 Domain
      const domain = {
        name: 'Cronos x402 Payment',
        version: '1',
        chainId: 338, // Cronos testnet
        verifyingContract: process.env.SENTINEL_CLAMP_ADDRESS
      };

      // EIP-712 Types
      const types = {
        Payment: [
          { name: 'recipient', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'currency', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'timestamp', type: 'uint256' }
        ]
      };

      // Sign the structured data
      const signature = await this.wallet.signTypedData(domain, types, paymentData);

      // Return proof as JSON
      const proof = {
        paymentData,
        signature,
        domain,
        signer: this.wallet.address
      };

      console.log(`   🔐 EIP-712 signature created: ${signature.substring(0, 20)}...`);

      return JSON.stringify(proof);

    } catch (error) {
      console.error('❌ Failed to create EIP-712 signature:', error.message);
      throw error;
    }
  }

  /**
   * Pay for x402 service via SentinelClamp
   * 
   * @param {string} serviceAddress - Address of the service provider
   * @param {string} amountInEther - Payment amount in ether (e.g., "0.01")
   * @param {string} paymentProof - Payment proof/receipt from x402 handshake
   * @returns {Object} Transaction receipt
   */
  async payViaX402(serviceAddress, amountInEther, paymentProof) {
    try {
      console.log(`\n💳 Initiating x402 payment...`);
      console.log(`   Service: ${serviceAddress}`);
      console.log(`   Amount: ${amountInEther} TCRO`);
      console.log(`   Proof: ${paymentProof.substring(0, 20)}...`);

      // Convert amount to wei
      const amountWei = ethers.parseEther(amountInEther);

      // Check Sentinel status before payment
      const statusBefore = await this.checkSentinelStatus();
      console.log(`   📊 Pre-payment status: ${statusBefore.remaining} TCRO remaining`);

      // Call SentinelClamp.checkAndApproveX402()
      const tx = await this.sentinel.checkAndApproveX402(
        serviceAddress,
        amountWei,
        paymentProof
      );

      console.log(`   ⏳ Waiting for confirmation...`);
      console.log(`   Tx: ${tx.hash}`);

      const receipt = await tx.wait();

      console.log(`   ✅ Payment approved by Sentinel!`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas: ${receipt.gasUsed.toString()}`);

      // Check status after payment
      const statusAfter = await this.checkSentinelStatus();
      console.log(`   📊 Post-payment status: ${statusAfter.remaining} TCRO remaining`);
      console.log(`   📈 x402 Transactions: ${statusAfter.x402TxCount}`);

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        statusAfter
      };

    } catch (error) {
      console.error(`❌ Payment failed:`, error.message);
      
      // Check if it's a Sentinel rejection
      if (error.message.includes('Daily limit exceeded')) {
        console.error('   🚫 Sentinel blocked: Daily limit exceeded');
      } else if (error.message.includes('Contract is paused')) {
        console.error('   🚫 Sentinel blocked: Contract paused');
      }
      
      throw error;
    }
  }

  /**
   * Request service with x402 payment handling
   * 
   * @param {string} serviceUrl - URL of the x402 service
   * @param {Object} options - Request options
   * @returns {Object} Service response data
   */
  async requestX402Service(serviceUrl, options = {}) {
    try {
      console.log(`\n🌐 Requesting x402 service: ${serviceUrl}`);

      // Import axios dynamically
      const axios = (await import('axios')).default;

      // First request - expect 402 Payment Required
      let response;
      try {
        response = await axios.get(serviceUrl, options);
        
        // If we got data without payment, service is not x402
        console.log('ℹ️  Service did not require x402 payment');
        return response.data;
        
      } catch (error) {
        // Check for 402 status
        if (error.response && error.response.status === 402) {
          console.log('💰 Service requires payment (402)');
          
          // Extract payment details from PAYMENT-REQUIRED header (x402 spec)
          const paymentRequiredHeader = error.response.headers['payment-required'];
          let paymentDetails;
          
          if (paymentRequiredHeader) {
            // Decode base64 payment requirement
            const decodedPayment = Buffer.from(paymentRequiredHeader, 'base64').toString('utf-8');
            paymentDetails = JSON.parse(decodedPayment);
            console.log('   📋 Decoded PAYMENT-REQUIRED header (x402 spec compliant)');
          } else {
            // Fallback to legacy headers
            paymentDetails = {
              recipient: error.response.headers['x-payment-address'],
              amount: error.response.headers['x-payment-amount'],
              currency: error.response.headers['x-payment-currency'] || 'TCRO',
              chainId: parseInt(error.response.headers['x-payment-chain-id'] || '338'),
              description: 'Service Payment',
              timestamp: Date.now()
            };
          }
          
          console.log(`   Payment Address: ${paymentDetails.recipient}`);
          console.log(`   Payment Amount: ${paymentDetails.amount || ethers.formatEther(paymentDetails.amount)} TCRO`);
          
          // Create EIP-712 signed payment proof
          const paymentData = {
            recipient: paymentDetails.recipient,
            amount: paymentDetails.amount.toString().includes('.') 
              ? ethers.parseEther(paymentDetails.amount).toString() 
              : paymentDetails.amount.toString(),
            currency: paymentDetails.currency,
            description: paymentDetails.description || 'x402 Service Payment',
            timestamp: (paymentDetails.timestamp || Date.now()).toString()
          };
          
          const paymentProof = await this.createEIP712PaymentProof(paymentData);
          
          // Pay via SentinelClamp
          const amountInEther = paymentDetails.amount.toString().includes('.') 
            ? paymentDetails.amount 
            : ethers.formatEther(paymentDetails.amount);
          
          const payment = await this.payViaX402(
            paymentDetails.recipient, 
            amountInEther, 
            paymentProof
          );
          
          // Retry request with payment proof
          console.log(`\n🔄 Retrying request with payment proof...`);
          const paidResponse = await axios.get(serviceUrl, {
            ...options,
            headers: {
              ...options.headers,
              'X-Payment-Proof': paymentProof,
              'X-Payment-Tx': payment.txHash
            }
          });
          
          console.log('✅ Service data received!');
          return paidResponse.data;
          
        } else {
          // Other error
          throw error;
        }
      }

    } catch (error) {
      console.error('❌ x402 service request failed:', error.message);
      throw error;
    }
  }

  /**
   * Get agent wallet balance
   */
  async getBalance() {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }
}

// Export singleton instance
export const executioner = new ExecutionerAgent();
