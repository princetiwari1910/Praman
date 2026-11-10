# Hardhat Attestation Registry Contracts

## Testnet Demo Note
This is a testnet demonstration project only. It is not a legal proof, audit result, or production system.

## Commands

### Start local Hardhat node
```bash
npx hardhat node
```

### Deploy contracts to local node
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### Run tests
```bash
npx hardhat test
```

### Attest a report hash with a band
```bash
npx hardhat run scripts/attest.js --network localhost <hex_report_SHA_256> <band>
```
- `band` must be one of: `1` (low), `2` (medium), `3` (high), `4` (severe)

## Contract Details

### AttestationRegistry.sol
- `attest(bytes32 reportHash, uint8 band)`: Stores attester, timestamp, and band once per report hash. Reverts if already attested for that hash.
- `get(bytes32 reportHash)`: Returns the attester, timestamp, and band for a given report hash.
- `Attested(bytes32 indexed reportHash, address indexed attester, uint8 band, uint256 timestamp)`: Emitted on successful attestation.

### Usage Flow
1. Start local node: `npx hardhat node`
2. Deploy contracts: `npx hardhat run scripts/deploy.js --network localhost`
3. Attest a report: `npx hardhat run scripts/attest.js --network localhost <hex_SHA_256> <band>`
4. Check attestation: `npx hardhat test`)
