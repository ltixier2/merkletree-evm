const { ethers } = require("ethers");

const wallets = Array.from({ length: 10 }, () => ethers.Wallet.createRandom());

console.log("# Test Wallets\n");
wallets.forEach((w, i) => {
  console.log(`[${i + 1}]`);
  console.log(`  address:     ${w.address}`);
  console.log(`  privateKey:  ${w.privateKey}`);
});
