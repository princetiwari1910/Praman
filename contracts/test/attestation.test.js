const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AttestationRegistry", function () {
  let registry, owner;
  const hash = ethers.id("demo-report");

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const F = await ethers.getContractFactory("AttestationRegistry");
    registry = await F.deploy();
    await registry.waitForDeployment();
  });

  it("attest works", async function () {
    await registry.attest(hash, 3);
    const rec = await registry.get(hash);
    expect(rec[0]).to.equal(owner.address);
    expect(rec[2]).to.equal(3);
    expect(rec[1] > 0n).to.equal(true);
  });

  it("duplicate attest reverts", async function () {
    await registry.attest(hash, 1);
    await expect(registry.attest(hash, 1)).to.be.reverted;
  });

  it("band 4 reverts", async function () {
    await expect(registry.attest(hash, 4)).to.be.reverted;
  });

  it("emits Attested", async function () {
    await expect(registry.attest(hash, 2)).to.emit(registry, "Attested");
  });
});