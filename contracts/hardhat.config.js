import "@nomicfoundation/hardhat-toolbox";
import fs from "fs";
export default {
  solidity: "0.8.20",
  paths: {
    // Keep artifacts and cache next to the config for simplicity
    artifacts: "./artifacts",
    cache: "./.cache",
  },
};
