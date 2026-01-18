/**
 * X402 Payment Client - Frontend utility for handling HTTP 402 payments
 * Integrates with wagmi for Web3 wallet interactions
 */

import { parseEther } from 'viem';

export interface X402PaymentRequest {
  status: 402;
  message: string;
  payment: {
    nonce: string;
    amount: string;
    currency: string;
    receiver: string;
    serviceType: string;
    chainId: number;
    expiresAt: number;
  };
  instructions: string;
}

export interface X402PaymentResult {
  success: boolean;
  txHash?: string;
  nonce?: string;
  error?: string;
}

/**
 * Handle HTTP 402 Payment Required response
 * Prompts user to make payment and returns payment proof
 */
export async function handleX402Payment(
  paymentRequest: X402PaymentRequest,
  walletClient: any // wagmi walletClient
): Promise<X402PaymentResult> {
  try {
    const { nonce, amount, receiver, serviceType } = paymentRequest.payment;

    console.log(`💳 X402 Payment Required: ${serviceType} (${amount} CRO)`);

    // Prepare transaction
    const tx = {
      to: receiver as `0x${string}`,
      value: parseEther(amount),
      data: `0x${Buffer.from(serviceType).toString('hex')}` as `0x${string}`,
    };

    // Request wallet signature
    const hash = await walletClient.sendTransaction(tx);

    console.log(`✅ Payment sent: ${hash}`);

    return {
      success: true,
      txHash: hash,
      nonce,
    };
  } catch (error: any) {
    console.error('❌ Payment failed:', error);
    return {
      success: false,
      error: error.message || 'Payment transaction failed',
    };
  }
}

/**
 * Make API request with automatic 402 payment handling
 * Retries request with payment proof if 402 received
 */
export async function fetchWithPayment(
  url: string,
  options: RequestInit = {},
  walletClient?: any,
  maxRetries: number = 2
): Promise<Response> {
  let headers = { ...options.headers };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, { ...options, headers });

    // Handle 402 Payment Required
    if (response.status === 402) {
      console.log(`🔒 Payment required for ${url} (attempt ${attempt + 1})`);

      if (!walletClient) {
        throw new Error('Wallet not connected - cannot process x402 payment');
      }

      // Get payment request details
      const paymentRequest: X402PaymentRequest = await response.json();

      // Prompt user and make payment
      const paymentResult = await handleX402Payment(paymentRequest, walletClient);

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      // Update headers with payment proof
      headers = {
        ...headers,
        'x-payment-proof': paymentResult.txHash!,
        'x-payment-nonce': paymentResult.nonce!,
      };

      console.log(`🔄 Retrying request with payment proof...`);
      continue;
    }

    // Request successful
    return response;
  }

  throw new Error('Max retries exceeded for x402 payment');
}

/**
 * React hook for x402 payment handling
 */
export function useX402Payment() {
  const handlePayment = async (
    paymentRequest: X402PaymentRequest,
    walletClient: any
  ): Promise<X402PaymentResult> => {
    return handleX402Payment(paymentRequest, walletClient);
  };

  return { handlePayment };
}
