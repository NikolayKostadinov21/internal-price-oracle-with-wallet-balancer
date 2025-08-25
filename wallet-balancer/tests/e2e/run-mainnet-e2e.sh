#!/bin/bash

echo "Starting Real Mainnet E2E Tests"
echo "=================================="

# Check if price-oracle service is running
echo "Checking if price-oracle service is running..."
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "Price-oracle service not running on localhost:3000"
    echo "Please start the price-oracle service first:"
    echo "cd ../price-oracle && docker-compose up -d"
    echo "# or start the service directly"
    exit 1
fi

echo "Price-oracle service is running"

# Check if wallet-balancer database is ready
echo "Checking database connection..."
if ! mysql -h localhost -P 3308 -u balancer_user -p1234 -e "USE wallet_balancer_test;" 2>/dev/null; then
    echo "Database connection failed"
    echo "Please ensure the database is running:"
    echo "docker-compose up -d mysql"
    exit 1
fi

echo "Database connection successful"

# Set environment variables for mainnet testing
export NODE_ENV=test
export ETHEREUM_CHAIN_ID=1
export ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/demo
export CHAINLINK_API_KEY=d203ee46c15e47f786d52429a9dfba6b
export PYTH_API_KEY=d203ee46c15e47f786d52429a9dfba6b
export UNISWAP_V3_API_KEY=d203ee46c15e47f786d52429a9dfba6b

echo "API keys configured for mainnet testing"
echo "Using real mainnet oracle data"
echo "Monitoring ETH prices"

# Run the mainnet E2E tests
echo "Running mainnet E2E tests..."
yarn test tests/e2e/real-e2e.test.ts --reporter=verbose

echo "Mainnet E2E tests completed!"
