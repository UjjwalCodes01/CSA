// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {TestToken} from "../src/TestToken.sol";
import {console} from "forge-std/console.sol";

contract DeployTestTokens is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("==============================================");
        console.log("Deploying Test Tokens (Step 1 of 2)");
        console.log("==============================================");
        console.log("Deployer:", deployer);
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Token A (Test CRO)
        console.log("1. Deploying Test CRO (tCRO)...");
        TestToken tCRO = new TestToken("Test Cronos", "tCRO", 1000000 * 1e18);
        console.log("   tCRO deployed:", address(tCRO));
        console.log("   Total Supply:", tCRO.totalSupply() / 1e18, "tokens");
        console.log("");
        
        // Deploy Token B (Test USD)
        console.log("2. Deploying Test USD (tUSD)...");
        TestToken tUSD = new TestToken("Test USD", "tUSD", 1000000 * 1e18);
        console.log("   tUSD deployed:", address(tUSD));
        console.log("   Total Supply:", tUSD.totalSupply() / 1e18, "tokens");
        console.log("");
        
        vm.stopBroadcast();
        
        console.log("==============================================");
        console.log("STEP 1 COMPLETE!");
        console.log("==============================================");
        console.log("tCRO address:", address(tCRO));
        console.log("tUSD address:", address(tUSD));
        console.log("");
        console.log("Next: Run DeploySimpleAMM script with these addresses");
        console.log("");
    }
}
