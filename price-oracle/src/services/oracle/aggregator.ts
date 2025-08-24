import { ConsolidatedPrice, PriceData, OracleValidation, TokenConfig, LastGoodStore, OracleConfig, DEFAULTS, OracleSource } from "../../types";

// Single canonical scale to normalize prices for median/divergence
const SCALE_DECIMALS = 18;

export class PriceOracleAggregator {
    constructor(
        private chainlinkOracle: { getPrice: (token: string, params?: any) => Promise<any> },
        private pythOracle: { getPrice: (token: string, params?: any) => Promise<any> },
        private uniswapV3Oracle: { getPrice: (token: string, params?: any) => Promise<any> },
        private configRepo: OracleConfig,
        private lastGoodStore: LastGoodStore
    ) { }

    /**
     * Orchestrates full consolidation of a token's price.
     *
     * Flow:
     * 1. Load TokenConfig (thresholds, TWAP params, etc.).
     * 2. Gather candidate prices from all oracles.
     * 3. Validate each candidate via isValid().
     * 4. Aggregate based on #valid:
     *    - 0 valid → return last-good (mode = frozen).
     *    - 1 valid → return that price (mode = degraded).
     *    - ≥2 valid → median of valid (mode = normal).
     * 5. Log divergence warnings if sources disagree.
     * 6. Persist consolidated result into LastGoodStore.
     *
     * Returns: ConsolidatedPrice (source = 'nexo', with audit trail of inputs).
     */
    async getConsolidatedPrice(token: string): Promise<ConsolidatedPrice> {
        const tokenConfig = await this.configRepo.getTokenConfig(token);
        const candidates = await this.gatherOraclePrices(token, tokenConfig);
        console.log(`[DEBUG] Total candidates gathered:`, candidates.length);
        console.log(`[DEBUG] About to validate ${candidates.length} candidates for ${token}`);
        const validated = candidates.filter((price) => this.isValid(price, tokenConfig));
        console.log(`[DEBUG] Validated candidates:`, validated.length);
        if (validated.length === 0) {
            const last = await this.lastGoodStore.getLastGood(token);
            if (!last) throw new Error(`No valid price and no last-good for ${token}`);
            const frozen: ConsolidatedPrice = {
                ...last,
                source: 'nexo',
                mode: 'frozen',
                sourcesUsed: [],
            };
            await this.lastGoodStore.putLastGood(token, frozen);
            return frozen;
        }

        this.checkDivergence(validated, tokenConfig);

        if (validated.length === 1) {
            const only = validated[0];
            const consolidated: ConsolidatedPrice = {
                source: 'nexo',
                price: only.price,
                priceDecimals: only.priceDecimals,
                at: Math.floor(Date.now() / 1000),
                timestamp: Date.now(),
                lastUpdated: Date.now(),
                volume24h: undefined,
                mode: 'degraded',
                sourcesUsed: validated.map(({ source, price, priceDecimals, at }) => ({
                    source,
                    price,
                    priceDecimals,
                    at,
                })),
            };
            await this.lastGoodStore.putLastGood(token, consolidated);
            return consolidated;
        }

        // ≥ 2 valid → median (normalize to SCALE_DECIMALS)
        const median = this.calculateMedianPrice(validated);
        const consolidated: ConsolidatedPrice = {
            source: 'nexo',
            price: median.price,
            priceDecimals: median.priceDecimals,
            at: Math.floor(Date.now() / 1000),
            timestamp: Date.now(),
            lastUpdated: Date.now(),
            volume24h: undefined,
            mode: 'normal',
            sourcesUsed: validated.map(({ source, price, priceDecimals, at }) => ({
                source,
                price,
                priceDecimals,
                at,
            })),
        };
        await this.lastGoodStore.putLastGood(token, consolidated);
        return consolidated;
    }

