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
   * Create EIP-3009 authorization signature for x402 facilitator
   * 
   * This creates a transferWithAuthorization signature that allows the facilitator
   * to move USDC.e tokens on behalf of the buyer without requiring gas from the buyer.
   * 
   * @param {Object} transferData - Transfer details (to, value, validBefore, etc.)
   * @returns {Object} Payment header data with signature
   */
  async createEIP3009Authorization(transferData) {
    try {
      const { to, value, validAfter = 0, validBefore, nonce } = transferData;
      
      // EIP-712 Domain for USDC.e contract
      const domain = {
        name: 'Bridged USDC (Stargate)',
        version: '1',
        chainId: parseInt(process.env.CHAIN_ID || '338'),
        verifyingContract: process.env.USDC_CONTRACT_ADDRESS
      };

      // EIP-3009 TransferWithAuthorization type
      const types = {
        TransferWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' }
        ]
      };

      const message = {
        from: this.wallet.address,
        to,
        value,
        validAfter,
        validBefore,
        nonce
      };

      // Sign using EIP-712
      const signature = await this.wallet.signTypedData(domain, types, message);

      console.log(`   🔐 EIP-3009 authorization signed: ${signature.substring(0, 20)}...`);

      return {
        from: this.wallet.address,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        signature,
        asset: process.env.USDC_CONTRACT_ADDRESS
      };

    } catch (error) {
      console.error('❌ Failed to create EIP-3009 signature:', error.message);
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
   * Request service with x402 payment handling using real facilitator
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
          
          // Extract payment requirements from response body
          const paymentData = error.response.data;
          const paymentRequirements = paymentData.paymentRequirements;
          
          if (!paymentRequirements) {
            throw new Error('Invalid 402 response: missing paymentRequirements');
          }
          
          console.log(`   📋 Payment Requirements:`);
          console.log(`      Network: ${paymentRequirements.network}`);
          console.log(`      Pay To: ${paymentRequirements.payTo}`);
          console.log(`      Amount: ${paymentRequirements.maxAmountRequired} (smallest unit)`);
          console.log(`      Asset: ${paymentRequirements.asset}`);
          
          // Generate unique nonce for this payment
          const nonce = ethers.hexlify(ethers.randomBytes(32));
          
          // Calculate validBefore (5 minutes from now)
          const validBefore = Math.floor(Date.now() / 1000) + 300;
          
          // Create EIP-3009 authorization
          console.log(`\n   🔐 Creating EIP-3009 authorization...`);
          const authorization = await this.createEIP3009Authorization({
            to: paymentRequirements.payTo,
            value: paymentRequirements.maxAmountRequired,
            validAfter: 0,
            validBefore,
            nonce
          });
          
          // Build payment header (x402 spec)
          const paymentHeader = {
            x402Version: 1,
            scheme: paymentRequirements.scheme,
            network: paymentRequirements.network,
            payload: authorization
          };
          
          // Base64 encode payment header
          const paymentHeaderBase64 = Buffer.from(
            JSON.stringify(paymentHeader)
          ).toString('base64');
          
          console.log(`   📦 Payment header created (Base64 encoded)`);
          
          // Retry request with X-PAYMENT header
          console.log(`\n🔄 Retrying request with payment header...`);
          const paidResponse = await axios.get(serviceUrl, {
            ...options,
            headers: {
              ...options.headers,
              'X-PAYMENT': paymentHeaderBase64
            }
          });
          
          console.log('✅ Service data received with payment!');
          
          // Log settlement info if available
          if (paidResponse.data.settlement) {
            const s = paidResponse.data.settlement;
            console.log(`\n💎 Payment Settled:`);
            console.log(`   Tx Hash: ${s.txHash}`);
            console.log(`   Block: ${s.blockNumber}`);
            console.log(`   From: ${s.from}`);
            console.log(`   To: ${s.to}`);
            console.log(`   Amount: ${s.value} (smallest unit)`);
            console.log(`   Network: ${s.network}`);
          }
          
          return paidResponse.data;
          
        } else {
          // Other error
          throw error;
        }
      }

    } catch (error) {
      console.error('❌ x402 service request failed:', error.message);
      if (error.response?.data) {
        console.error('   Response:', JSON.stringify(error.response.data, null, 2));
      }
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
