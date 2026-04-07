const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");
const fs = require("fs");
const path = require("path");

// ─── Config ──────────────────────────────────────────────────────────────────

const CSV_PATH = path.join(__dirname, "../data/airdrop.csv");
const OUTPUT_PATH = path.join(__dirname, "../data/merkle-tree.json");

// ─── Parse CSV ───────────────────────────────────────────────────────────────

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.trim().split("\n");
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());

  const addressIdx = header.indexOf("address");
  const amountIdx = header.indexOf("amount");

  if (addressIdx === -1 || amountIdx === -1) {
    throw new Error('CSV must have "address" and "amount" columns');
  }

  return lines.slice(1).map((line, i) => {
    const cols = line.split(",").map((c) => c.trim());
    const address = cols[addressIdx];
    const amount = cols[amountIdx];

    if (!address || !amount) {
      throw new Error(`Invalid row at line ${i + 2}: "${line}"`);
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      throw new Error(`Invalid address at line ${i + 2}: "${address}"`);
    }
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new Error(`Invalid amount at line ${i + 2}: "${amount}"`);
    }

    return [address, amount];
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log(`Reading CSV: ${CSV_PATH}`);
  const entries = parseCSV(CSV_PATH);
  console.log(`Loaded ${entries.length} entries\n`);

  // Build the Merkle tree — leaf format: [address, uint256]
  const tree = StandardMerkleTree.of(entries, ["address", "uint256"]);

  console.log("Merkle Root:", tree.root);
  console.log();

  // Print each leaf with its proof
  console.log("Leaves:");
  for (const [i, leaf] of tree.entries()) {
    const proof = tree.getProof(i);
    console.log(`  [${i}] address=${leaf[0]}  amount=${leaf[1]}`);
    console.log(`       proof=${JSON.stringify(proof)}`);
  }

  // Save the full tree to JSON (for later proof generation)
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(tree.dump(), null, 2));
  console.log(`\nTree saved to: ${OUTPUT_PATH}`);
}

main();
