"use client";

import { useState } from 'react';
import { useWalletClient } from 'wagmi';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X402PaymentRequest, handleX402Payment, X402PaymentResult } from '@/lib/x402-payment';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface X402PaymentDialogProps {
  paymentRequest: X402PaymentRequest;
  onPaymentComplete: (result: X402PaymentResult) => void;
  onCancel: () => void;
}

export function X402PaymentDialog({
  paymentRequest,
  onPaymentComplete,
  onCancel,
}: X402PaymentDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: walletClient } = useWalletClient();

  const handlePay = async () => {
    if (!walletClient) {
      setError('Wallet not connected');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await handleX402Payment(paymentRequest, walletClient);

      if (result.success) {
        onPaymentComplete(result);
      } else {
        setError(result.error || 'Payment failed');
      }
    } catch (err: any) {
      setError(err.message || 'Payment processing error');
    } finally {
      setIsProcessing(false);
    }
  };

  const { payment } = paymentRequest;
  const expiresIn = Math.max(0, Math.floor((payment.expiresAt - Date.now()) / 1000));

  return (
    <Card className="w-full max-w-md mx-auto border-orange-500/20 bg-gray-900/95">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">💳</span>
          Payment Required
        </CardTitle>
        <CardDescription>
          This service requires a micropayment to continue
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Service:</span>
            <span className="font-medium text-white">{payment.serviceType}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Amount:</span>
            <span className="font-bold text-orange-500">
              {payment.amount} {payment.currency}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Network:</span>
            <span className="font-medium text-white">
              Cronos Testnet (Chain ID: {payment.chainId})
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Expires in:</span>
            <span className="font-medium text-white">{expiresIn}s</span>
          </div>
        </div>

        <Alert className="border-blue-500/30 bg-blue-500/10">
          <AlertDescription className="text-xs text-gray-300">
            {paymentRequest.instructions}
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive" className="border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handlePay}
          disabled={isProcessing || !walletClient}
          className="flex-1 bg-orange-600 hover:bg-orange-700"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Pay {payment.amount} {payment.currency}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Status indicator for x402 payment state
 */
interface X402PaymentStatusProps {
  status: 'idle' | 'pending' | 'success' | 'error';
  message?: string;
}

export function X402PaymentStatus({ status, message }: X402PaymentStatusProps) {
  if (status === 'idle') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Alert
        className={`max-w-sm ${
          status === 'success'
            ? 'border-green-500/30 bg-green-500/10'
            : status === 'error'
            ? 'border-red-500/30 bg-red-500/10'
            : 'border-blue-500/30 bg-blue-500/10'
        }`}
      >
        {status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
        {status === 'pending' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
        <AlertDescription>
          {message || `Payment ${status}`}
        </AlertDescription>
      </Alert>
    </div>
  );
}
