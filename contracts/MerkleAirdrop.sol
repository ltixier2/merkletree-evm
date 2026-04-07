// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RewardToken.sol";

contract MerkleAirdrop is Ownable {

    RewardToken public immutable token;
    bytes32 public merkleRoot;

    mapping(address => bool) public hasClaimed;

    event Claimed(address indexed account, uint256 amount);
    event MerkleRootUpdated(bytes32 oldRoot, bytes32 newRoot);

    constructor(address tokenAddress, bytes32 _merkleRoot) Ownable(msg.sender) {
        token = RewardToken(tokenAddress);
        merkleRoot = _merkleRoot;
    }

    // Claim tokens by providing a valid Merkle proof
    function claim(uint256 amount, bytes32[] calldata proof) external {
        require(!hasClaimed[msg.sender], "Already claimed");

        // Leaf must match the format used in generateMerkleTree.js:
        // StandardMerkleTree.of(entries, ["address", "uint256"])
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, amount))));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid proof");

        hasClaimed[msg.sender] = true;
        token.mintForMinter(msg.sender, amount);

        emit Claimed(msg.sender, amount);
    }

    // Update the Merkle root (owner only) — useful for new airdrop rounds
    function setMerkleRoot(bytes32 newRoot) external onlyOwner {
        emit MerkleRootUpdated(merkleRoot, newRoot);
        merkleRoot = newRoot;
    }
}
