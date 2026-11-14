const { ethers, network } = require("hardhat");
const BANDS = { low: 0, medium: 1, high: 2, severe: 3 };

async function main() {
  if (network.name !== "hardhat") throw new Error("demo-attest only runs on the in-process hardhat network");
  const hash = (process.env.REPORT_HASH || "").trim().replace(/^0[xX]/, "");
  const band = (process.env.BAND || "").toLowerCase();
  if (!/^[0-9a-fA-F]{64}$/.test(hash)) throw new Error("REPORT_HASH must be 64 hex characters");
  if (!(band in BANDS)) throw new Error("BAND must be low, medium, high or severe");
  const [signer] = await ethers.getSigners();
  const F = await ethers.getContractFactory("AttestationRegistry", signer);
  const registry = await F.deploy();
  await registry.waitForDeployment();
  const h = "0x" + hash;
  await (await registry.attest(h, BANDS[band])).wait();
  const rec = await registry.get(h);
  console.log("LOCAL DEMO - not legal proof");
  console.log(JSON.stringify({ contract: await registry.getAddress(), reportHash: h, attester: rec[0], timestamp: rec[1].toString(), band: Number(rec[2]) }, null, 2));
}
main().catch((e) => { console.error(e.message); process.exit(1); });