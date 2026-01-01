// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {SentinelClamp} from "../src/SentinelClamp.sol";

contract SentinelClampTest is Test {
    SentinelClamp public sentinel;
    
    address public owner;
    address public agent1;
    address public agent2;
    address public dapp1;
    address public dapp2;
    address public unauthorizedAgent;
    
    uint256 public constant DAILY_LIMIT = 1 ether;
    uint256 public constant SMALL_AMOUNT = 0.1 ether;
    uint256 public constant LARGE_AMOUNT = 2 ether;
    
    event TransactionApproved(
        address indexed agent,
        address indexed dapp,
        uint256 amount,
        uint256 remainingLimit,
        string reason
    );
    
    event TransactionBlocked(
        address indexed agent,
        address indexed dapp,
        uint256 amount,
        string reason
    );
    
    event DappWhitelisted(address indexed dapp, bool status);
    event AgentAuthorized(address indexed agent, bool status);
    event DailyLimitUpdated(uint256 oldLimit, uint256 newLimit);
    event EmergencyPause(address indexed by, uint256 timestamp);
    event LimitReset(uint256 timestamp, uint256 previousSpent);
    
    function setUp() public {
        owner = address(this);
        agent1 = makeAddr("agent1");
        agent2 = makeAddr("agent2");
        dapp1 = makeAddr("dapp1");
        dapp2 = makeAddr("dapp2");
        unauthorizedAgent = makeAddr("unauthorizedAgent");
        
        // Deploy contract
        sentinel = new SentinelClamp(DAILY_LIMIT);
        
        // Setup initial state
        sentinel.setAgentAuthorization(agent1, true);
        sentinel.setDappWhitelist(dapp1, true);
    }
    
    /*//////////////////////////////////////////////////////////////
                            DEPLOYMENT TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_Deployment() public {
        assertEq(sentinel.owner(), owner);
        assertEq(sentinel.dailyLimit(), DAILY_LIMIT);
        assertEq(sentinel.dailySpent(), 0);
        assertEq(sentinel.paused(), false);
        assertTrue(sentinel.authorizedAgents(owner)); // Owner auto-authorized
    }
    
    function test_RevertWhen_DeploymentWithZeroLimit() public {
        vm.expectRevert("SentinelClamp: Daily limit too low");
        new SentinelClamp(0);
    }
    
    /*//////////////////////////////////////////////////////////////
                        AUTHORIZATION TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_AgentAuthorization() public {
        assertTrue(sentinel.authorizedAgents(agent1));
        assertFalse(sentinel.authorizedAgents(agent2));
        
        // Authorize agent2
        vm.expectEmit(true, true, true, true);
        emit AgentAuthorized(agent2, true);
        sentinel.setAgentAuthorization(agent2, true);
        
        assertTrue(sentinel.authorizedAgents(agent2));
        
        // Revoke agent2
        sentinel.setAgentAuthorization(agent2, false);
        assertFalse(sentinel.authorizedAgents(agent2));
    }
    
    function test_RevertWhen_UnauthorizedAgentChecks() public {
        vm.prank(unauthorizedAgent);
        vm.expectRevert("SentinelClamp: Unauthorized agent");
        sentinel.checkAndApprove(dapp1, SMALL_AMOUNT);
    }
    
    function test_OnlyOwnerCanAuthorizeAgents() public {
        vm.prank(agent1);
        vm.expectRevert("SentinelClamp: Only owner");
        sentinel.setAgentAuthorization(agent2, true);
    }
    
    /*//////////////////////////////////////////////////////////////
                        WHITELIST TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_DappWhitelisting() public {
        assertTrue(sentinel.whitelistedDapps(dapp1));
        assertFalse(sentinel.whitelistedDapps(dapp2));
        
        // Whitelist dapp2
        vm.expectEmit(true, true, true, true);
        emit DappWhitelisted(dapp2, true);
        sentinel.setDappWhitelist(dapp2, true);
        
        assertTrue(sentinel.whitelistedDapps(dapp2));
        
        // Remove dapp1
        sentinel.setDappWhitelist(dapp1, false);
        assertFalse(sentinel.whitelistedDapps(dapp1));
    }
    
    function test_BatchWhitelisting() public {
        address[] memory dapps = new address[](2);
        dapps[0] = dapp2;
        dapps[1] = makeAddr("dapp3");
        
        sentinel.batchSetDappWhitelist(dapps, true);
        
        assertTrue(sentinel.whitelistedDapps(dapp2));
        assertTrue(sentinel.whitelistedDapps(dapps[1]));
    }
    
    function test_RevertWhen_WhitelistingZeroAddress() public {
        vm.expectRevert("SentinelClamp: Invalid dApp address");
        sentinel.setDappWhitelist(address(0), true);
    }
    
    /*//////////////////////////////////////////////////////////////
                    TRANSACTION APPROVAL TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_ApproveValidTransaction() public {
        vm.prank(agent1);
        vm.expectEmit(true, true, true, true);
        emit TransactionApproved(agent1, dapp1, SMALL_AMOUNT, DAILY_LIMIT - SMALL_AMOUNT, "Transaction approved");
        
        bool approved = sentinel.checkAndApprove(dapp1, SMALL_AMOUNT);
        
        assertTrue(approved);
        assertEq(sentinel.dailySpent(), SMALL_AMOUNT);
        assertEq(sentinel.totalTransactions(), 1);
    }
    
    function test_BlockNonWhitelistedDapp() public {
        vm.prank(agent1);
        vm.expectEmit(true, true, true, true);
        emit TransactionBlocked(agent1, dapp2, SMALL_AMOUNT, "Dapp not whitelisted");
        
        bool approved = sentinel.checkAndApprove(dapp2, SMALL_AMOUNT);
        
        assertFalse(approved);
        assertEq(sentinel.dailySpent(), 0);
    }
    
    function test_BlockExceedingDailyLimit() public {
        vm.prank(agent1);
        vm.expectEmit(true, true, true, true);
        emit TransactionBlocked(agent1, dapp1, LARGE_AMOUNT, "Daily limit exceeded");
        
        bool approved = sentinel.checkAndApprove(dapp1, LARGE_AMOUNT);
        
        assertFalse(approved);
        assertEq(sentinel.dailySpent(), 0);
    }
    
    function test_MultipleTransactionsWithinLimit() public {
        vm.startPrank(agent1);
        
        // First transaction: 0.3 ETH
        assertTrue(sentinel.checkAndApprove(dapp1, 0.3 ether));
        assertEq(sentinel.dailySpent(), 0.3 ether);
        
        // Second transaction: 0.4 ETH
        assertTrue(sentinel.checkAndApprove(dapp1, 0.4 ether));
        assertEq(sentinel.dailySpent(), 0.7 ether);
        
        // Third transaction: 0.2 ETH (total = 0.9 ETH, under limit)
        assertTrue(sentinel.checkAndApprove(dapp1, 0.2 ether));
        assertEq(sentinel.dailySpent(), 0.9 ether);
        
        // Fourth transaction: 0.2 ETH (would exceed limit)
        assertFalse(sentinel.checkAndApprove(dapp1, 0.2 ether));
        assertEq(sentinel.dailySpent(), 0.9 ether); // Should not increase
        
        vm.stopPrank();
    }
    
    /*//////////////////////////////////////////////////////////////
                        DAILY RESET TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_DailyReset() public {
        // Spend some amount
        vm.prank(agent1);
        sentinel.checkAndApprove(dapp1, 0.5 ether);
        assertEq(sentinel.dailySpent(), 0.5 ether);
        
        // Fast forward 24 hours + 1 second
        vm.warp(block.timestamp + 1 days + 1);
        
        // Next transaction should trigger reset
        vm.prank(agent1);
        vm.expectEmit(true, true, true, true);
        emit LimitReset(block.timestamp, 0.5 ether);
        
        assertTrue(sentinel.checkAndApprove(dapp1, SMALL_AMOUNT));
        assertEq(sentinel.dailySpent(), SMALL_AMOUNT); // Reset, so only new amount
    }
    
    function test_ManualReset() public {
        // Spend some amount
        vm.prank(agent1);
        sentinel.checkAndApprove(dapp1, 0.7 ether);
        assertEq(sentinel.dailySpent(), 0.7 ether);
        
        // Owner manually resets
        vm.expectEmit(true, true, true, true);
        emit LimitReset(block.timestamp, 0.7 ether);
        sentinel.manualReset();
        
        assertEq(sentinel.dailySpent(), 0);
        
        // Can now spend full limit again
        vm.prank(agent1);
        assertTrue(sentinel.checkAndApprove(dapp1, 0.9 ether));
    }
    
    /*//////////////////////////////////////////////////////////////
                        SIMULATE CHECK TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_SimulateCheckSuccess() public {
        (bool approved, string memory reason, uint256 remaining) = 
            sentinel.simulateCheck(dapp1, SMALL_AMOUNT);
        
        assertTrue(approved);
        assertEq(reason, "Transaction would be approved");
        assertEq(remaining, DAILY_LIMIT - SMALL_AMOUNT);
    }
    
    function test_SimulateCheckNonWhitelisted() public {
        (bool approved, string memory reason, uint256 remaining) = 
            sentinel.simulateCheck(dapp2, SMALL_AMOUNT);
        
        assertFalse(approved);
        assertEq(reason, "Dapp not whitelisted");
        assertEq(remaining, DAILY_LIMIT);
    }
    
    function test_SimulateCheckExceedsLimit() public {
        (bool approved, string memory reason, uint256 remaining) = 
            sentinel.simulateCheck(dapp1, LARGE_AMOUNT);
        
        assertFalse(approved);
        assertEq(reason, "Daily limit exceeded");
        assertEq(remaining, DAILY_LIMIT);
    }
    
    function test_SimulateDoesNotChangeState() public {
        sentinel.simulateCheck(dapp1, SMALL_AMOUNT);
        
        // State should not change
        assertEq(sentinel.dailySpent(), 0);
        assertEq(sentinel.totalTransactions(), 0);
    }
    
    /*//////////////////////////////////////////////////////////////
                        PAUSE TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_EmergencyPause() public {
        vm.expectEmit(true, true, true, true);
        emit EmergencyPause(owner, block.timestamp);
        sentinel.emergencyPause();
        
        assertTrue(sentinel.paused());
        
        // Cannot approve transactions when paused
        vm.prank(agent1);
        vm.expectRevert("SentinelClamp: Contract is paused");
        sentinel.checkAndApprove(dapp1, SMALL_AMOUNT);
    }
    
    function test_Unpause() public {
        sentinel.emergencyPause();
        assertTrue(sentinel.paused());
        
        sentinel.unpause();
        assertFalse(sentinel.paused());
        
        // Can approve transactions again
        vm.prank(agent1);
        assertTrue(sentinel.checkAndApprove(dapp1, SMALL_AMOUNT));
    }
    
    /*//////////////////////////////////////////////////////////////
                        ADMIN FUNCTION TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_UpdateDailyLimit() public {
        uint256 newLimit = 2 ether;
        
        vm.expectEmit(true, true, true, true);
        emit DailyLimitUpdated(DAILY_LIMIT, newLimit);
        sentinel.updateDailyLimit(newLimit);
        
        assertEq(sentinel.dailyLimit(), newLimit);
    }
    
    function test_RevertWhen_UpdateDailyLimitToZero() public {
        vm.expectRevert("SentinelClamp: Limit too low");
        sentinel.updateDailyLimit(0);
    }
    
    function test_GetStatus() public {
        // Spend some amount
        vm.prank(agent1);
        sentinel.checkAndApprove(dapp1, 0.3 ether);
        
        (
            uint256 currentSpent,
            uint256 remaining,
            uint256 timeUntilReset,
            bool isPaused,
            uint256 txCount,
            uint256 x402TxCount
        ) = sentinel.getStatus();
        
        assertEq(currentSpent, 0.3 ether);
        assertEq(remaining, 0.7 ether);
        assertTrue(timeUntilReset > 0 && timeUntilReset <= 1 days);
        assertFalse(isPaused);
        assertEq(txCount, 1);
        assertEq(x402TxCount, 0);
    }
    
    function test_GetStatusAfterReset() public {
        // Spend and fast forward
        vm.prank(agent1);
        sentinel.checkAndApprove(dapp1, 0.5 ether);
        
        vm.warp(block.timestamp + 1 days + 1);
        
        (
            uint256 currentSpent,
            uint256 remaining,
            uint256 timeUntilReset,
            ,            ,            
        ) = sentinel.getStatus();
        
        assertEq(currentSpent, 0); // Should show as reset
        assertEq(remaining, DAILY_LIMIT);
        assertEq(timeUntilReset, 0);
    }
    
    function test_TransferOwnership() public {
        address newOwner = makeAddr("newOwner");
        
        // Step 1: Initiate transfer
        sentinel.transferOwnership(newOwner);
        assertEq(sentinel.pendingOwner(), newOwner);
        assertEq(sentinel.owner(), owner); // Owner hasn't changed yet
        
        // Step 2: New owner accepts
        vm.prank(newOwner);
        sentinel.acceptOwnership();
        
        assertEq(sentinel.owner(), newOwner);
        assertEq(sentinel.pendingOwner(), address(0)); // Reset pending
        assertTrue(sentinel.authorizedAgents(newOwner));
    }
    
    function test_RevertWhen_TransferOwnershipToZeroAddress() public {
        vm.expectRevert("SentinelClamp: Invalid new owner");
        sentinel.transferOwnership(address(0));
    }
    
    /*//////////////////////////////////////////////////////////////
                        INTEGRATION TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_RealWorldScenario() public {
        // Day 1: Agent makes several trades
        vm.startPrank(agent1);
        
        // Morning: Buy CRO (0.2 ETH)
        assertTrue(sentinel.checkAndApprove(dapp1, 0.2 ether));
        
        // Afternoon: Add liquidity (0.3 ETH)
        assertTrue(sentinel.checkAndApprove(dapp1, 0.3 ether));
        
        // Evening: Swap tokens (0.4 ETH)
        assertTrue(sentinel.checkAndApprove(dapp1, 0.4 ether));
        
        // Night: Try to make another trade (would exceed limit)
        assertFalse(sentinel.checkAndApprove(dapp1, 0.2 ether));
        
        assertEq(sentinel.dailySpent(), 0.9 ether);
        assertEq(sentinel.totalTransactions(), 3);
        
        vm.stopPrank();
        
        // Day 2: Reset occurs
        vm.warp(block.timestamp + 1 days + 1);
        
        // Agent can trade again
        vm.prank(agent1);
        assertTrue(sentinel.checkAndApprove(dapp1, 0.5 ether));
        assertEq(sentinel.dailySpent(), 0.5 ether);
    }
    
    function test_MultiAgentScenario() public {
        // Authorize second agent
        sentinel.setAgentAuthorization(agent2, true);
        
        // Agent 1 spends 0.4 ETH
        vm.prank(agent1);
        assertTrue(sentinel.checkAndApprove(dapp1, 0.4 ether));
        
        // Agent 2 spends 0.5 ETH (total 0.9 ETH)
        vm.prank(agent2);
        assertTrue(sentinel.checkAndApprove(dapp1, 0.5 ether));
        
        assertEq(sentinel.dailySpent(), 0.9 ether);
        
        // Agent 1 tries to spend 0.2 ETH more (would exceed)
        vm.prank(agent1);
        assertFalse(sentinel.checkAndApprove(dapp1, 0.2 ether));
    }
    
    /*//////////////////////////////////////////////////////////////
                        X402 FUNCTIONALITY TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_X402PaymentApproval() public {
        vm.prank(agent1);
        bool approved = sentinel.checkAndApproveX402(dapp1, 0.05 ether, "x402-proof-abc123");
        
        assertTrue(approved);
        assertEq(sentinel.dailySpent(), 0.05 ether);
        assertEq(sentinel.totalTransactions(), 1);
        assertEq(sentinel.x402Transactions(), 1);
    }
    
    function test_X402DoesNotRequireWhitelist() public {
        address nonWhitelistedService = makeAddr("apiService");
        assertFalse(sentinel.whitelistedDapps(nonWhitelistedService));
        
        vm.prank(agent1);
        bool approved = sentinel.checkAndApproveX402(nonWhitelistedService, 0.1 ether, "proof123");
        
        assertTrue(approved); // Should work without whitelist
        assertEq(sentinel.x402Transactions(), 1);
    }
    
    function test_X402RespectsLimit() public {
        vm.startPrank(agent1);
        
        assertTrue(sentinel.checkAndApproveX402(dapp1, 0.6 ether, "payment1"));
        assertEq(sentinel.x402Transactions(), 1);
        
        assertFalse(sentinel.checkAndApproveX402(dapp1, 0.5 ether, "payment2"));
        assertEq(sentinel.x402Transactions(), 1); // Should not increment
        
        vm.stopPrank();
    }
    
    function test_MixedX402AndRegularTransactions() public {
        vm.startPrank(agent1);
        
        assertTrue(sentinel.checkAndApprove(dapp1, 0.3 ether));
        assertTrue(sentinel.checkAndApproveX402(dapp1, 0.2 ether, "x402-payment"));
        assertTrue(sentinel.checkAndApprove(dapp1, 0.3 ether));
        
        assertEq(sentinel.dailySpent(), 0.8 ether);
        assertEq(sentinel.totalTransactions(), 3);
        assertEq(sentinel.x402Transactions(), 1);
        
        vm.stopPrank();
    }
    
    function test_RevertWhen_X402ZeroAddress() public {
        vm.prank(agent1);
        vm.expectRevert("SentinelClamp: Invalid dApp address");
        sentinel.checkAndApproveX402(address(0), 0.1 ether, "proof");
    }
    
    function test_RevertWhen_X402ZeroAmount() public {
        vm.prank(agent1);
        vm.expectRevert("SentinelClamp: Amount must be greater than 0");
        sentinel.checkAndApproveX402(dapp1, 0, "proof");
    }
    
    function test_RevertWhen_X402EmptyProof() public {
        vm.prank(agent1);
        vm.expectRevert("SentinelClamp: Payment proof required");
        sentinel.checkAndApproveX402(dapp1, 0.1 ether, "");
    }
    
    function test_X402WithPause() public {
        sentinel.emergencyPause();
        
        vm.prank(agent1);
        vm.expectRevert("SentinelClamp: Contract is paused");
        sentinel.checkAndApproveX402(dapp1, 0.1 ether, "proof");
    }
    
    function test_GetStatusWithX402Counter() public {
        vm.startPrank(agent1);
        
        sentinel.checkAndApprove(dapp1, 0.2 ether);
        sentinel.checkAndApproveX402(dapp1, 0.1 ether, "x402-payment");
        
        vm.stopPrank();
        
        (,,,, uint256 txCount, uint256 x402TxCount) = sentinel.getStatus();
        
        assertEq(txCount, 2);
        assertEq(x402TxCount, 1);
    }
    
    function test_RevertWhen_CheckingZeroAddress() public {
        vm.prank(agent1);
        vm.expectRevert("SentinelClamp: Invalid dApp address");
        sentinel.checkAndApprove(address(0), 0.1 ether);
    }
    
    function test_RevertWhen_CheckingZeroAmount() public {
        vm.prank(agent1);
        vm.expectRevert("SentinelClamp: Amount must be greater than 0");
        sentinel.checkAndApprove(dapp1, 0);
    }
}
