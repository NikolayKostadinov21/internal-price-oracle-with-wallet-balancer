import { WalletBalancer } from '../../index';
import { MockChainAdapter } from './MockChainAdapter';
import { MockPriceOracle } from './MockPriceOracle';

export interface TestMocks {
    getBalance?: () => Promise<bigint>;
    sendNative?: () => Promise<string>;
    waitForReceipt?: () => Promise<{ success: boolean; blockNumber: number }>;
}

export interface PriceOracleConfig {
    prices: number[];
    interval?: number; // ms between price updates
}

/**
 * Starts a mock price-oracle service that emits price updates
 */
export async function startPriceOracle(config: PriceOracleConfig) {
    const mockOracle = new MockPriceOracle(config.prices, config.interval || 1000);

    await mockOracle.start();

    return {
        stop: async () => await mockOracle.stop(),
        emitPrice: (price: number) => mockOracle.emitPrice(price),
        getCurrentPrice: () => mockOracle.getCurrentPrice(),
        mockOracle
    };
}

/**
 * Starts a wallet-balancer service with mocked blockchain interactions
 */
export async function startWalletBalancer(options: { mocks: TestMocks }) {
    // Create mock chain adapter
    const mockChainAdapter = new MockChainAdapter(options.mocks);

    // Start wallet balancer directly (no container needed)
    const walletBalancer = new WalletBalancer();
    await walletBalancer.start();

    return {
        stop: async () => await walletBalancer.stop(),
        service: walletBalancer.getService(),
        mockChainAdapter,
        // Provide access to the main wallet balancer instance
        walletBalancer
    };
}
