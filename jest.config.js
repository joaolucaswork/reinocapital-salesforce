// @ts-check
const config = require("@salesforce/sfdx-lwc-jest/config");

/** @type {import('@jest/types').Config.InitialOptions} */
const jestConfig = {
  ...config,
  modulePathIgnorePatterns: ["<rootDir>/.localdevserver"]
};

module.exports = jestConfig;
