// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {MockRouter} from "../src/MockRouter.sol";

contract MockRouterTest is Test {
    MockRouter public router;
    
    address public wcro = makeAddr("wcro");
    address public usdc = makeAddr("usdc");
    address public agent = makeAddr("agent");
    address public user = makeAddr("user");
    
    uint256 constant MOCK_RATE = 80000; // 1 WCRO = 0.08 USDC
    
    function setUp() public {
        router = new MockRouter(wcro);
        
        // Set mock price
        router.setMockPrice(wcro, usdc, MOCK_RATE);
    }
    
    function test_Deployment() public view {
        assertEq(router.WETH(), wcro);
        assertEq(router.totalMockTrades(), 0);
    }
    
    function test_GetAmountsOut() public view {
        address[] memory path = new address[](2);
        path[0] = wcro;
        path[1] = usdc;
        
        uint256 amountIn = 1 ether; // 1 WCRO
        uint256[] memory amounts = router.getAmountsOut(amountIn, path);
        
        assertEq(amounts[0], amountIn);
        assertEq(amounts[1], (amountIn * MOCK_RATE) / 1e18);
    }
    
    function test_SwapExactTokensForTokens() public {
        address[] memory path = new address[](2);
        path[0] = wcro;
        path[1] = usdc;
        
        uint256 amountIn = 0.5 ether;
        uint256 minOut = 0;
        uint256 deadline = block.timestamp + 100;
        
        vm.prank(agent);
        uint256[] memory amounts = router.swapExactTokensForTokens(
            amountIn,
            minOut,
            path,
            user,
            deadline
        );
        
        assertEq(amounts.length, 2);
        assertEq(router.totalMockTrades(), 1);
        assertEq(router.agentTradeCount(agent), 1);
    }
    
    function test_RevertWhen_Expired() public {
        address[] memory path = new address[](2);
        path[0] = wcro;
        path[1] = usdc;
        
        uint256 deadline = block.timestamp - 1;
        
        vm.expectRevert("MockRouter: EXPIRED");
        vm.prank(agent);
        router.swapExactTokensForTokens(
            1 ether,
            0,
            path,
            user,
            deadline
        );
    }
    
    function test_RevertWhen_InsufficientOutput() public {
        address[] memory path = new address[](2);
        path[0] = wcro;
        path[1] = usdc;
        
        uint256 amountIn = 1 ether;
        uint256 expectedOut = (amountIn * MOCK_RATE) / 1e18;
        uint256 minOut = expectedOut + 1; // Require more than possible
        
        vm.expectRevert("MockRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        vm.prank(agent);
        router.swapExactTokensForTokens(
            amountIn,
            minOut,
            path,
            user,
            block.timestamp + 100
        );
    }
    
    function test_SwapExactETHForTokens() public {
        address[] memory path = new address[](2);
        path[0] = wcro; // Must start with WETH
        path[1] = usdc;
        
        uint256 amountIn = 0.1 ether;
        
        vm.deal(agent, amountIn);
        vm.prank(agent);
        uint256[] memory amounts = router.swapExactETHForTokens{value: amountIn}(
            0,
            path,
            user,
            block.timestamp + 100
        );
        
        assertEq(amounts[0], amountIn);
        assertEq(router.totalMockTrades(), 1);
    }
    
    function test_SimulateSwap() public {
        address[] memory path = new address[](2);
        path[0] = wcro;
        path[1] = usdc;
        
        vm.prank(agent);
        (bool success, uint256 expectedOut, string memory reason) = 
            router.simulateSwap(1 ether, 0, path, user);
        
        assertTrue(success);
        assertGt(expectedOut, 0);
        assertEq(reason, "Would succeed");
    }
    
    function test_GetStats() public {
        address[] memory path = new address[](2);
        path[0] = wcro;
        path[1] = usdc;
        
        // Execute multiple trades
        vm.startPrank(agent);
        router.swapExactTokensForTokens(
            0.5 ether,
            0,
            path,
            user,
            block.timestamp + 100
        );
        router.swapExactTokensForTokens(
            0.3 ether,
            0,
            path,
            user,
            block.timestamp + 100
        );
        vm.stopPrank();
        
        (uint256 trades, uint256 volume) = router.getRouterStats();
        assertEq(trades, 2);
        assertEq(volume, 0.8 ether);
        
        (uint256 agentTrades, uint256 agentVol) = router.getAgentStats(agent);
        assertEq(agentTrades, 2);
        assertEq(agentVol, 0.8 ether);
    }
}
