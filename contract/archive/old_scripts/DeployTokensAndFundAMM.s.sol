// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {TestToken} from "../src/TestToken.sol";
import {SimpleAMM} from "../src/SimpleAMM.sol";
import {console} from "forge-std/console.sol";

contract DeployTokensAndFundAMM is Script {
    address constant AMM_ADDRESS = 0x13354a475d641b227faBC3704EB27987Acf5A0f7;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("==============================================");
        console.log("Deploy Test Tokens & Fund AMM Pool");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("AMM Address:", AMM_ADDRESS);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy Test Tokens
        console.log("1. Deploying test tokens...");
        
        TestToken cronos = new TestToken("Test CRO", "tCRO", 1000000 * 1e18); // 1M tokens
        TestToken usd = new TestToken("Test USD", "tUSD", 1000000 * 1e18);   // 1M tokens
        
        console.log("   tCRO deployed:", address(cronos));
        console.log("   tUSD deployed:", address(usd));
        console.log("");
        
        // 2. Deploy NEW AMM with correct tokens
        console.log("2. Deploying new AMM with test tokens...");
        SimpleAMM amm = new SimpleAMM(address(cronos), address(usd));
        console.log("   New AMM deployed:", address(amm));
        console.log("");
        
        // 3. Add liquidity
        console.log("3. Adding initial liquidity...");
        
        uint256 croAmount = 1000 * 1e18;  // 1000 tCRO
        uint256 usdAmount = 80 * 1e18;    // 80 tUSD (simulates $0.08 per CRO)
        
        console.log("   Adding", croAmount / 1e18, "tCRO");
        console.log("   Adding", usdAmount / 1e18, "tUSD");
        
        // Approve AMM
        cronos.approve(address(amm), croAmount);
        usd.approve(address(amm), usdAmount);
        
        // Add liquidity
        uint256 liquidity = amm.addLiquidity(croAmount, usdAmount);
        console.log("   Liquidity minted:", liquidity);
        console.log("");
        
        // 4. Verify pool state
        console.log("4. Pool state:");
        (uint256 reserveA, uint256 reserveB) = amm.getReserves();
        console.log("   Reserve tCRO:", reserveA / 1e18);
        console.log("   Reserve tUSD:", reserveB / 1e18);
        console.log("   Price (USD per CRO):", amm.getPrice() / 1e18);
        console.log("");
        
        // 5. Test swap quote
        console.log("5. Testing swap quotes:");
        uint256 swapAmount = 10 * 1e18; // 10 tCRO
        uint256 expectedOut = amm.getAmountOut(address(cronos), swapAmount);
        console.log("   10 tCRO -> ", expectedOut / 1e18, "tUSD (with 0.3% fee)");
        console.log("");
        
        // 6. Transfer some tokens to agent for trading
        console.log("6. Transferring tokens to agent wallet...");
        uint256 agentAmount = 100 * 1e18; // 100 of each token
        cronos.transfer(deployer, agentAmount);
        usd.transfer(deployer, agentAmount);
        console.log("   Sent", agentAmount / 1e18, "tCRO to agent");
        console.log("   Sent", agentAmount / 1e18, "tUSD to agent");
        console.log("");
        
        vm.stopBroadcast();
        
        console.log("==============================================");
        console.log("DEPLOYMENT COMPLETE!");
        console.log("==============================================");
        console.log("tCRO address:", address(cronos));
        console.log("tUSD address:", address(usd));
        console.log("SimpleAMM address:", address(amm));
        console.log("");
        console.log("Pool is FUNDED and ready to trade!");
        console.log("Your agent now has 100 tCRO and 100 tUSD for trading");
        console.log("");
        console.log("Add to .env:");
        console.log("SIMPLE_AMM_ADDRESS=", address(amm));
        console.log("TEST_CRO_ADDRESS=", address(cronos));
        console.log("TEST_USD_ADDRESS=", address(usd));
        console.log("");
    }
}
