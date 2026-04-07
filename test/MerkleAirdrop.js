const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");

describe("MerkleAirdrop", function () {
  const DECIMALS = 18n;
  const ONE_TOKEN = 10n ** DECIMALS;
  const NAME = "RewardToken";
  const SYMBOL = "RWT";
  const INITIAL_SUPPLY = 0n;
  const MAX_SUPPLY = 100000n;

  // Build a fresh Merkle tree from signers for each test
  async function deployFixture() {
    const [owner, addr1, addr2, addr3, stranger] = await ethers.getSigners();

    // Airdrop list: address → whole token units
    const airdropEntries = [
      [addr1.address, "1000"],
      [addr2.address, "500"],
      [addr3.address, "250"],
    ];

    const tree = StandardMerkleTree.of(airdropEntries, ["address", "uint256"]);
    const merkleRoot = tree.root;

    // Deploy RewardToken
    const RewardToken = await ethers.getContractFactory("RewardToken");
    const token = await RewardToken.deploy(NAME, SYMBOL, INITIAL_SUPPLY, MAX_SUPPLY);

    // Deploy MerkleAirdrop
    const MerkleAirdrop = await ethers.getContractFactory("MerkleAirdrop");
    const airdrop = await MerkleAirdrop.deploy(await token.getAddress(), merkleRoot);

    // Setup: register airdrop contract as minter and enable minting
    await token.createMinter(await airdrop.getAddress());
    await token.toggleMinting();

    // Helper: get proof for a given address
    function getProof(address) {
      for (const [i, leaf] of tree.entries()) {
        if (leaf[0] === address) return tree.getProof(i);
      }
      throw new Error(`Address ${address} not found in tree`);
    }

    return { token, airdrop, tree, merkleRoot, owner, addr1, addr2, addr3, stranger, airdropEntries, getProof };
  }

  // ─── Deployment ──────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("Should set the correct token address", async function () {
      const { token, airdrop } = await loadFixture(deployFixture);
      expect(await airdrop.token()).to.equal(await token.getAddress());
    });

    it("Should set the correct merkle root", async function () {
      const { airdrop, merkleRoot } = await loadFixture(deployFixture);
      expect(await airdrop.merkleRoot()).to.equal(merkleRoot);
    });

    it("Should have no address claimed by default", async function () {
      const { airdrop, addr1 } = await loadFixture(deployFixture);
      expect(await airdrop.hasClaimed(addr1.address)).to.equal(false);
    });
  });

  // ─── claim ────────────────────────────────────────────────────────────────────

  describe("claim", function () {
    it("Should mint the correct amount to the claimant", async function () {
      const { token, airdrop, addr1, getProof } = await loadFixture(deployFixture);
      const proof = getProof(addr1.address);
      await airdrop.connect(addr1).claim(1000, proof);
      expect(await token.balanceOf(addr1.address)).to.equal(1000n * ONE_TOKEN);
    });

    it("Should mark the address as claimed", async function () {
      const { airdrop, addr1, getProof } = await loadFixture(deployFixture);
      const proof = getProof(addr1.address);
      await airdrop.connect(addr1).claim(1000, proof);
      expect(await airdrop.hasClaimed(addr1.address)).to.equal(true);
    });

    it("Should emit Claimed event", async function () {
      const { airdrop, addr1, getProof } = await loadFixture(deployFixture);
      const proof = getProof(addr1.address);
      await expect(airdrop.connect(addr1).claim(1000, proof))
        .to.emit(airdrop, "Claimed")
        .withArgs(addr1.address, 1000);
    });

    it("Should allow multiple different addresses to claim", async function () {
      const { token, airdrop, addr1, addr2, addr3, getProof } = await loadFixture(deployFixture);
      await airdrop.connect(addr1).claim(1000, getProof(addr1.address));
      await airdrop.connect(addr2).claim(500, getProof(addr2.address));
      await airdrop.connect(addr3).claim(250, getProof(addr3.address));
      expect(await token.balanceOf(addr1.address)).to.equal(1000n * ONE_TOKEN);
      expect(await token.balanceOf(addr2.address)).to.equal(500n * ONE_TOKEN);
      expect(await token.balanceOf(addr3.address)).to.equal(250n * ONE_TOKEN);
    });

    it("Should revert if already claimed", async function () {
      const { airdrop, addr1, getProof } = await loadFixture(deployFixture);
      const proof = getProof(addr1.address);
      await airdrop.connect(addr1).claim(1000, proof);
      await expect(airdrop.connect(addr1).claim(1000, proof)).to.be.revertedWith(
        "Already claimed"
      );
    });

    it("Should revert with wrong amount", async function () {
      const { airdrop, addr1, getProof } = await loadFixture(deployFixture);
      const proof = getProof(addr1.address);
      await expect(airdrop.connect(addr1).claim(9999, proof)).to.be.revertedWith(
        "Invalid proof"
      );
    });

    it("Should revert with wrong proof", async function () {
      const { airdrop, addr1, addr2, getProof } = await loadFixture(deployFixture);
      const wrongProof = getProof(addr2.address); // proof from addr2
      await expect(airdrop.connect(addr1).claim(1000, wrongProof)).to.be.revertedWith(
        "Invalid proof"
      );
    });

    it("Should revert if address is not in the tree", async function () {
      const { airdrop, stranger } = await loadFixture(deployFixture);
      await expect(airdrop.connect(stranger).claim(1000, [])).to.be.revertedWith(
        "Invalid proof"
      );
    });
  });

  // ─── setMerkleRoot ────────────────────────────────────────────────────────────

  describe("setMerkleRoot", function () {
    it("Should update the merkle root", async function () {
      const { airdrop, owner } = await loadFixture(deployFixture);
      const newRoot = ethers.randomBytes(32);
      await airdrop.connect(owner).setMerkleRoot(newRoot);
      expect(await airdrop.merkleRoot()).to.equal(ethers.hexlify(newRoot));
    });

    it("Should emit MerkleRootUpdated event", async function () {
      const { airdrop, merkleRoot } = await loadFixture(deployFixture);
      const newRoot = ethers.randomBytes(32);
      await expect(airdrop.setMerkleRoot(newRoot))
        .to.emit(airdrop, "MerkleRootUpdated")
        .withArgs(merkleRoot, ethers.hexlify(newRoot));
    });

    it("Should invalidate old proofs after root update", async function () {
      const { airdrop, addr1, getProof } = await loadFixture(deployFixture);
      const proof = getProof(addr1.address);
      const newRoot = ethers.randomBytes(32);
      await airdrop.setMerkleRoot(newRoot);
      await expect(airdrop.connect(addr1).claim(1000, proof)).to.be.revertedWith(
        "Invalid proof"
      );
    });

    it("Should revert if called by non-owner", async function () {
      const { airdrop, addr1 } = await loadFixture(deployFixture);
      const newRoot = ethers.randomBytes(32);
      await expect(airdrop.connect(addr1).setMerkleRoot(newRoot)).to.be.reverted;
    });
  });
});
