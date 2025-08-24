import { createContainer as createAwilixContainer, AwilixContainer, asValue } from 'awilix';
import { PriceOracleAggregator } from './oracle/aggregator';
import { InMemoryConfigRepo } from '../../tests/mocks/MockConfigAndStore';
import { InMemoryLastGoodStore } from '../../tests/mocks/MockConfigAndStore';
import { LiquidityTier, OracleSource } from '../types';

// Real Chainlink adapter
import { ChainlinkAdapter } from './oracle/adapters/ChainlinkAdapter';

// Real Pyth adapter
import { PythAdapter } from './oracle/adapters/PythAdapter';

// Real Uniswap V3 adapter
import { UniswapV3Adapter } from './oracle/adapters/UniswapV3Adapter';

// Mock adapters for development/testing (keeping others as mocks for now)
import { MockApi3Adapter } from '../../tests/mocks/MockAdapters';

export function createContainer(): AwilixContainer {
    const container = createAwilixContainer();

    // Create real Chainlink and Pyth adapters, mock adapters for others
    const chainlinkOracle = new ChainlinkAdapter();
    const pythOracle = new PythAdapter();
    const uniswapV3Oracle = new UniswapV3Adapter(process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo');
    const api3Oracle = new MockApi3Adapter();

    // Create configuration and storage
    const configRepo = new InMemoryConfigRepo();
    const lastGoodStore = new InMemoryLastGoodStore();

    // Initialize token configurations for testing
    const ethConfig = {
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Real WETH address
        symbol: 'ETH',
        chainId: 1,
        liquidityTier: LiquidityTier.DEEP,
        primaryOracle: 'chainlink' as const,
        fallbackOracles: ['pyth', 'uniswap_v3_twap'] as OracleSource[],
        minLiquidity: BigInt('1000000000000000000'), // Conservative threshold for Uniswap V3 raw liquidity units
        twapWindow: 3600,
        allowedPools: ['0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8'], // Real ETH/USDC pool
        ttlBySource: {
            chainlink: 3600, // Increased to 3600 seconds (1 hour) to prevent premature staleness
            pyth: 30,
            uniswap_v3_twap: 1800,
            api3: 300,
        },
        epsilon: 0.01,
        deltaBps: 150,
    };

    const btcConfig = {
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // Real WBTC address
        symbol: 'BTC',
        chainId: 1,
        liquidityTier: LiquidityTier.DEEP,
        primaryOracle: 'chainlink' as const,
        fallbackOracles: ['pyth', 'uniswap_v3_twap'] as OracleSource[],
        minLiquidity: BigInt('1000000000000000000'), // Conservative threshold for Uniswap V3 raw liquidity units
        twapWindow: 3600,
        allowedPools: ['0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35'], // Real WBTC/USDC pool
        ttlBySource: {
            chainlink: 3600, // Increased to 3600 seconds (1 hour) to prevent premature staleness
            pyth: 30,
            uniswap_v3_twap: 1800,
            api3: 300,
        },
        epsilon: 0.01,
        deltaBps: 150,
    };

    const usdcConfig = {
        address: '0xA0b86991c6218b36c1d19d4a2e9Eb0cE3606eB48', // Real USDC address
        symbol: 'USDC',
        chainId: 1,
        liquidityTier: LiquidityTier.DEEP,
        primaryOracle: 'chainlink' as const,
        fallbackOracles: ['pyth', 'uniswap_v3_twap'] as OracleSource[],
        minLiquidity: BigInt('1000000000000000000'), // Conservative threshold for Uniswap V3 raw liquidity units
        twapWindow: 3600,
        allowedPools: ['0x7858E9e971Fa69A63C01a7bA06b6b5Fc7df3dfa6'], // Real USDC/USDT pool
        ttlBySource: {
            chainlink: 3600, // Increased to 3600 seconds (1 hour) to prevent premature staleness
            pyth: 30,
            uniswap_v3_twap: 1800,
            api3: 300,
        },
        epsilon: 0.01,
        deltaBps: 150,
    };

    configRepo.setTokenConfig('ETH', ethConfig);
    configRepo.setTokenConfig('BTC', btcConfig);
    configRepo.setTokenConfig('USDC', usdcConfig);

    // Create main aggregator with proper constructor parameters
    const priceOracleAggregator = new PriceOracleAggregator(
        chainlinkOracle,
        pythOracle,
        uniswapV3Oracle,
        api3Oracle,
        configRepo,
        lastGoodStore
    );

    // Register services
    container.register({
        chainlinkOracle: asValue(chainlinkOracle),
        pythOracle: asValue(pythOracle),
        uniswapV3Oracle: asValue(uniswapV3Oracle),
        api3Oracle: asValue(api3Oracle),
        configRepo: asValue(configRepo),
        lastGoodStore: asValue(lastGoodStore),
        priceOracleAggregator: asValue(priceOracleAggregator)
    });

    return container;
}
