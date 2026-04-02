const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("RewardToken", function () {
  const NAME = "RewardToken";
  const SYMBOL = "RWT";
  const INITIAL_SUPPLY = 1000n; // tokens (sans décimales)
  const MAX_SUPPLY = 10000n;    // tokens (sans décimales)
  const DECIMALS = 18n;
  const ONE_TOKEN = 10n ** DECIMALS;

  async function deployRewardTokenFixture() {
    const [owner, minter1, minter2, user] = await ethers.getSigners();

    const RewardToken = await ethers.getContractFactory("RewardToken");
    const token = await RewardToken.deploy(NAME, SYMBOL, INITIAL_SUPPLY, MAX_SUPPLY);

    return { token, owner, minter1, minter2, user };
  }

  // ─── Déploiement ────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      expect(await token.name()).to.equal(NAME);
      expect(await token.symbol()).to.equal(SYMBOL);
    });

    it("Should mint initial supply to owner", async function () {
      const { token, owner } = await loadFixture(deployRewardTokenFixture);
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY * ONE_TOKEN);
    });

    it("Should set the correct maxSupply", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      expect(await token.maxSupply()).to.equal(MAX_SUPPLY);
    });

    it("Should have minting disabled by default", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      expect(await token.mintingAllowed()).to.equal(false);
    });

    it("Should have maxSupplyLocked = false by default", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      expect(await token.maxSupplyLocked()).to.equal(false);
    });

    it("Should have lockedMaxSupplyForEver = false by default", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      expect(await token.lockedMaxSupplyForEver()).to.equal(false);
    });
  });

  // ─── toggleMinting ──────────────────────────────────────────────────────────

  describe("toggleMinting", function () {
    it("Should enable minting when toggled from disabled", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      await token.toggleMinting();
      expect(await token.mintingAllowed()).to.equal(true);
    });

    it("Should disable minting when toggled from enabled", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      await token.toggleMinting();
      await token.toggleMinting();
      expect(await token.mintingAllowed()).to.equal(false);
    });

    it("Should emit MintingToggled event", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      await expect(token.toggleMinting())
        .to.emit(token, "MintingToggled")
        .withArgs(true);
    });

    it("Should revert if called by non-owner", async function () {
      const { token, user } = await loadFixture(deployRewardTokenFixture);
      await expect(token.connect(user).toggleMinting()).to.be.reverted;
    });
  });

  // ─── mint ────────────────────────────────────────────────────────────────────

  describe("mint", function () {
    it("Should mint tokens to a given address", async function () {
      const { token, user } = await loadFixture(deployRewardTokenFixture);
      await token.toggleMinting();
      const amount = ONE_TOKEN * 100n;
      await token.mint(user.address, amount);
      expect(await token.balanceOf(user.address)).to.equal(amount);
    });

    it("Should revert if minting is not allowed", async function () {
      const { token, user } = await loadFixture(deployRewardTokenFixture);
      await expect(token.mint(user.address, ONE_TOKEN)).to.be.revertedWith(
        "Minting is not allowed"
      );
    });

    it("Should revert if amount exceeds max supply", async function () {
      const { token, user } = await loadFixture(deployRewardTokenFixture);
      await token.toggleMinting();
      const tooMuch = MAX_SUPPLY * ONE_TOKEN; // totalSupply déjà à 1000, donc dépasse
      await expect(token.mint(user.address, tooMuch)).to.be.revertedWith(
        "Exceeds max supply"
      );
    });

    it("Should revert if called by non-owner", async function () {
      const { token, user } = await loadFixture(deployRewardTokenFixture);
      await token.toggleMinting();
      await expect(token.connect(user).mint(user.address, ONE_TOKEN)).to.be.reverted;
    });
  });

  // ─── createMinter ────────────────────────────────────────────────────────────

  describe("createMinter", function () {
    it("Should add address to minters array", async function () {
      const { token, minter1 } = await loadFixture(deployRewardTokenFixture);
      await token.createMinter(minter1.address);
      expect(await token.minters(0)).to.equal(minter1.address);
    });

    it("Should set isMinter to true", async function () {
      const { token, minter1 } = await loadFixture(deployRewardTokenFixture);
      await token.createMinter(minter1.address);
      expect(await token.isMinter(minter1.address)).to.equal(true);
    });

    it("Should emit MinterAdded event", async function () {
      const { token, minter1 } = await loadFixture(deployRewardTokenFixture);
      await expect(token.createMinter(minter1.address))
        .to.emit(token, "MinterAdded")
        .withArgs(minter1.address);
    });

    it("Should revert if called by non-owner", async function () {
      const { token, minter1, user } = await loadFixture(deployRewardTokenFixture);
      await expect(token.connect(user).createMinter(minter1.address)).to.be.reverted;
    });
  });

  // ─── removeMinter ────────────────────────────────────────────────────────────

  describe("removeMinter", function () {
    it("Should set isMinter to false", async function () {
      const { token, minter1 } = await loadFixture(deployRewardTokenFixture);
      await token.createMinter(minter1.address);
      await token.removeMinter(minter1.address);
      expect(await token.isMinter(minter1.address)).to.equal(false);
    });

    it("Should remove minter from array", async function () {
      const { token, minter1 } = await loadFixture(deployRewardTokenFixture);
      await token.createMinter(minter1.address);
      await token.removeMinter(minter1.address);
      // Le tableau doit être vide
      await expect(token.minters(0)).to.be.reverted;
    });

    it("Should emit MinterRemoved event", async function () {
      const { token, minter1 } = await loadFixture(deployRewardTokenFixture);
      await token.createMinter(minter1.address);
      await expect(token.removeMinter(minter1.address))
        .to.emit(token, "MinterRemoved")
        .withArgs(minter1.address);
    });

    it("Should correctly remove one minter when multiple exist", async function () {
      const { token, minter1, minter2 } = await loadFixture(deployRewardTokenFixture);
      await token.createMinter(minter1.address);
      await token.createMinter(minter2.address);
      await token.removeMinter(minter1.address);
      expect(await token.isMinter(minter1.address)).to.equal(false);
      expect(await token.isMinter(minter2.address)).to.equal(true);
    });

    it("Should revert if called by non-owner", async function () {
      const { token, minter1, user } = await loadFixture(deployRewardTokenFixture);
      await token.createMinter(minter1.address);
      await expect(token.connect(user).removeMinter(minter1.address)).to.be.reverted;
    });
  });

  // ─── mintForMinter ────────────────────────────────────────────────────────────

  describe("mintForMinter", function () {
    it("Should allow a minter to mint tokens", async function () {
      const { token, minter1, user } = await loadFixture(deployRewardTokenFixture);
      await token.createMinter(minter1.address);
      await token.toggleMinting();
      const amount = ONE_TOKEN * 50n;
      await token.connect(minter1).mintForMinter(user.address, amount);
      expect(await token.balanceOf(user.address)).to.equal(amount);
    });

    it("Should revert if caller is not a minter", async function () {
      const { token, user } = await loadFixture(deployRewardTokenFixture);
      await token.toggleMinting();
      await expect(
        token.connect(user).mintForMinter(user.address, ONE_TOKEN)
      ).to.be.revertedWith("Not a minter");
    });

    it("Should revert if minting is not allowed", async function () {
      const { token, minter1, user } = await loadFixture(deployRewardTokenFixture);
      await token.createMinter(minter1.address);
      await expect(
        token.connect(minter1).mintForMinter(user.address, ONE_TOKEN)
      ).to.be.revertedWith("Minting is not allowed");
    });

    it("Should revert if amount exceeds max supply", async function () {
      const { token, minter1, user } = await loadFixture(deployRewardTokenFixture);
      await token.createMinter(minter1.address);
      await token.toggleMinting();
      const tooMuch = MAX_SUPPLY * ONE_TOKEN;
      await expect(
        token.connect(minter1).mintForMinter(user.address, tooMuch)
      ).to.be.revertedWith("Exceeds max supply");
    });

    it("Should revert after minter is removed", async function () {
      const { token, minter1, user } = await loadFixture(deployRewardTokenFixture);
      await token.createMinter(minter1.address);
      await token.toggleMinting();
      await token.removeMinter(minter1.address);
      await expect(
        token.connect(minter1).mintForMinter(user.address, ONE_TOKEN)
      ).to.be.revertedWith("Not a minter");
    });
  });

  // ─── setMaxSupply ─────────────────────────────────────────────────────────────

  describe("setMaxSupply", function () {
    it("Should update max supply", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      await token.setMaxSupply(20000n);
      expect(await token.maxSupply()).to.equal(20000n);
    });

    it("Should emit MaxSupplyUpdated event", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      await expect(token.setMaxSupply(20000n)).to.emit(token, "MaxSupplyUpdated");
    });

    it("Should revert if max supply is locked", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      await token.lockMaxSupply();
      await expect(token.setMaxSupply(20000n)).to.be.revertedWith(
        "Max supply is locked"
      );
    });

    it("Should revert if called by non-owner", async function () {
      const { token, user } = await loadFixture(deployRewardTokenFixture);
      await expect(token.connect(user).setMaxSupply(20000n)).to.be.reverted;
    });
  });

  // ─── lockMaxSupply ────────────────────────────────────────────────────────────

  describe("lockMaxSupply", function () {
    it("Should lock the max supply", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      await token.lockMaxSupply();
      expect(await token.maxSupplyLocked()).to.equal(true);
    });

    it("Should emit MaxSupplyLocked event", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      await expect(token.lockMaxSupply()).to.emit(token, "MaxSupplyLocked");
    });

    it("Should revert if max supply is already locked forever", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      await token.lockMaxSupplyForEver();
      await expect(token.lockMaxSupply()).to.be.revertedWith(
        "Max supply is locked forever"
      );
    });

    it("Should revert if called by non-owner", async function () {
      const { token, user } = await loadFixture(deployRewardTokenFixture);
      await expect(token.connect(user).lockMaxSupply()).to.be.reverted;
    });
  });

  // ─── lockMaxSupplyForEver ─────────────────────────────────────────────────────

  describe("lockMaxSupplyForEver", function () {
    it("Should set maxSupplyLocked and lockedMaxSupplyForEver to true", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      await token.lockMaxSupplyForEver();
      expect(await token.maxSupplyLocked()).to.equal(true);
      expect(await token.lockedMaxSupplyForEver()).to.equal(true);
    });

    it("Should prevent setMaxSupply after lock", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      await token.lockMaxSupplyForEver();
      await expect(token.setMaxSupply(20000n)).to.be.revertedWith(
        "Max supply is locked"
      );
    });

    it("Should prevent lockMaxSupply after lock", async function () {
      const { token } = await loadFixture(deployRewardTokenFixture);
      await token.lockMaxSupplyForEver();
      await expect(token.lockMaxSupply()).to.be.revertedWith(
        "Max supply is locked forever"
      );
    });

    it("Should revert if called by non-owner", async function () {
      const { token, user } = await loadFixture(deployRewardTokenFixture);
      await expect(token.connect(user).lockMaxSupplyForEver()).to.be.reverted;
    });
  });
});
