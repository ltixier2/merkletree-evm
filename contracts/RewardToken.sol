//SPDX-License-Identifier:MIT
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

pragma solidity ^0.8.28;

contract RewardToken is ERC20, Ownable{
    address[] public minters; 
    mapping(address => bool) public isMinter;
    uint public maxSupply;
    bool public maxSupplyLocked = false; 
    bool public mintingAllowed; 
    bool public lockedMaxSupplyForEver;

    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event MaxSupplyUpdated(uint oldMaxSupply, uint newMaxSupply);
    event MaxSupplyLocked();
    event MintingToggled(bool allowed);
    event MaxSupplyLockedForEver(address indexed owner);

    constructor(
        string memory name, 
        string memory symbol, 
        uint initialSupply, 
        uint maximumSupply
        
     ) ERC20(name, symbol) Ownable(msg.sender) {
        _mint(msg.sender, initialSupply *10 **decimals()); 
        maxSupply = maximumSupply;

    }


    //mint only from the owner with check of max supply & check if minting is allowed
    function mint(address to, uint amount) external onlyOwner maxSupplyCheck(amount) checkMintingAllowed{
        
        _mint(to, amount);
    }
    //create a minter into the minters array and set the minter status to true in the mapping
    function createMinter(address minter) external onlyOwner{
        minters.push(minter);
        isMinter[minter] = true;
        emit MinterAdded(minter);
        
    }
    //remove a minter from the minters array and set the minter status to false in the mapping
    function removeMinter(address minter) external onlyOwner{
        isMinter[minter] = false;
        
        for (uint i = 0; i < minters.length; i++) {
            if (minters[i] == minter) {
                minters[i] = minters[minters.length - 1];
                minters.pop();
                break;
            }
        }
        emit MinterRemoved(minter);
    }
    //mint tokens for a minter with check of max supply & check if minting is allowed
    function mintForMinter(address to, uint amount) external onlyMinter maxSupplyCheck(amount) checkMintingAllowed{
        _mint(to, amount);
    }
    function lockMaxSupply() external onlyOwner checkLockedMaxSupplyForEver{
        maxSupplyLocked = true;
        emit MaxSupplyLocked();
    }


    //set max supply, only if the max supply is not locked
     function setMaxSupply(uint newMaxSupply) external onlyOwner {
        require(!maxSupplyLocked, "Max supply is locked");
        maxSupply = newMaxSupply;
        emit MaxSupplyUpdated(maxSupply, newMaxSupply);
    }   
    //toggle minting, if minting is allowed, it will be disabled, and if it is disabled, it will be enabled

    function toggleMinting() external onlyOwner {
        mintingAllowed = !mintingAllowed;
        emit MintingToggled(mintingAllowed);
        } 

    //lock max supply for ever, once this function is called, the max supply can never be changed again
    function lockMaxSupplyForEver() external onlyOwner{
        maxSupplyLocked = true;
        lockedMaxSupplyForEver = true;
    }

    /* modifiers */

    modifier onlyMinter() {
        require(isMinter[msg.sender], "Not a minter");
        _;
        // Note: The minter status is not revoked when the minter is removed, so we check the mapping instead of the array.
    }
    modifier maxSupplyCheck(uint amount) {
        require(totalSupply()+ amount <= maxSupply *10 **decimals(), "Exceeds max supply");
        _;
        // Note: We multiply maxSupply by 10^decimals to account for the token's decimal places.
    }
    modifier checkMintingAllowed() {
        require(mintingAllowed, "Minting is not allowed");
        _;
        // Note: This modifier checks if minting is currently allowed before allowing the mint function to execute.
    }
    modifier checkLockedMaxSupplyForEver() {
        require(!lockedMaxSupplyForEver, "Max supply is locked forever");
        _;
        // Note: This modifier checks if the max supply is locked forever before allowing the function to execute.
    }

}