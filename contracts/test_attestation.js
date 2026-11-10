import { expect } from "chai";
import hre from "hardhat";

describe("AttestationRegistry", function () {
  let attestationRegistry;

  beforeEach(async function () {
    const AttestationRegistry = await ethers.getContractFactory("AttestationRegistry");
    attestationRegistry = await AttestationRegistry.deploy();
    await attestationRegistry.waitForDeployment();
  });

  it("attest works", async function () {
    await attestationRegistry.attest("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", 1);
    const att = await attestationRegistry.get("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    expect(att.band).to.equal(1);
  });

  it("duplicate reverts", async function () {
    await attestationRegistry.attest("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", 1);
    await expect(
      attestationRegistry.attest("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", 1)
    ).to.be.reverted;
  });

  it("get returns data", async function () {
    await attestationRegistry.attest("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", 2);
    const att = await attestationRegistry.get("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    expect(att.band).to.equal(2);
  });

  it("event emitted", async function () {
    await expect(
      attestationRegistry.attest("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", 3)
    ).to.emit(attestationRegistry, "Attested");
  });
});
