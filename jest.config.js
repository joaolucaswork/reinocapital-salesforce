// @ts-check
const { jestConfig } = require("@salesforce/sfdx-lwc-jest/config");

module.exports = {
  ...jestConfig,
  moduleNameMapper: {
    "^lightning/platformShowToastEvent$":
      "<rootDir>/force-app/test/jest-mocks/lightning/platformShowToastEvent",
    "^lightning/navigation$":
      "<rootDir>/force-app/test/jest-mocks/lightning/navigation",
    "^lightning/platformViewManager$":
      "<rootDir>/force-app/test/jest-mocks/lightning/platformViewManager"
  },
  testEnvironment: "jsdom",
  setupFiles: ["jest-canvas-mock"],
  modulePathIgnorePatterns: ["<rootDir>/.localdevserver"],
  transformIgnorePatterns: ["/node_modules/(?!@salesforce)"]
};
