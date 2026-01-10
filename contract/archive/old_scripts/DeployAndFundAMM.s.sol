// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {SimpleAMM} from "../src/SimpleAMM.sol";
import {console} from "forge-std/console.sol";

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract DeployAndFundAMM is Script {
    // Testnet addresses from .env
    address constant WCRO = 0x5C7F8a570d578Ed84e63FdFA7b5a2f628d2B4d2A;
    address constant USDC = 0xc21223249CA28397B4B6541dfFaEcC539BfF0c59;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("==============================================");
        console.log("Deploying Simple AMM with Real Liquidity");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("WCRO:", WCRO);
        console.log("USDC:", USDC);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy AMM
        console.log("1. Deploying SimpleAMM...");
        SimpleAMM amm = new SimpleAMM(WCRO, USDC);
        console.log("   AMM deployed at:", address(amm));
        console.log("");
        
        // 2. Check balances
        console.log("2. Checking token balances...");
        uint256 wcroBalance = IERC20(WCRO).balanceOf(deployer);
        uint256 usdcBalance = IERC20(USDC).balanceOf(deployer);
        console.log("   WCRO balance:", wcroBalance / 1e18, "tokens");
        console.log("   USDC balance:", usdcBalance / 1e6, "tokens");
        console.log("");
        
        // 3. Add liquidity (if tokens available)
        if (wcroBalance > 0 && usdcBalance > 0) {
            console.log("3. Adding initial liquidity...");
            
            // Add 10 WCRO and 0.8 USDC (simulates $0.08 per CRO)
            uint256 wcroAmount = 10 * 1e18;  // 10 WCRO
            uint256 usdcAmount = 8 * 1e5;    // 0.8 USDC (6 decimals)
            
            // Use available balance if less than target
            if (wcroBalance < wcroAmount) wcroAmount = wcroBalance;
            if (usdcBalance < usdcAmount) usdcAmount = usdcBalance;
            
            console.log("   Adding", wcroAmount / 1e18, "WCRO");
            console.log("   Adding", usdcAmount / 1e6, "USDC");
            
            // Approve AMM
            IERC20(WCRO).approve(address(amm), wcroAmount);
            IERC20(USDC).approve(address(amm), usdcAmount);
            
            // Add liquidity
            uint256 liquidity = amm.addLiquidity(wcroAmount, usdcAmount);
            console.log("   Liquidity minted:", liquidity);
            console.log("");
            
            // 4. Verify pool state
            console.log("4. Pool state:");
            (uint256 reserveA, uint256 reserveB) = amm.getReserves();
            console.log("   Reserve WCRO:", reserveA / 1e18);
            console.log("   Reserve USDC:", reserveB / 1e6);
            console.log("   Price (USDC per WCRO):", amm.getPrice() / 1e12); // Scaled for 6 decimals
            console.log("");
            
            // 5. Test swap quote
            console.log("5. Testing swap quotes:");
            uint256 swapAmount = 1 * 1e18; // 1 WCRO
            uint256 expectedOut = amm.getAmountOut(WCRO, swapAmount);
            console.log("   1 WCRO -> ", expectedOut / 1e6, "USDC (with 0.3% fee)");
            console.log("");
        } else {
            console.log("3. WARNING: No tokens available to add liquidity");
            console.log("   You need to acquire WCRO and USDC testnet tokens first");
            console.log("");
        }
        
        vm.stopBroadcast();
        
        console.log("==============================================");
        console.log("DEPLOYMENT COMPLETE!");
        console.log("==============================================");
        console.log("SimpleAMM address:", address(amm));
        console.log("");
        console.log("Next steps:");
        console.log("1. Save AMM address to .env as SIMPLE_AMM_ADDRESS");
        console.log("2. Update your agent to use SimpleAMM instead of MockRouter");
        console.log("3. Test swaps with real tokens!");
        console.log("");
    }
}
