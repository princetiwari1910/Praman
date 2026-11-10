const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const AttestationRegistry = await ethers.getContractFactory("AttestationRegistry");
  const attestationRegistry = await AttestationRegistry.deploy();
  
  await attestationRegistry.waitForDeployment();
  
  const contractAddress = await attestationRegistry.getAddress();
  console.log("AttestationRegistry deployed to:", contractAddress);

  const fs = require("fs");
  const deployedJson = { address: contractAddress };
  fs.writeFileSync("deployed.json", JSON.stringify(deployedJson, null, 2));
  console.log("Deployed address written to contracts/deployed.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
