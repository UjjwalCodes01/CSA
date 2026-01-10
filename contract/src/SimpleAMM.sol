// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

/**
 * @title SimpleAMM
 * @notice Simple Automated Market Maker using x * y = k formula
 * @dev A real DEX that holds and swaps actual tokens
 * 
 * Formula: x * y = k (constant product)
 * - x = reserve of token A
 * - y = reserve of token B  
 * - k = constant (liquidity depth)
 * 
 * Features:
 * - Real token swaps (not mock)
 * - Actual liquidity pool
 * - 0.3% trading fee
 * - Add/remove liquidity
 * - Compatible with SentinelClamp
 */
contract SimpleAMM {
    // Pool state
    address public immutable tokenA;
    address public immutable tokenB;
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public constant FEE_PERCENT = 3; // 0.3% fee (3/1000)
    uint256 public constant FEE_DENOMINATOR = 1000;
    
    // Liquidity tracking
    mapping(address => uint256) public liquidity;
    uint256 public totalLiquidity;
    
    // Events
    event LiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityMinted
    );
    
    event LiquidityRemoved(
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidityBurned
    );
    
    event Swap(
        address indexed trader,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );
    
    constructor(address _tokenA, address _tokenB) {
        require(_tokenA != address(0) && _tokenB != address(0), "Invalid tokens");
        tokenA = _tokenA;
        tokenB = _tokenB;
    }
    
    /**
     * @notice Add liquidity to the pool
     * @dev First liquidity provider sets the initial price ratio
     */
    function addLiquidity(
        uint256 amountA,
        uint256 amountB
    ) external returns (uint256 liquidityMinted) {
        require(amountA > 0 && amountB > 0, "Invalid amounts");
        
        // Transfer tokens from user
        require(
            IERC20(tokenA).transferFrom(msg.sender, address(this), amountA),
            "Transfer A failed"
        );
        require(
            IERC20(tokenB).transferFrom(msg.sender, address(this), amountB),
            "Transfer B failed"
        );
        
        if (totalLiquidity == 0) {
            // First liquidity provider
            liquidityMinted = sqrt(amountA * amountB);
        } else {
            // Subsequent liquidity providers must match ratio
            uint256 liquidityA = (amountA * totalLiquidity) / reserveA;
            uint256 liquidityB = (amountB * totalLiquidity) / reserveB;
            liquidityMinted = liquidityA < liquidityB ? liquidityA : liquidityB;
        }
        
        require(liquidityMinted > 0, "Insufficient liquidity minted");
        
        // Update state
        liquidity[msg.sender] += liquidityMinted;
        totalLiquidity += liquidityMinted;
        reserveA += amountA;
        reserveB += amountB;
        
        emit LiquidityAdded(msg.sender, amountA, amountB, liquidityMinted);
    }
    
    /**
     * @notice Remove liquidity from the pool
     */
    function removeLiquidity(
        uint256 liquidityAmount
    ) external returns (uint256 amountA, uint256 amountB) {
        require(liquidityAmount > 0, "Invalid amount");
        require(liquidity[msg.sender] >= liquidityAmount, "Insufficient liquidity");
        
        // Calculate amounts to return
        amountA = (liquidityAmount * reserveA) / totalLiquidity;
        amountB = (liquidityAmount * reserveB) / totalLiquidity;
        
        require(amountA > 0 && amountB > 0, "Insufficient liquidity burned");
        
        // Update state
        liquidity[msg.sender] -= liquidityAmount;
        totalLiquidity -= liquidityAmount;
        reserveA -= amountA;
        reserveB -= amountB;
        
        // Transfer tokens to user
        require(IERC20(tokenA).transfer(msg.sender, amountA), "Transfer A failed");
        require(IERC20(tokenB).transfer(msg.sender, amountB), "Transfer B failed");
        
        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidityAmount);
    }
    
    /**
     * @notice Swap exact input tokens for output tokens
     * @dev Uses x * y = k formula with 0.3% fee
     */
    function swap(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        address to
    ) external returns (uint256 amountOut) {
        require(tokenIn == tokenA || tokenIn == tokenB, "Invalid token");
        require(amountIn > 0, "Invalid amount");
        require(to != address(0), "Invalid recipient");
        
        bool isTokenA = tokenIn == tokenA;
        address tokenOut = isTokenA ? tokenB : tokenA;
        
        uint256 reserveIn = isTokenA ? reserveA : reserveB;
        uint256 reserveOut = isTokenA ? reserveB : reserveA;
        
        // Calculate output amount with fee
        // amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_PERCENT);
        amountOut = (amountInWithFee * reserveOut) / 
                    (reserveIn * FEE_DENOMINATOR + amountInWithFee);
        
        require(amountOut >= minAmountOut, "Slippage exceeded");
        require(amountOut > 0, "Insufficient output");
        
        // Transfer tokens
        require(
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn),
            "Transfer in failed"
        );
        require(
            IERC20(tokenOut).transfer(to, amountOut),
            "Transfer out failed"
        );
        
        // Update reserves
        if (isTokenA) {
            reserveA += amountIn;
            reserveB -= amountOut;
        } else {
            reserveB += amountIn;
            reserveA -= amountOut;
        }
        
        // Calculate fee for event
        uint256 fee = (amountIn * FEE_PERCENT) / FEE_DENOMINATOR;
        
        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, fee);
    }
    
    /**
     * @notice Get quote for swap
     * @dev Calculate expected output for given input
     */
    function getAmountOut(
        address tokenIn,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        require(tokenIn == tokenA || tokenIn == tokenB, "Invalid token");
        require(amountIn > 0, "Invalid amount");
        
        bool isTokenA = tokenIn == tokenA;
        uint256 reserveIn = isTokenA ? reserveA : reserveB;
        uint256 reserveOut = isTokenA ? reserveB : reserveA;
        
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_PERCENT);
        amountOut = (amountInWithFee * reserveOut) / 
                    (reserveIn * FEE_DENOMINATOR + amountInWithFee);
    }
    
    /**
     * @notice Get pool reserves
     */
    function getReserves() external view returns (uint256, uint256) {
        return (reserveA, reserveB);
    }
    
    /**
     * @notice Get pool price (tokenA per tokenB)
     */
    function getPrice() external view returns (uint256) {
        require(reserveA > 0 && reserveB > 0, "No liquidity");
        return (reserveB * 1e18) / reserveA;
    }
    
    /**
     * @notice Square root function (Babylonian method)
     * @dev Used for liquidity calculation
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
