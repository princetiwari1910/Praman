const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const contractAddress = require("../deployed.json").address;
  const attestationRegistry = await ethers.getContractAt("AttestationRegistry", contractAddress);

  const reportHashHex = process.argv[2];  // Already a hex SHA-256
  const band = Number(process.argv[3]);

  console.log("Attesting report hash:", reportHashHex, "with band:", band);

  // Use the hash directly as provided
  const tx = await attestationRegistry.attest(reportHashHex, band);
  await tx.wait();
  console.log("Attestation submitted. Tx hash:", tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
