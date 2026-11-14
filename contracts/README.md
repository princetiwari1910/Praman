# AttestationRegistry Contracts

**LOCAL DEMO - not legal proof.** This is a local demonstration contract only. It is not legal proof, an audit certification, or a production deployment.

## Commands

Run all commands from `contracts/`:

### Compile

```bash
npx hardhat compile
```

### Run tests

```bash
npx hardhat test
```

### Run the in-process local attestation demo

```bash
REPORT_HASH=<64-hex report hash> BAND=<low|medium|high|severe> npx hardhat run scripts/demo-attest.js --network hardhat
```

`scripts/demo-attest.js` deploys `AttestationRegistry` to the in-process Hardhat network, attests `REPORT_HASH` (64 hex characters with or without `0x`) with the specified band, reads back the stored attestation, and refuses to run on any network other than `hardhat`.

### Optional: deploy & attest against a persistent local node

Terminal 1:

```bash
npx hardhat node
```

Terminal 2:

```bash
npx hardhat run scripts/deploy.js --network localhost
REPORT_HASH=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa BAND=3 npx hardhat run scripts/attest.js --network localhost
```

## Contract API (`AttestationRegistry.sol`)

- `attest(bytes32 reportHash, uint8 band)`: Stores `attester`, `timestamp`, and `band` (0-3) once per `reportHash`; reverts on duplicate hash, empty hash, or invalid band.
- `get(bytes32 reportHash)`: Returns `(address attester, uint256 timestamp, uint8 band)`.
- `Attested(bytes32 indexed reportHash, address indexed attester, uint8 band, uint256 timestamp)`: Emitted on attestation.