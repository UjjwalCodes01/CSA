// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SentinelClamp {
    uint256 private constant MIN_DAILY_LIMIT = 0.01 ether; // Minimum 0.01 ETH/CRO
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    
    address public owner;
    address public pendingOwner;
    uint256 public dailyLimit;
    uint256 public dailySpent;
    uint256 public lastResetTime;
    uint256 public totalTransactions;
    uint256 public x402Transactions;
    uint256 private _status;
    
    mapping(address => bool) public whitelistedDapps;
    mapping(address => bool) public authorizedAgents;
    
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
    
    event DailyLimitUpdated(uint256 oldLimit, uint256 newLimit);
    event DappWhitelisted(address indexed dapp, bool status);
    event AgentAuthorized(address indexed agent, bool status);
    event EmergencyPause(address indexed by, uint256 timestamp);
    event LimitReset(uint256 timestamp, uint256 previousSpent);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event X402TransactionApproved(address indexed agent, address indexed dapp, uint256 amount, string paymentProof);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "SentinelClamp: Only owner");
        _;
    }
    
    modifier onlyAuthorizedAgent() {
        require(authorizedAgents[msg.sender] || msg.sender == owner, "SentinelClamp: Unauthorized agent");
        _;
    }
    
    bool public paused;
    
    modifier whenNotPaused() {
        require(!paused, "SentinelClamp: Contract is paused");
        _;
    }
    
    modifier nonReentrant() {
        require(_status != _ENTERED, "SentinelClamp: Reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
    
    constructor(uint256 _dailyLimit) {
        require(_dailyLimit >= MIN_DAILY_LIMIT, "SentinelClamp: Daily limit too low");
        owner = msg.sender;
        dailyLimit = _dailyLimit;
        dailySpent = 0;
        lastResetTime = block.timestamp;
        paused = false;
        _status = _NOT_ENTERED;
        x402Transactions = 0;
        
        authorizedAgents[msg.sender] = true;
    }
    
    function checkAndApprove(
        address dapp,
        uint256 amount
    ) external onlyAuthorizedAgent whenNotPaused nonReentrant returns (bool) {
        require(dapp != address(0), "SentinelClamp: Invalid dApp address");
        require(amount > 0, "SentinelClamp: Amount must be greater than 0");
        
        // Reset daily counter if 24 hours have passed
        if (block.timestamp >= lastResetTime + 1 days) {
            emit LimitReset(block.timestamp, dailySpent);
            dailySpent = 0;
            lastResetTime = block.timestamp;
        }
        
        // Check if dApp is whitelisted
        if (!whitelistedDapps[dapp]) {
            emit TransactionBlocked(
                msg.sender,
                dapp,
                amount,
                "Dapp not whitelisted"
            );
            return false;
        }
        
        if (dailySpent + amount > dailyLimit) {
            emit TransactionBlocked(
                msg.sender,
                dapp,
                amount,
                "Daily limit exceeded"
            );
            return false;
        }
        
        dailySpent += amount;
        totalTransactions++;
        
        uint256 remainingLimit = dailyLimit - dailySpent;
        
        emit TransactionApproved(
            msg.sender,
            dapp,
            amount,
            remainingLimit,
            "Transaction approved"
        );
        
        return true;
    }
    
    function simulateCheck(
        address dapp,
        uint256 amount
    ) external view returns (
        bool approved,
        string memory reason,
        uint256 remainingLimit
    ) {
        uint256 currentSpent = dailySpent;
        if (block.timestamp >= lastResetTime + 1 days) {
            currentSpent = 0;
        }
        
        if (!whitelistedDapps[dapp]) {
            return (false, "Dapp not whitelisted", dailyLimit - currentSpent);
        }
        
        if (currentSpent + amount > dailyLimit) {
            return (false, "Daily limit exceeded", dailyLimit - currentSpent);
        }
        
        remainingLimit = dailyLimit - currentSpent - amount;
        return (true, "Transaction would be approved", remainingLimit);
    }
    
    function setDappWhitelist(address dapp, bool status) external onlyOwner {
        require(dapp != address(0), "SentinelClamp: Invalid dApp address");
        whitelistedDapps[dapp] = status;
        emit DappWhitelisted(dapp, status);
    }
    
    function batchSetDappWhitelist(address[] calldata dapps, bool status) external onlyOwner {
        require(dapps.length <= 50, "SentinelClamp: Batch size too large");
        for (uint256 i = 0; i < dapps.length; i++) {
            require(dapps[i] != address(0), "SentinelClamp: Invalid dApp address");
            whitelistedDapps[dapps[i]] = status;
            emit DappWhitelisted(dapps[i], status);
        }
    }
 
    function setAgentAuthorization(address agent, bool status) external onlyOwner {
        require(agent != address(0), "SentinelClamp: Invalid agent address");
        authorizedAgents[agent] = status;
        emit AgentAuthorized(agent, status);
    }
    
 
    function updateDailyLimit(uint256 newLimit) external onlyOwner {
        require(newLimit >= MIN_DAILY_LIMIT, "SentinelClamp: Limit too low");
        uint256 oldLimit = dailyLimit;
        dailyLimit = newLimit;
        emit DailyLimitUpdated(oldLimit, newLimit);
    }
    
 
    function emergencyPause() external onlyOwner {
        paused = true;
        emit EmergencyPause(msg.sender, block.timestamp);
    }
    

    function unpause() external onlyOwner {
        paused = false;
    }
    

    function manualReset() external onlyOwner {
        emit LimitReset(block.timestamp, dailySpent);
        dailySpent = 0;
        lastResetTime = block.timestamp;
    }
    

    function getStatus() external view returns (
        uint256 currentSpent,
        uint256 remaining,
        uint256 timeUntilReset,
        bool isPaused,
        uint256 txCount,
        uint256 x402TxCount
    ) {
        if (block.timestamp >= lastResetTime + 1 days) {
            currentSpent = 0;
            remaining = dailyLimit;
            timeUntilReset = 0;
        } else {
            currentSpent = dailySpent;
            remaining = dailyLimit > dailySpent ? dailyLimit - dailySpent : 0;
            timeUntilReset = (lastResetTime + 1 days) - block.timestamp;
        }
        
        isPaused = paused;
        txCount = totalTransactions;
        x402TxCount = x402Transactions;
    }
    
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "SentinelClamp: Invalid new owner");
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }
    
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "SentinelClamp: Not pending owner");
        address oldOwner = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        authorizedAgents[owner] = true;
        emit OwnershipTransferred(oldOwner, owner);
    }
    
    function checkAndApproveX402(
        address dapp,
        uint256 amount,
        string calldata paymentProof
    ) external onlyAuthorizedAgent whenNotPaused nonReentrant returns (bool) {
        require(dapp != address(0), "SentinelClamp: Invalid dApp address");
        require(amount > 0, "SentinelClamp: Amount must be greater than 0");
        require(bytes(paymentProof).length > 0, "SentinelClamp: Payment proof required");
        
        // Reset daily counter if 24 hours have passed
        if (block.timestamp >= lastResetTime + 1 days) {
            emit LimitReset(block.timestamp, dailySpent);
            dailySpent = 0;
            lastResetTime = block.timestamp;
        }
        
        // x402 payments don't require dApp whitelisting
        // They are for service providers (APIs, data feeds, etc.)
        // Only the daily limit provides protection
        
        // Check if amount exceeds daily limit
        if (dailySpent + amount > dailyLimit) {
            emit TransactionBlocked(
                msg.sender,
                dapp,
                amount,
                "Daily limit exceeded"
            );
            return false;
        }
        
        // Approve x402 transaction
        dailySpent += amount;
        totalTransactions++;
        x402Transactions++;
        
        uint256 remainingLimit = dailyLimit - dailySpent;
        
        emit X402TransactionApproved(msg.sender, dapp, amount, paymentProof);
        emit TransactionApproved(
            msg.sender,
            dapp,
            amount,
            remainingLimit,
            string(abi.encodePacked("x402: ", paymentProof))
        );
        
        return true;
    }
}
