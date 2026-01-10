// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title WCRO (Wrapped CRO)
 * @notice Standard WETH9-style wrapper for CRO
 * @dev Allows wrapping native CRO into ERC20 WCRO token (1:1)
 */
contract WCRO {
    string public name = "Wrapped CRO";
    string public symbol = "WCRO";
    uint8 public constant decimals = 18;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    /**
     * @notice Wrap CRO into WCRO by sending CRO to this contract
     */
    receive() external payable {
        deposit();
    }
    
    /**
     * @notice Deposit CRO and receive WCRO (1:1)
     */
    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @notice Withdraw CRO by burning WCRO (1:1)
     * @param wad Amount of WCRO to unwrap
     */
    function withdraw(uint256 wad) public {
        require(balanceOf[msg.sender] >= wad, "Insufficient WCRO balance");
        balanceOf[msg.sender] -= wad;
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }
    
    /**
     * @notice Total supply equals contract's CRO balance
     */
    function totalSupply() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Standard ERC20 transfer
     */
    function transfer(address dst, uint256 wad) public returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }
    
    /**
     * @notice Standard ERC20 transferFrom
     */
    function transferFrom(address src, address dst, uint256 wad) public returns (bool) {
        require(balanceOf[src] >= wad, "Insufficient balance");
        
        if (src != msg.sender && allowance[src][msg.sender] != type(uint256).max) {
            require(allowance[src][msg.sender] >= wad, "Insufficient allowance");
            allowance[src][msg.sender] -= wad;
        }
        
        balanceOf[src] -= wad;
        balanceOf[dst] += wad;
        
        emit Transfer(src, dst, wad);
        return true;
    }
    
    /**
     * @notice Standard ERC20 approve
     */
    function approve(address guy, uint256 wad) public returns (bool) {
        allowance[msg.sender][guy] = wad;
        emit Approval(msg.sender, guy, wad);
        return true;
    }
}
