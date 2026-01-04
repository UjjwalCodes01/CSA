// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockRouter} from "../src/MockRouter.sol";

contract DeployMockRouter is Script {
    // WCRO address on Cronos Testnet (standard across networks)
    address public constant WCRO_TESTNET = 0x5C7F8A570d578ED84E63fdFA7b5A2f628d2b4D2a;
    
    // USDC.e address on Cronos Testnet
    address public constant USDC_TESTNET = 0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0;
    
    function run() external returns (MockRouter) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying MockRouter to Cronos Testnet...");
        console.log("WCRO Address:", WCRO_TESTNET);
        
        MockRouter router = new MockRouter(WCRO_TESTNET);
        
        console.log("MockRouter deployed at:", address(router));
        
        // Set some initial mock prices for common pairs
        console.log("\nSetting mock prices...");
        
        // WCRO -> USDC.e rate: 1 WCRO = 0.08 USDC
        // 1e18 (WCRO decimals) -> 80000 (USDC with 6 decimals = $0.08)
        router.setMockPrice(WCRO_TESTNET, USDC_TESTNET, 80000);
        console.log("Set WCRO -> USDC.e: 1 WCRO = 0.08 USDC");
        
        // USDC.e -> WCRO rate: 1 USDC = 12.5 WCRO (inverse)
        router.setMockPrice(USDC_TESTNET, WCRO_TESTNET, 12.5e18);
        console.log("Set USDC.e -> WCRO: 1 USDC = 12.5 WCRO");
        
        vm.stopBroadcast();
        
        console.log("\n=== Deployment Complete ===");
        console.log("Add this to backend/.env:");
        console.log("MOCK_ROUTER_ADDRESS=", address(router));
        console.log("\nUsage:");
        console.log("- Set EXECUTION_MODE=mock in .env");
        console.log("- Run demos with npm run swap:approved");
        
        return router;
    }
}
