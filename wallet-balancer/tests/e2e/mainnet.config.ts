// Mainnet E2E Test Configuration
export const MAINNET_CONFIG = {
    // Ethereum Mainnet
    CHAIN_ID: 1,
    RPC_URL: 'https://eth-mainnet.g.alchemy.com/v2/demo',

    // Oracle API Keys
    CHAINLINK_API_KEY: 'd203ee46c15e47f786d52429a9dfba6b',
    PYTH_API_KEY: 'd203ee46c15e47f786d52429a9dfba6b',
    UNISWAP_V3_API_KEY: 'd203ee46c15e47f786d52429a9dfba6b',

    // Price Oracle Service (assuming it runs on localhost:3000)
    PRICE_ORACLE_URL: 'http://localhost:3000',
    PRICE_ORACLE_SSE_URL: 'http://localhost:3000/stream/prices',

    // ETH Configuration
    ETH: {
        ASSET_ADDRESS: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        SYMBOL: 'ETH',
        DECIMALS: 18,
        // Realistic thresholds for testing
        THRESHOLDS: {
            HOT_TO_COLD: 2000, // $2000 - move to cold wallet if ETH drops below
            COLD_TO_HOT: 2500  // $2500 - move to hot wallet if ETH rises above
        }
    },

    // Test Wallets (demo addresses)
    WALLETS: {
        HOT: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        COLD: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b7'
    },

    // Test Parameters
    TEST: {
        TIMEOUT: 30000, // 30 seconds
        PRICE_WAIT: 10000, // Wait 10 seconds for price updates
        MOVE_AMOUNT_PERCENT: 10, // Move 10% of balance
        HYSTERESIS_BPS: 50, // 0.5% hysteresis
        COOLDOWN_SEC: 60 // 1 minute cooldown
    }
};
