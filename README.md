# RewardToken — Hardhat Project

An ERC20 token with configurable minting, minter roles, and supply caps, built with OpenZeppelin and Hardhat.

---

## Prerequisites

- Node.js >= 18
- npm

```bash
npm install
```

---

## Contract Overview

`RewardToken` is an ERC20 token (`@openzeppelin/contracts`) with the following features:

| Feature | Description |
|---|---|
| **Owner minting** | The owner can mint tokens directly |
| **Minter roles** | The owner can grant/revoke minting rights to other addresses |
| **Max supply cap** | A configurable maximum total supply |
| **Minting toggle** | Minting can be enabled or disabled at any time |
| **Supply lock** | The max supply can be permanently frozen |

### Constructor parameters

```js
RewardToken(name, symbol, initialSupply, maxSupply)
```

| Parameter | Type | Description |
|---|---|---|
| `name` | `string` | Token name (e.g. `"RewardToken"`) |
| `symbol` | `string` | Token symbol (e.g. `"RWT"`) |
| `initialSupply` | `uint` | Tokens minted to the deployer (whole units, decimals applied automatically) |
| `maxSupply` | `uint` | Maximum total supply in whole units |

> The initial supply is minted immediately to the deployer's address.  
> Minting is **disabled** by default after deployment.

---

## Deploy a Token

### Interactive script (recommended)

```bash
npx hardhat run scripts/createToken.js
```

The script will prompt you for:

```
Token name:                   MyToken
Token symbol:                 MTK
Initial supply:               1000
Max supply:                   10000
Enable minting at deploy? (y/n): y
```

After confirmation, the contract is deployed and the address is printed:

```
✅ RewardToken deployed to: 0x...
```

### Local Hardhat node

Start a local node in a separate terminal:

```bash
npx hardhat node
```

Then deploy against it:

```bash
npx hardhat run scripts/createToken.js --network localhost
```

---

## Contract Functions

### Minting

```js
// Enable or disable minting (owner only)
await token.toggleMinting();

// Mint tokens to an address (owner only, minting must be enabled)
await token.mint(toAddress, amount);  // amount in wei
```

### Minter roles

```js
// Grant minting rights (owner only)
await token.createMinter(minterAddress);

// Revoke minting rights (owner only)
await token.removeMinter(minterAddress);

// Mint as a minter
await token.connect(minter).mintForMinter(toAddress, amount);
```

### Supply cap

```js
// Update max supply (owner only, only if not locked)
await token.setMaxSupply(newMaxSupply);

// Lock the max supply (prevents setMaxSupply, reversible)
await token.lockMaxSupply();

// Lock the max supply permanently (irreversible)
await token.lockMaxSupplyForEver();
```

### Read state

```js
await token.maxSupply();            // current max supply (whole units)
await token.mintingAllowed();       // true/false
await token.maxSupplyLocked();      // true/false
await token.lockedMaxSupplyForEver(); // true/false
await token.isMinter(address);      // true/false
await token.minters(index);         // address at index in minters array
```

---

## Events

| Event | Emitted when |
|---|---|
| `MinterAdded(address)` | A minter is added |
| `MinterRemoved(address)` | A minter is removed |
| `MaxSupplyUpdated(oldSupply, newSupply)` | `setMaxSupply` is called |
| `MaxSupplyLocked()` | `lockMaxSupply` is called |
| `MintingToggled(bool)` | `toggleMinting` is called |
| `MaxSupplyLockedForEver(address)` | `lockMaxSupplyForEver` is called |

---

## Tests

Run all tests:

```bash
npx hardhat test
```

Run only `RewardToken` tests:

```bash
npx hardhat test test/RewardToken.js
```

Run with gas reporting:

```bash
REPORT_GAS=true npx hardhat test test/RewardToken.js
```

The test suite covers:

- Deployment (initial state, balances, supply)
- `toggleMinting` (on/off, events, access control)
- `mint` (success, minting disabled, supply cap, access control)
- `createMinter` / `removeMinter` (array, mapping, events, access control)
- `mintForMinter` (success, not a minter, minting disabled, supply cap, after removal)
- `setMaxSupply` (update, locked, access control, event)
- `lockMaxSupply` (state, event, locked forever guard, access control)
- `lockMaxSupplyForEver` (state, irreversibility, access control)
