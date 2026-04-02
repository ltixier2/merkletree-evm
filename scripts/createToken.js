const { ethers } = require("hardhat");
const readline = require("readline");

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("---");

  const name = await ask(rl, "Token name: ");
  const symbol = await ask(rl, "Token symbol: ");
  const initialSupply = await ask(rl, "Initial supply: ");
  const maxSupply = await ask(rl, "Max supply: ");
  const mintingAllowed = await ask(rl, "Enable minting at deploy? (y/n): ");

  console.log("\n--- Recap ---");
  console.log(`Name: ${name}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Initial supply: ${initialSupply}`);
  console.log(`Max supply: ${maxSupply}`);
  console.log(`Minting allowed: ${mintingAllowed.toLowerCase() === "y" ? "Yes" : "No"}`);

  const confirm = await ask(rl, "\nConfirm deploy? (y/n): ");
  rl.close();

  if (confirm.toLowerCase() !== "y") {
    console.log("Deploy cancelled.");
    return;
  }

  const RewardToken = await ethers.getContractFactory("RewardToken");
  const token = await RewardToken.deploy(name, symbol, initialSupply, maxSupply);
  await token.waitForDeployment();

  const address = await token.getAddress();

  if (mintingAllowed.toLowerCase() === "y") {
    const tx = await token.toggleMinting();
    await tx.wait();
    console.log("Minting enabled.");
  }

  console.log("\n✅ RewardToken deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
