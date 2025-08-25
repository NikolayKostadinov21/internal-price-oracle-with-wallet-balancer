# Wallet Balancer E2E Tests

This directory contains end-to-end tests that simulate the complete flow from price oracle to wallet execution.

## Test Structure

### E2E Tests

- **`price-trigger-flow.test.ts`** - Tests the complete flow when ETH price drops below threshold

### Test Utilities

- **`testServices.ts`** - Utilities to start mock price-oracle and wallet-balancer services
- **`MockChainAdapter.ts`** - Mock blockchain interactions (balance checks, transactions)
- **`MockPriceOracle.ts`** - Mock price feed that emits price updates

## Test Flow

The E2E test simulates this complete flow:

1. **Price Oracle** fetches prices from mocked adapters (Chainlink/Pyth/Uniswap)
2. **Aggregator** consolidates prices and emits consolidated price
3. **Wallet Balancer** subscribes to price updates
4. **Trigger** fires when price crosses threshold ($2100 → $1950)
5. **Planner** produces transfer intent (idempotent)
6. **Executor** executes intent (mocked EOA transfer)
7. **Status** transitions to MINED_SUCCESS

## Running Tests

### Prerequisites

- Docker services running (MySQL, Redis)
- Wallet balancer service built and running

### Run E2E Tests

```bash
# From wallet-balancer directory
yarn test tests/e2e/price-trigger-flow.test.ts

# Or run all tests
yarn test
```

### Test Configuration

The test uses these mock configurations:

- **Price Sequence**: $2100 → $1950 (triggers at $2000 threshold)
- **Transfer Amount**: 50% of 10 ETH = 5 ETH
- **Execution Mode**: EOA (Externally Owned Account)
- **Mock Transaction**: Returns `0xabc123` hash

## Test Assertions

The test verifies:

- ✅ Trigger creation and configuration
- ✅ Transfer intent execution
- ✅ Idempotency (no duplicate intents)
- ✅ Audit trail completeness
- ✅ Status transitions (PLANNED → SUBMITTED → MINED_SUCCESS)

## Mock Services

### MockPriceOracle

- Emits price updates at configurable intervals
- Simulates real price oracle behavior
- Configurable price sequences for testing

### MockChainAdapter

- Mocks blockchain interactions
- Returns configurable balances and transaction hashes
- Simulates transaction confirmation

## Future Enhancements

- **Real Price Oracle Integration**: Connect to actual price-oracle service
- **Safe Multisig Testing**: Test Safe transaction proposals and execution
- **Error Scenarios**: Test failure modes and recovery
- **Performance Testing**: Load testing with multiple triggers
- **Network Testing**: Test different blockchain networks
