import { createContainer as createAwilixContainer, AwilixContainer, asValue } from 'awilix';
import { PriceOracleAggregator } from './oracle/aggregator';
import { InMemoryConfigRepo } from '../../tests/mocks/MockConfigAndStore';
import { InMemoryLastGoodStore } from '../../tests/mocks/MockConfigAndStore';
import { LiquidityTier, OracleSource } from '../types';

// Mock adapters for development/testing
import { MockChainlinkAdapter } from '../../tests/mocks/MockAdapters';
import { MockPythAdapter } from '../../tests/mocks/MockAdapters';
import { MockUniswapV3TwapAdapter } from '../../tests/mocks/MockAdapters';
import { MockApi3Adapter } from '../../tests/mocks/MockAdapters';

export function createContainer(): AwilixContainer {
    const container = createAwilixContainer();

    // Create mock adapters
    const chainlinkOracle = new MockChainlinkAdapter();
    const pythOracle = new MockPythAdapter();
    const uniswapV3Oracle = new MockUniswapV3TwapAdapter();
    const api3Oracle = new MockApi3Adapter();

    // Create configuration and storage
    const configRepo = new InMemoryConfigRepo();
    const lastGoodStore = new InMemoryLastGoodStore();

    // Initialize mock data for testing
    const mockTokenConfig = {
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
            chainlink: 300,
            pyth: 30,
            uniswap_v3_twap: 1800,
            api3: 300,
        },
        epsilon: 0.01,
        deltaBps: 150,
    };

    configRepo.setTokenConfig('ETH', mockTokenConfig);

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