    /**
     * Validates a single oracle price against freshness & quality rules.
     *
     * Checks applied:
     * 1. **Staleness (TTL)**:
     *    - If (now - at) > source TTL → stale → invalid.
     *    - TTL comes from tokenConfig.ttlBySource or DEFAULTS.
     *
     * 2. **Pyth confidence interval**
     *    - confidenceRatio = confidence / price
     *    - If confidenceRatio > epsilon → too uncertain → invalid.
     *
     * 3. **Uniswap v3 TWAP guards**
     *    - poolAddress ∈ allowedPools
     *    - windowSec ≥ tokenConfig.twapWindow
     *    - harmonicMeanLiquidity ≥ tokenConfig.minLiquidity
     *
     * Returns true only if all applicable checks pass.
     */
    private isValid(priceData: PriceData, config: TokenConfig): boolean {
        // Note: 'nexo' is not a valid OracleSource, so this check is not needed

        // 1. Freshness check
        const ttlOverride = config.ttlBySource?.[priceData.source];
        const ttl = ttlOverride ?? DEFAULTS.ttl[priceData.source]; // TTL_KEY_BY_SOURCE ?
        const now = Math.floor(Date.now() / 1000);
        const timeDiff = now - priceData.at;
        const isStale = timeDiff > ttl;

        console.log(`[DEBUG] Validation for ${priceData.source}:`, {
            token: config.symbol,
            price: priceData.price.toString(),
            at: priceData.at,
            atDate: new Date(priceData.at * 1000).toISOString(),
            now,
            nowDate: new Date(now * 1000).toISOString(),
            timeDiff,
            ttl,
            isStale,
            priceData
        });

        // 2. Pyth confidence check
        let confidenceOk = true;
        if (priceData.source === 'pyth' && priceData.meta && (priceData.meta as any).confidence != null) {
            const epsilon = config.epsilon ?? DEFAULTS.epsilon;
            const confidence = (priceData.meta as any).confidence;
            if (typeof confidence == 'bigint') {
                const lhs = confidence * 1_000_000n;
                const rhs = priceData.price * BigInt(Math.round(epsilon * 1_000_000));
                confidenceOk = lhs <= rhs;
            } else {
                const priceNum = this.toFloat(priceData.price, priceData.priceDecimals);
                const confNum = Number(confidence);
                confidenceOk = priceNum > 0 && confNum / priceNum <= epsilon;
            }
        }

        // 3. Uniswap TWAP guards
        let twapOk = true;
        if (priceData.source == 'uniswap_v3_twap') {
            console.log(`[DEBUG] TWAP VALIDATION START for ${priceData.source}`);

            const minLiquidity = config.minLiquidity ?? 0n;
            console.log(`[DEBUG] TWAP: minLiquidity from config:`, minLiquidity, `(type: ${typeof minLiquidity})`);

            const twapWindow = config.twapWindow ?? 0;
            console.log(`[DEBUG] TWAP: twapWindow from config:`, twapWindow, `(type: ${typeof twapWindow})`);

            const allowedPools = config.allowedPools ?? [];
            console.log(`[DEBUG] TWAP: allowedPools from config:`, allowedPools, `(type: ${typeof allowedPools})`);

            const liq = (priceData.meta as any)?.harmonicMeanLiquidity ?? 0n;
            console.log(`[DEBUG] TWAP: liq from meta:`, liq, `(type: ${typeof liq})`);

            const windowSec = (priceData.meta as any)?.windowSec ?? 0;
            console.log(`[DEBUG] TWAP: windowSec from meta:`, windowSec, `(type: ${typeof windowSec})`);

            const poolAddress = (priceData.meta as any)?.poolAddress;
            console.log(`[DEBUG] TWAP: poolAddress from meta:`, poolAddress, `(type: ${typeof poolAddress})`);

            console.log(`[DEBUG] TWAP: Starting validation checks...`);

            const check1 = typeof poolAddress === 'string';
            console.log(`[DEBUG] TWAP: Check 1 - poolAddress is string:`, check1, `(${typeof poolAddress} === 'string')`);

            const check2 = allowedPools.includes(poolAddress);
            console.log(`[DEBUG] TWAP: Check 2 - poolAddress in allowedPools:`, check2, `(${poolAddress} in [${allowedPools.join(', ')}])`);

            const check3 = windowSec >= twapWindow;
            console.log(`[DEBUG] TWAP: Check 3 - windowSec >= twapWindow:`, check3, `(${windowSec} >= ${twapWindow})`);

            const check4 = liq >= minLiquidity;
            console.log(`[DEBUG] TWAP: Check 4 - liq >= minLiquidity:`, check4, `(${liq} >= ${minLiquidity})`);

            twapOk = check1 && check2 && check3 && check4;
            console.log(`[DEBUG] TWAP: Final twapOk result:`, twapOk, `(${check1} && ${check2} && ${check3} && ${check4})`);
        } else {
            console.log(`[DEBUG] TWAP: Skipping TWAP validation for source:`, priceData.source);
        }


        const isValid = !isStale && confidenceOk && twapOk;
        console.log(`[DEBUG] Final validation result for ${priceData.source}:`, { isValid, isStale, confidenceOk, twapOk });
        return isValid;
    }

