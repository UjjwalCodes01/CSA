// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SentinelClamp} from "../src/SentinelClamp.sol";

contract DeploySentinelClamp is Script {
    // Configuration
    uint256 public constant DAILY_LIMIT = 1 ether; // 1 CRO/ETH per day
    
    // Known Cronos testnet addresses
    address public constant VVS_ROUTER_TESTNET = 0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae;
    
    function run() external returns (SentinelClamp) {
        // Get deployment private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy SentinelClamp
        console.log("Deploying SentinelClamp...");
        console.log("Daily Limit:", DAILY_LIMIT);
        
        SentinelClamp sentinel = new SentinelClamp(DAILY_LIMIT);
        
        console.log("SentinelClamp deployed at:", address(sentinel));
        console.log("Owner:", sentinel.owner());
        console.log("Daily Limit:", sentinel.dailyLimit());
        
        // Setup initial configuration
        console.log("\nConfiguring whitelist...");
        
        // Whitelist VVS Router (for DEX trades)
        sentinel.setDappWhitelist(VVS_ROUTER_TESTNET, true);
        console.log("Whitelisted VVS Router:", VVS_ROUTER_TESTNET);
        
        // Get deployment status
        (
            uint256 currentSpent,
            uint256 remaining,
            uint256 timeUntilReset,
            bool isPaused,
            uint256 txCount,
            uint256 x402TxCount
        ) = sentinel.getStatus();
        
        console.log("\nInitial Status:");
        console.log("Current Spent:", currentSpent);
        console.log("Remaining Limit:", remaining);
        console.log("Time Until Reset:", timeUntilReset);
        console.log("Is Paused:", isPaused);
        console.log("Total Transactions:", txCount);
        console.log("x402 Transactions:", x402TxCount);
        console.log("Total Transactions:", txCount);
        
        vm.stopBroadcast();
        
        console.log("\n=== Deployment Complete ===");
        console.log("Add this to your .env file:");
        console.log("SENTINEL_CLAMP_ADDRESS=", address(sentinel));
        
        return sentinel;
    }
}

contract DeploySentinelClampMainnet is Script {
    // Mainnet configuration - higher limit
    uint256 public constant DAILY_LIMIT = 10 ether; // 10 CRO per day
    
    // Known Cronos mainnet addresses
    address public constant VVS_ROUTER_MAINNET = 0x145863Eb42Cf62847A6Ca784e6416C1682b1b2Ae;
    address public constant MOONLANDER = 0x0000000000000000000000000000000000000000; // TODO: Update with actual address
    
    function run() external returns (SentinelClamp) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying SentinelClamp to MAINNET...");
        console.log("WARNING: This is a mainnet deployment!");
        console.log("Daily Limit:", DAILY_LIMIT);
        
        SentinelClamp sentinel = new SentinelClamp(DAILY_LIMIT);
        
        console.log("SentinelClamp deployed at:", address(sentinel));
        
        // Setup mainnet configuration
        sentinel.setDappWhitelist(VVS_ROUTER_MAINNET, true);
        console.log("Whitelisted VVS Router:", VVS_ROUTER_MAINNET);
        
        // Only whitelist Moonlander if address is provided
        if (MOONLANDER != address(0)) {
            sentinel.setDappWhitelist(MOONLANDER, true);
            console.log("Whitelisted Moonlander:", MOONLANDER);
        }
        
        vm.stopBroadcast();
        
        console.log("\n=== Mainnet Deployment Complete ===");
        console.log("SENTINEL_CLAMP_ADDRESS=", address(sentinel));
        
        return sentinel;
    }
}
