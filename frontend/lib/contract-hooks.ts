// Contract interaction hooks using wagmi
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { SENTINEL_CLAMP_ABI, MOCK_ROUTER_ABI, ERC20_ABI } from './contracts';

// Contract addresses from environment
export const CONTRACTS = {
  sentinelClamp: process.env.NEXT_PUBLIC_SENTINEL_CLAMP_ADDRESS as `0x${string}`,
  mockRouter: process.env.NEXT_PUBLIC_MOCK_ROUTER_ADDRESS as `0x${string}`,
  wcro: process.env.NEXT_PUBLIC_WCRO_ADDRESS as `0x${string}`,
  tusd: process.env.NEXT_PUBLIC_TUSD_ADDRESS as `0x${string}`,
};

// Sentinel Clamp Hooks
export function useSentinelStatus() {
  const { data: status } = useReadContract({
    address: CONTRACTS.sentinelClamp,
    abi: SENTINEL_CLAMP_ABI,
    functionName: 'getStatus',
  });

  const { data: dailyLimit } = useReadContract({
    address: CONTRACTS.sentinelClamp,
    abi: SENTINEL_CLAMP_ABI,
    functionName: 'dailyLimit',
  });

  if (!status || !dailyLimit) {
    return {
      dailyLimit: '0',
      dailySpent: '0',
      remainingLimit: '0',
      totalTransactions: 0,
      x402Transactions: 0,
      canTrade: false,
    };
  }

  const [currentSpent, remaining, , , txCount, x402TxCount] = status as [
    bigint,
    bigint,
    bigint,
    boolean,
    bigint,
    bigint
  ];

  return {
    dailyLimit: formatEther(dailyLimit),
    dailySpent: formatEther(currentSpent),
    remainingLimit: formatEther(remaining),
    totalTransactions: Number(txCount),
    x402Transactions: Number(x402TxCount),
    canTrade: Number(remaining) > 0,
  };
}

export function useSimulateApproval(amount: string) {
  return useReadContract({
    address: CONTRACTS.sentinelClamp,
    abi: SENTINEL_CLAMP_ABI,
    functionName: 'simulateCheck',
    args: [parseEther(amount)],
  });
}

// Token Balance Hooks
export function useTokenBalance(tokenAddress: `0x${string}`, userAddress?: `0x${string}`) {
  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
  });

  const { data: decimals } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
  });

  return {
    balance: balance ? formatEther(balance) : '0',
    decimals: decimals || 18,
    raw: balance,
  };
}

export function useWCROBalance(address?: `0x${string}`) {
  const { data: balance } = useReadContract({
    address: CONTRACTS.wcro,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  const { data: decimals } = useReadContract({
    address: CONTRACTS.wcro,
    abi: ERC20_ABI,
    functionName: 'decimals',
  });

  return {
    balance: balance ? formatEther(balance) : '0',
    decimals: decimals || 18,
    raw: balance,
  };
}

export function useTCROBalance(address?: `0x${string}`) {
  // TCRO is native currency on Cronos, not a token contract
  const { data: balance } = useBalance({
    address: address,
    query: {
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });
  
  return {
    balance: balance ? formatEther(balance.value) : '0',
    decimals: 18,
    raw: balance?.value || BigInt(0),
  };
}

// Swap Hooks
export function useApproveToken() {
  const { writeContract, data: hash, isPending } = useWriteContract();

  const approve = (tokenAddress: `0x${string}`, spender: `0x${string}`, amount: string) => {
    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, parseEther(amount)],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isSuccess,
  };
}

export function useSwapTokens() {
  const { writeContract, data: hash, isPending } = useWriteContract();

  const swap = (
    amountIn: string,
    amountOutMin: string,
    path: `0x${string}`[],
    to: `0x${string}`,
    deadline: bigint
  ) => {
    writeContract({
      address: CONTRACTS.mockRouter,
      abi: MOCK_ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [parseEther(amountIn), parseEther(amountOutMin), path, to, deadline],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    swap,
    hash,
    isPending,
    isConfirming,
    isSuccess,
  };
}

// Get expected swap output
export function useGetAmountsOut(amountIn: string, path: `0x${string}`[]) {
  return useReadContract({
    address: CONTRACTS.mockRouter,
    abi: MOCK_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: [parseEther(amountIn), path],
  });
}
// WCRO Wrap/Unwrap Hooks
export function useWrapCRO() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();

  const wrap = (amount: string) => {
    console.log('🔧 useWrapCRO.wrap() called with:', {
      amount,
      wcroAddress: CONTRACTS.wcro,
      valueWei: parseEther(amount).toString()
    });
    
    if (!CONTRACTS.wcro) {
      console.error('❌ WCRO address not configured!');
      throw new Error('WCRO address not configured');
    }
    
    writeContract({
      address: CONTRACTS.wcro,
      abi: [
        {
          inputs: [],
          name: 'deposit',
          outputs: [],
          stateMutability: 'payable',
          type: 'function',
        },
      ],
      functionName: 'deposit',
      value: parseEther(amount),
    });
    
    console.log('📤 writeContract called for deposit');
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    wrap,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError,
  };
}

export function useUnwrapWCRO() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();

  const unwrap = (amount: string) => {
    writeContract({
      address: CONTRACTS.wcro,
      abi: [
        {
          inputs: [{ internalType: 'uint256', name: 'wad', type: 'uint256' }],
          name: 'withdraw',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ],
      functionName: 'withdraw',
      args: [parseEther(amount)],
    });
  };

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    unwrap,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError,
  };
}