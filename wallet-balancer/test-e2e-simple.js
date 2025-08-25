#!/usr/bin/env node

// Simple E2E test for real-e2e.test.ts functionality
console.log("🧪 Testing E2E Functionality...");

async function testE2E() {
  try {
    // Test 1: Import mainnet config
    console.log("Testing mainnet config import...");
    const { MAINNET_CONFIG } = await import("./tests/e2e/mainnet.config.js");
    console.log("  Mainnet config imported");

    // Test 2: Validate config
    console.log("Validating mainnet configuration...");
    expect(MAINNET_CONFIG.CHAIN_ID).toBe(1);
    expect(MAINNET_CONFIG.ETH.SYMBOL).toBe("ETH");
    expect(MAINNET_CONFIG.ETH.ASSET_ADDRESS).toBe(
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    );
    console.log("  Mainnet configuration validated");

    // Test 3: Import WalletBalancer
    console.log("Testing WalletBalancer import...");
    const { WalletBalancer } = await import("./dist/index.js");
    console.log("  WalletBalancer imported");

    // Test 4: Create instance
    console.log("Creating WalletBalancer instance...");
    const walletBalancer = new WalletBalancer();
    console.log("  WalletBalancer instance created");

    // Test 5: Validate service
    console.log("Validating service...");
    const service = walletBalancer.getService();
    expect(service).toBeDefined();
    console.log("  Service validated");

    console.log("\n  E2E Test Completed Successfully!");
    console.log("  All imports working");
    console.log("  Configuration validated");
    console.log("  Service creation working");
    console.log("  Ready for enhanced E2E testing");
  } catch (error) {
    console.error("  E2E Test Failed:", error);
    process.exit(1);
  }
}

// Simple expect function for testing
function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
  };
}

// Run the test
testE2E().catch(console.error);
