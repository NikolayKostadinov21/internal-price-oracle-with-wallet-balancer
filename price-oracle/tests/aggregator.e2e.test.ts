import { describe, it, expect, beforeEach } from 'vitest';
import { PriceOracleAggregator } from '../src/services/oracle/aggregator';
import { DEFAULTS, LiquidityTier, TokenConfig } from '../src/types';
import {
    MockChainlinkAdapter,
    MockPythAdapter,
    MockUniswapV3TwapAdapter,
} from './mocks/MockAdapters';
import { InMemoryConfigRepo, InMemoryLastGoodStore } from './mocks/MockConfigAndStore';
import { toScaledBigInt } from './helpers/scaling';

const T0 = Math.floor(Date.now() / 1000);

function mk(source: 'chainlink' | 'pyth' | 'uniswap_v3_twap', dec: string, d: number, at: number, meta?: Record<string, unknown>) {
    return { source, price: toScaledBigInt(dec, d), priceDecimals: d, at, meta };
}

describe('PriceOracleAggregator - end-to-end sequence', () => {
    const token = 'ARB';
    let chainlink: MockChainlinkAdapter;
    let pyth: MockPythAdapter;
    let univ3: MockUniswapV3TwapAdapter;

    let cfgRepo: InMemoryConfigRepo;
    let store: InMemoryLastGoodStore;
    let agg: PriceOracleAggregator;

    beforeEach(() => {
        chainlink = new MockChainlinkAdapter();
        pyth = new MockPythAdapter();
        univ3 = new MockUniswapV3TwapAdapter();

        cfgRepo = new InMemoryConfigRepo();
        store = new InMemoryLastGoodStore();

        const cfg: TokenConfig = {
            address: '0xARB',
            symbol: 'ARB',
            chainId: 42161,
            liquidityTier: LiquidityTier.MID,
            primaryOracle: 'pyth',
            fallbackOracles: ['chainlink', 'uniswap_v3_twap'],
            minLiquidity: BigInt('500000000000000000000'),
            twapWindow: 1800,
            allowedPools: ['0xPoolARB'],
            ttlBySource: {
                chainlink: DEFAULTS.ttl.chainlink,
                pyth: DEFAULTS.ttl.pyth,
                uniswap_v3_twap: DEFAULTS.ttl.uniswap_v3_twap,
            },
            epsilon: 0.015,
            deltaBps: 200,
        };

        cfgRepo.setTokenConfig(token, cfg);
        agg = new PriceOracleAggregator(chainlink, pyth, univ3, cfgRepo as any, store as any);
    });

    it('sequence: normal → normal (CL stale) → degraded → frozen', async () => {
        // Initial state: normal mode with 2 valid sources
        chainlink.setPrice(token, mk('chainlink', '1.50', 8, T0));
        pyth.setPrice(token, mk('pyth', '1.49', 18, T0, { confidence: toScaledBigInt('0.005', 18) }));
        const r1 = await agg.getConsolidatedPrice(token);
        expect(r1.mode).toBe('normal');
        expect(r1.sourcesUsed).toHaveLength(2);

        // Chainlink becomes stale, but still normal with Pyth + Uniswap
        chainlink.setPrice(token, mk('chainlink', '1.55', 8, T0 - 100000)); // Very old
        univ3.setPrice(token, mk('uniswap_v3_twap', '1.51', 18, T0, {
            poolAddress: '0xPoolARB',
            windowSec: 1800,
            harmonicMeanLiquidity: BigInt('800000000000000000000')
        }));
        const r2 = await agg.getConsolidatedPrice(token);
        expect(r2.mode).toBe('normal');
        expect(r2.sourcesUsed).toHaveLength(2);

        // Pyth confidence too high, degraded mode
        pyth.setPrice(token, mk('pyth', '1.50', 18, T0, { confidence: toScaledBigInt('0.04', 18) }));
        const r3 = await agg.getConsolidatedPrice(token);
        expect(r3.mode).toBe('degraded');
        expect(r3.sourcesUsed).toHaveLength(1);

        // Uniswap fails validation, frozen mode using last known
        univ3.setPrice(token, mk('uniswap_v3_twap', '1.52', 18, T0, {
            poolAddress: '0xPoolARB',
            windowSec: 600, // Below required 1800s
            harmonicMeanLiquidity: BigInt('1') // Below liquidity threshold
        }));
        const r4 = await agg.getConsolidatedPrice(token);
        expect(r4.mode).toBe('frozen');
        expect(r4.price).toBe(r3.price); // Uses last known price
    });

    it('recovery from frozen state', async () => {
        // First, set up a valid state to get a last-good price
        chainlink.setPrice(token, mk('chainlink', '1.50', 8, T0));
        pyth.setPrice(token, mk('pyth', '1.49', 18, T0, { confidence: toScaledBigInt('0.005', 18) }));

        const initial = await agg.getConsolidatedPrice(token);
        expect(initial.mode).toBe('normal');

        // Now make all sources invalid to trigger frozen mode
        chainlink.setPrice(token, mk('chainlink', '1.50', 8, T0 - 100000)); // Stale
        pyth.setPrice(token, mk('pyth', '1.49', 18, T0 - 100000, { confidence: toScaledBigInt('0.04', 18) })); // High confidence
        univ3.setPrice(token, mk('uniswap_v3_twap', '1.51', 18, T0 - 100000, {
            poolAddress: '0xPoolARB',
            windowSec: 600,
            harmonicMeanLiquidity: BigInt('1')
        }));

        const frozen = await agg.getConsolidatedPrice(token);
        expect(frozen.mode).toBe('frozen');

        // Recovery: Pyth becomes valid
        pyth.setPrice(token, mk('pyth', '1.50', 18, T0, { confidence: toScaledBigInt('0.005', 18) }));
        const recovered = await agg.getConsolidatedPrice(token);
        expect(recovered.mode).toBe('degraded');
        expect(recovered.sourcesUsed).toHaveLength(1);
    });
});
