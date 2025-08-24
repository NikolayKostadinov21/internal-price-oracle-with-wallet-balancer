import { describe, it, expect, beforeEach } from 'vitest';
import { PriceOracleAggregator } from '../src/services/oracle/aggregator';
import { DEFAULTS, LiquidityTier, OracleSource, PriceData, TokenConfig } from '../src/types';
import {
    MockApi3Adapter,
    MockChainlinkAdapter,
    MockPythAdapter,
    MockUniswapV3TwapAdapter,
} from './mocks/MockAdapters';
import { InMemoryConfigRepo, InMemoryLastGoodStore } from './mocks/MockConfigAndStore';
import { toScaledBigInt } from './helpers/scaling';

const NOW = Math.floor(Date.now() / 1000);

function mkPrice(
    source: Exclude<OracleSource, 'meta'>,
    decimalStr: string,
    priceDecimals: number,
    at: number,
    meta?: Record<string, unknown>
): PriceData {
    return {
        source,
        price: toScaledBigInt(decimalStr, priceDecimals),
        priceDecimals,
        at,
        meta,
    } as PriceData;
}

describe('PriceOracleAggregator - integration', () => {
    const token = 'ETH';
    let chainlink: MockChainlinkAdapter;
    let pyth: MockPythAdapter;
    let univ3: MockUniswapV3TwapAdapter;
    let api3: MockApi3Adapter;
    let cfgRepo: InMemoryConfigRepo;
    let store: InMemoryLastGoodStore;
    let agg: PriceOracleAggregator;

    beforeEach(() => {
        chainlink = new MockChainlinkAdapter();
        pyth = new MockPythAdapter();
        univ3 = new MockUniswapV3TwapAdapter();
        api3 = new MockApi3Adapter();
        cfgRepo = new InMemoryConfigRepo();
        store = new InMemoryLastGoodStore();

        const tokenCfg: TokenConfig = {
            address: '0xETH',
            symbol: 'ETH',
            chainId: 1,
            liquidityTier: LiquidityTier.DEEP,
            primaryOracle: 'chainlink',
            fallbackOracles: ['pyth', 'uniswap_v3_twap'],
            minLiquidity: BigInt('1000000000000000000000'),
            twapWindow: 3600,
            allowedPools: ['0xPool'],
            ttlBySource: {
                chainlink: DEFAULTS.ttl.chainlink,
                pyth: DEFAULTS.ttl.pyth,
                uniswap_v3_twap: DEFAULTS.ttl.uniswap_v3_twap,
                api3: DEFAULTS.ttl.api3,
            },
            epsilon: 0.01,
            deltaBps: 150,
        };

        cfgRepo.setTokenConfig(token, tokenCfg);

        agg = new PriceOracleAggregator(
            chainlink,
            pyth,
            univ3,
            api3,
            cfgRepo as any,
            store as any
        );
    });

    it('median math across mixed decimals → mode normal', async () => {
        chainlink.setPrice(token, mkPrice('chainlink', '2000.00', 8, NOW));
        pyth.setPrice(token, mkPrice('pyth', '1999.90', 18, NOW, {
            confidence: toScaledBigInt('0.50', 18)
        }));
        univ3.setPrice(token, mkPrice('uniswap_v3_twap', '2001.00', 18, NOW, {
            poolAddress: '0xPool',
            windowSec: 3600,
            harmonicMeanLiquidity: BigInt('2000000000000000000000'),
        }));

        const res = await agg.getConsolidatedPrice(token);
        expect(res.mode).toBe('normal');
        expect(res.priceDecimals).toBe(18);
        expect(res.price).toBe(toScaledBigInt('2000.00', 18));
    });

    it('pyth confidence rejection → mode degraded', async () => {
        chainlink.setPrice(token, mkPrice('chainlink', '2000.00', 8, NOW));
        pyth.setPrice(token, mkPrice('pyth', '1999.90', 18, NOW, {
            confidence: toScaledBigInt('50.00', 18) // 2.5% confidence, above 1% threshold
        }));

        const res = await agg.getConsolidatedPrice(token);
        expect(res.mode).toBe('degraded');
        expect(res.sourcesUsed).toHaveLength(1);
        expect(res.sourcesUsed[0].source).toBe('chainlink');
    });

    it('twap liquidity validation failure', async () => {
        chainlink.setPrice(token, mkPrice('chainlink', '2000.00', 8, NOW));
        univ3.setPrice(token, mkPrice('uniswap_v3_twap', '2001.00', 18, NOW, {
            poolAddress: '0xPool',
            windowSec: 3600,
            harmonicMeanLiquidity: BigInt('100000000000000000000'), // Below 1M threshold
        }));

        const res = await agg.getConsolidatedPrice(token);
        expect(res.mode).toBe('degraded');
        expect(res.sourcesUsed).toHaveLength(1);
        expect(res.sourcesUsed[0].source).toBe('chainlink');
    });

    it('stale price rejection', async () => {
        chainlink.setPrice(token, mkPrice('chainlink', '2000.00', 8, NOW - 400)); // 6.7 minutes old
        pyth.setPrice(token, mkPrice('pyth', '1999.90', 18, NOW, {
            confidence: toScaledBigInt('0.50', 18)
        }));

        const res = await agg.getConsolidatedPrice(token);
        expect(res.mode).toBe('degraded');
        expect(res.sourcesUsed).toHaveLength(1);
        expect(res.sourcesUsed[0].source).toBe('pyth');
    });

    it('divergence detection without rejection', async () => {
        chainlink.setPrice(token, mkPrice('chainlink', '2000.00', 8, NOW));
        pyth.setPrice(token, mkPrice('pyth', '2100.00', 18, NOW, {
            confidence: toScaledBigInt('0.50', 18)
        })); // 5% divergence, above 1.5% threshold

        const res = await agg.getConsolidatedPrice(token);
        expect(res.mode).toBe('normal'); // Still accepted due to validation passing
        expect(res.sourcesUsed).toHaveLength(2);
    });
});