    /**
     * Logs anomalies where a source price deviates significantly from the median.
     *
     * Steps:
     * 1. Rescale all valid prices to a common decimal scale (18).
     * 2. Compute the median price.
     * 3. For each price:
     *    - absoluteDeviation = |price - median|
     *    - relativeDeviation = absoluteDeviation / median
     *    - relativeDeviationBps = relativeDeviation * 10,000 (basis points)
     * 4. If relativeDeviationBps > maxAllowedDeviationBps, log a warning.
     *
     * Notes:
     * - Uses basis points (1 bps = 0.01%) to measure relative deviation.
     * - This function only logs anomalies; it does not reject prices.
     */
    private checkDivergence(valid: PriceData[], config: TokenConfig): void {
        if (valid.length < 2) return;

        const scaledPrice = this.getSortedRescaledPrices(valid);
        const medianPrice = this.medianBigInt(scaledPrice);
        const maxAllowedDeviationBps = BigInt(config.deltaBps ?? DEFAULTS.deltaBps)

        for (const price of scaledPrice) {
            const absoluteDeviation = price > medianPrice ? price - medianPrice : medianPrice - price;
            const relativeDeviationBps =
                medianPrice === 0n ? 0n : (absoluteDeviation * 10_000n) / medianPrice;

            if (relativeDeviationBps > maxAllowedDeviationBps) {
                // console.warn(
                //     `[${config.symbol}] price divergence ${relativeDeviationBps} bps > ${maxAllowedDeviationBps} bps`
                // );
            }
        }
    }

