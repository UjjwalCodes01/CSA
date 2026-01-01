// SentinelClamp ABI - only the functions we need
export const SENTINEL_CLAMP_ABI = [
  "function checkAndApproveX402(address dapp, uint256 amount, string memory paymentProof) external returns (bool)",
  "function getStatus() external view returns (uint256 currentSpent, uint256 remaining, uint256 timeUntilReset, bool isPaused, uint256 txCount, uint256 x402TxCount)",
  "function dailyLimit() external view returns (uint256)",
  "function dailySpent() external view returns (uint256)",
  "function x402Transactions() external view returns (uint256)"
];
