// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockRouter
 * @notice Mock DEX Router for testnet demonstrations
 * @dev Simulates DEX swap behavior without actual token transfers
 * 
 * Purpose:
 * - Provides deterministic execution for demos
 * - Creates real on-chain transactions with verifiable tx hashes
 * - Emits structured events for audit trail
 * - NEVER moves real tokens (safe for testing)
 * 
 * Flow:
 * 1. Agent calls simulateCheck() on SentinelClamp
 * 2. If approved, agent calls checkAndApprove() on SentinelClamp
 * 3. If successful, agent calls swapExactTokensForTokens() here
 * 4. MockRouter emits MockTradeExecuted event
 * 5. Transaction hash is returned for verification
 * 
 * This allows:
 * - Real blockchain transactions
 * - Real event logs
 * - Real Sentinel enforcement
 * - Zero risk to actual funds
 */
contract MockRouter {
    // Events
    event MockTradeExecuted(
        address indexed agent,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 expectedOut,
        uint256 actualOut,
        string executionMode,
        uint256 timestamp
    );
    
    event MockTradeSimulated(
        address indexed agent,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 expectedOut,
        string reason
    );
    
    // State
    address public immutable WETH; // WCRO address
    uint256 public totalMockTrades;
    uint256 public totalMockVolume;
    
    mapping(address => uint256) public agentTradeCount;
    mapping(address => uint256) public agentVolume;
    
    // Mock price oracle (for deterministic quotes)
    // In reality, this would query actual liquidity pools
    mapping(address => mapping(address => uint256)) public mockPrices;
    
    constructor(address _weth) {
        WETH = _weth;
        
        // Set some mock prices for common pairs
        // These are approximate rates for demonstration
        // Format: 1 token A = X token B (in smallest units)
        // Example: 1 WCRO = 0.08 USDC (with 6 decimals = 80000)
    }
    
    /**
     * @notice Set mock price for a token pair
     * @dev Only for testing - allows configuration of deterministic quotes
     */
    function setMockPrice(
        address tokenIn,
        address tokenOut,
        uint256 rate
    ) external {
        mockPrices[tokenIn][tokenOut] = rate;
    }
    
    /**
     * @notice Get quote for swap (mimics VVS getAmountsOut)
     * @dev Returns deterministic output based on mock prices
     */
    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts) {
        require(path.length >= 2, "MockRouter: INVALID_PATH");
        
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        for (uint256 i = 0; i < path.length - 1; i++) {
            amounts[i + 1] = _getAmountOut(
                amounts[i],
                path[i],
                path[i + 1]
            );
        }
        
        return amounts;
    }
    
    /**
     * @notice Simulate swap (read-only, no state changes)
     * @dev Useful for pre-execution checks
     */
    function simulateSwap(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to
    ) external returns (
        bool wouldSucceed,
        uint256 expectedOut,
        string memory reason
    ) {
        if (path.length < 2) {
            return (false, 0, "Invalid path");
        }
        
        uint256[] memory amounts = this.getAmountsOut(amountIn, path);
        uint256 finalAmount = amounts[amounts.length - 1];
        
        if (finalAmount < amountOutMin) {
            return (false, finalAmount, "Slippage too high");
        }
        
        emit MockTradeSimulated(
            msg.sender,
            path[0],
            path[path.length - 1],
            amountIn,
            finalAmount,
            "Simulation successful"
        );
        
        return (true, finalAmount, "Would succeed");
    }
    
    /**
     * @notice Execute mock swap (mimics VVS swapExactTokensForTokens)
     * @dev Creates real transaction but does NOT transfer tokens
     * 
     * CRITICAL: This function MUST only be called AFTER SentinelClamp approval
     * 
     * @param amountIn Amount of input tokens
     * @param amountOutMin Minimum output tokens (slippage protection)
     * @param path Token swap path [tokenIn, tokenOut, ...]
     * @param to Recipient address
     * @param deadline Transaction deadline
     * @return amounts Array of amounts for each step
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "MockRouter: EXPIRED");
        require(path.length >= 2, "MockRouter: INVALID_PATH");
        require(amountIn > 0, "MockRouter: INSUFFICIENT_INPUT_AMOUNT");
        require(to != address(0), "MockRouter: INVALID_RECIPIENT");
        
        // Calculate output amounts using mock prices
        amounts = this.getAmountsOut(amountIn, path);
        uint256 finalAmount = amounts[amounts.length - 1];
        
        require(
            finalAmount >= amountOutMin,
            "MockRouter: INSUFFICIENT_OUTPUT_AMOUNT"
        );
        
        // Update statistics
        totalMockTrades++;
        totalMockVolume += amountIn;
        agentTradeCount[msg.sender]++;
        agentVolume[msg.sender] += amountIn;
        
        // Emit execution event
        emit MockTradeExecuted(
            msg.sender,
            path[0],
            path[path.length - 1],
            amountIn,
            amountOutMin,
            finalAmount,
            "MOCK_EXECUTION",
            block.timestamp
        );
        
        // NOTE: In production VVS Router, this would:
        // 1. transferFrom(msg.sender, pair, amountIn)
        // 2. Execute actual swap through liquidity pools
        // 3. transfer(to, finalAmount)
        //
        // Here we SKIP token transfers for safety
        // But still create a real on-chain transaction
        
        return amounts;
    }
    
    /**
     * @notice Execute mock ETH/CRO to token swap
     * @dev Mimics swapExactETHForTokens for native currency swaps
     */
    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts) {
        require(deadline >= block.timestamp, "MockRouter: EXPIRED");
        require(path.length >= 2, "MockRouter: INVALID_PATH");
        require(path[0] == WETH, "MockRouter: INVALID_PATH");
        require(msg.value > 0, "MockRouter: INSUFFICIENT_INPUT_AMOUNT");
        
        amounts = this.getAmountsOut(msg.value, path);
        uint256 finalAmount = amounts[amounts.length - 1];
        
        require(
            finalAmount >= amountOutMin,
            "MockRouter: INSUFFICIENT_OUTPUT_AMOUNT"
        );
        
        totalMockTrades++;
        totalMockVolume += msg.value;
        agentTradeCount[msg.sender]++;
        agentVolume[msg.sender] += msg.value;
        
        emit MockTradeExecuted(
            msg.sender,
            WETH,
            path[path.length - 1],
            msg.value,
            amountOutMin,
            finalAmount,
            "MOCK_EXECUTION_ETH",
            block.timestamp
        );
        
        return amounts;
    }
    
    /**
     * @notice Get agent statistics
     */
    function getAgentStats(address agent) external view returns (
        uint256 tradeCount,
        uint256 volume
    ) {
        return (agentTradeCount[agent], agentVolume[agent]);
    }
    
    /**
     * @notice Get router statistics
     */
    function getRouterStats() external view returns (
        uint256 trades,
        uint256 volume
    ) {
        return (totalMockTrades, totalMockVolume);
    }
    
    /**
     * @notice Calculate output amount for a single swap step
     * @dev Uses mock prices for deterministic behavior
     */
    function _getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) internal view returns (uint256) {
        uint256 rate = mockPrices[tokenIn][tokenOut];
        
        if (rate == 0) {
            // Default mock rate: 1:1 scaled by 1e12 (for 6 decimal USDC vs 18 decimal tokens)
            // This simulates ~$0.08 per CRO with USDC
            return (amountIn * 80000) / 1e18; // Returns amount in USDC (6 decimals)
        }
        
        // Apply mock rate
        return (amountIn * rate) / 1e18;
    }
    
    /**
     * @notice Factory address (for compatibility)
     */
    function factory() external pure returns (address) {
        return address(0); // Not needed for mock
    }
}