    /**
     * Collects candidate prices from all oracle adapters.
     * - Chainlink, Pyth, API3 → direct calls
     * - Uniswap v3 TWAP → tries each allowed pool, first success is used
     *
     * Returns all successful PriceData[] for validation/aggregation.
     */
    private async gatherOraclePrices(token: string, config: TokenConfig): Promise<PriceData[]> {
        const out: PriceData[] = [];

        // Chainlink
        try {
            const chainlink = await this.chainlinkOracle.getPrice(token);
            console.log(`[DEBUG] Chainlink response for ${token}:`, chainlink);
            if (chainlink?.success && chainlink.data) out.push(chainlink.data as PriceData);
        } catch (e) {
            console.warn(`Chainlink fetch failed for ${token}:`, e);
        }

        // Pyth
        try {
            const pyth = await this.pythOracle.getPrice(token);
            if (pyth?.success && pyth.data) out.push(pyth.data as PriceData);
        } catch (e) {
            // console.warn(`Pyth fetch failed for ${token}:`, e);
        }

        // Uniswap v3 TWAP (first valid pool)
        if (config.allowedPools && config.allowedPools.length > 0 && config.twapWindow) {
            console.log(`[DEBUG] Attempting Uniswap V3 TWAP for ${token} with pools:`, config.allowedPools);
            for (const poolAddress of config.allowedPools) {
                try {
                    console.log(`[DEBUG] Trying Uniswap V3 pool: ${poolAddress} for ${token}`);
                    const tw = await this.uniswapV3Oracle.getPrice(token, {
                        poolAddress,
                        windowSec: config.twapWindow
                    });
                    console.log(`[DEBUG] Uniswap V3 response for ${token} (pool ${poolAddress}):`, tw);
                    if (tw?.success && tw.data) {
                        console.log(`[DEBUG] Adding Uniswap V3 data to candidates for ${token}:`, tw.data);
                        out.push(tw.data as PriceData);
                        console.log(`[DEBUG] Candidates array length after adding Uniswap V3:`, out.length);
                        break;
                    } else {
                        console.log(`[DEBUG] Uniswap V3 response invalid for ${token} (pool ${poolAddress}):`, { success: tw?.success, hasData: !!tw?.data });
                    }
                } catch (e) {
                    console.log(`[DEBUG] Uniswap V3 error for ${token} (pool ${poolAddress}):`, e);
                }
            }
        } else {
            console.log(`[DEBUG] Skipping Uniswap V3 for ${token}:`, {
                hasAllowedPools: !!config.allowedPools,
                allowedPoolsLength: config.allowedPools?.length,
                hasTwapWindow: !!config.twapWindow,
                twapWindow: config.twapWindow
            });
        }

        // API3 excluded per assignment requirements

        console.log(`[DEBUG] Final candidates array for ${token}:`, out.map(c => ({ source: c.source, price: c.price.toString() })));
        return out;
    }

    /**
     * Calculates the median price from multiple sources.
     * - First rescales all inputs to a common decimal scale (18).
     * - Then sorts and applies `medianBigInt`.
     *
     * Returns a bigint price with its decimals.
     */
    private calculateMedianPrice(valid: PriceData[]): { price: bigint; priceDecimals: number } {
        const scaled = this.getSortedRescaledPrices(valid)
        const m = this.medianBigInt(scaled);
        return { price: m, priceDecimals: SCALE_DECIMALS };
    }

    /**
     * Rescales a bigint price between decimal systems.
     * - If fromDecimals > toDecimals → divide
     * - If fromDecimals < toDecimals → multiply
     *
     * Example:
     *   Chainlink (8 decimals): 200000000000n → $2000
     *   Rescale to 18 decimals → 2000000000000000000000n
     */
    private rescale(value: bigint, fromDecimals: number, toDecimals: number): bigint {
        if (fromDecimals === toDecimals) return value;

        if (fromDecimals > toDecimals) {
            return value / (10n ** BigInt(fromDecimals - toDecimals));
        } else {
            return value * (10n ** BigInt(toDecimals - fromDecimals));
        }
    }

    /**
     * Returns the median of a sorted bigint array.
     * - Odd length → middle element
     * - Even length → average of two middle
     * Assumes values are sorted & rescaled to the same decimals.
     */
    private medianBigInt(values: bigint[]): bigint {
        const n = values.length;
        const mid = n >> 1;
        return (n & 1)
            ? values[mid]
            : (values[mid - 1] + values[mid]) / 2n;
    }

    /**
     * Rescales all prices to the target decimals and returns a sorted array.
     * Useful before median or divergence checks.
     */
    private getSortedRescaledPrices(
        values: PriceData[],
        targetDecimals = SCALE_DECIMALS
    ): bigint[] {
        return values
            .map((v) => this.rescale(v.price, v.priceDecimals, targetDecimals))
            .sort((a, b) => (a > b ? 1 : -1));
    }

    /// Only for logging
    private toFloat(value: bigint, decimals: number): number {
        const s = value.toString();
        if (decimals === 0) return Number(s);
        const pad = decimals - s.length + 1;
        if (pad > 0) return Number(`0.${'0'.repeat(pad)}${s}`);
        const int = s.slice(0, s.length - decimals);
        const frac = s.slice(s.length - decimals);
        return Number(`${int}.${frac}`);
    }
}
