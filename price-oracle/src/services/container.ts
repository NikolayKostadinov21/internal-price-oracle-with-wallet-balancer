import { createContainer as createAwilixContainer, AwilixContainer, asValue } from 'awilix';
import { PriceOracleAggregator } from './oracle/aggregator';
import { InMemoryConfigRepo } from '../../tests/mocks/MockConfigAndStore';
import { InMemoryLastGoodStore } from '../../tests/mocks/MockConfigAndStore';
import { LiquidityTier, OracleSource } from '../types';

// Real Chainlink adapter
import { ChainlinkAdapter } from './oracle/adapters/ChainlinkAdapter';

// Real Pyth adapter
import { PythAdapter } from './oracle/adapters/PythAdapter';

// Mock adapters for development/testing (keeping others as mocks for now)
import { MockUniswapV3TwapAdapter } from '../../tests/mocks/MockAdapters';
import { MockApi3Adapter } from '../../tests/mocks/MockAdapters';

export function createContainer(): AwilixContainer {
    const container = createAwilixContainer();

    // Create real Chainlink and Pyth adapters, mock adapters for others
    const chainlinkOracle = new ChainlinkAdapter();
    const pythOracle = new PythAdapter();
    const uniswapV3Oracle = new MockUniswapV3TwapAdapter();
    const api3Oracle = new MockApi3Adapter();

    // Create configuration and storage
    const configRepo = new InMemoryConfigRepo();
    const lastGoodStore = new InMemoryLastGoodStore();

    // Initialize token configurations for testing
    const ethConfig = {
        address: '0xETH',
        symbol: 'ETH',
        chainId: 1,
        liquidityTier: LiquidityTier.DEEP,
        primaryOracle: 'chainlink' as const,
        fallbackOracles: ['pyth', 'uniswap_v3_twap'] as OracleSource[],
        minLiquidity: BigInt('1000000000000000000000'),
        twapWindow: 3600,
        allowedPools: ['0xPool'],
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
        address: '0xBTC',
        symbol: 'BTC',
        chainId: 1,
        liquidityTier: LiquidityTier.DEEP,
        primaryOracle: 'chainlink' as const,
        fallbackOracles: ['pyth', 'uniswap_v3_twap'] as OracleSource[],
        minLiquidity: BigInt('1000000000000000000000'),
        twapWindow: 3600,
        allowedPools: ['0xPool'],
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
        address: '0xUSDC',
        symbol: 'USDC',
        chainId: 1,
        liquidityTier: LiquidityTier.DEEP,
        primaryOracle: 'chainlink' as const,
        fallbackOracles: ['pyth', 'uniswap_v3_twap'] as OracleSource[],
        minLiquidity: BigInt('1000000000000000000000'),
        twapWindow: 3600,
        allowedPools: ['0xPool'],
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
