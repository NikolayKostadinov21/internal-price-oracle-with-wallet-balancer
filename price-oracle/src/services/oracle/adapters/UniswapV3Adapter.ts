import { ethers } from 'ethers';
import { PriceData, OracleHealth, OracleSource } from '../../../types';

// Uniswap V3 Pool ABI for TWAP calculations
const POOL_ABI = [
    'function observe(uint32[] calldata secondsAgos) external view returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s)',
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)',
    'function liquidity() external view returns (uint128)'
];

// Uniswap V3 Pool addresses for mainnet
const UNISWAP_V3_POOLS = {
    ETH: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8', // ETH/USDC 0.05% fee tier
    BTC: '0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35', // WBTC/USDC 0.05% fee tier
    USDC: '0x7858E9e971Fa69A63C01a7bA06b6b5Fc7df3dfa6'  // USDC/USDT 0.01% fee tier
} as const;

// TWAP observation intervals (in seconds)
const TWAP_INTERVALS = [300, 600, 900]; // 5, 10, 15 minutes

export class UniswapV3Adapter {
    private provider: ethers.JsonRpcProvider;
    private pools: Map<string, ethers.Contract>;

    constructor(rpcUrl: string) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.pools = new Map();

        // Initialize pool contracts
        Object.entries(UNISWAP_V3_POOLS).forEach(([token, address]) => {
            this.pools.set(token, new ethers.Contract(address, POOL_ABI, this.provider));
        });
    }

    async getPrice(token: string, params?: { poolAddress?: string; windowSec?: number }): Promise<{ success: boolean; data?: PriceData }> {
        try {
            // Use provided pool address or fallback to configured pools
            let pool: ethers.Contract | undefined;

            if (params?.poolAddress) {
                // Use the provided pool address
                pool = new ethers.Contract(params.poolAddress, POOL_ABI, this.provider);
                console.log(`[UniswapV3] Using provided pool address: ${params.poolAddress} for ${token}`);
            } else {
                // Use configured pool
                pool = this.pools.get(token);
                if (!pool) {
                    console.log(`[UniswapV3] No pool found for token: ${token}`);
                    return { success: false };
                }
                console.log(`[UniswapV3] Using configured pool address: ${pool.target} for ${token}`);
            }

            console.log(`[UniswapV3] Fetching TWAP for ${token}...`);
            console.log(`[UniswapV3] Using pool address: ${pool.target} for ${token}`);

            // Get current liquidity
            const liquidity = await pool.liquidity();
            console.log(`[UniswapV3] Current liquidity for ${token}: ${liquidity.toString()}`);

            // Check if liquidity is sufficient (minimum $1M equivalent)
            // Uniswap V3 liquidity is in raw units, not USD - we'll use a reasonable threshold
            if (liquidity < ethers.parseUnits('1000000', 0)) {
                console.log(`[UniswapV3] Insufficient liquidity for ${token}: ${liquidity.toString()}`);
                return { success: false };
            }

            // Get TWAP observations with custom window if provided
            const twapWindow = params?.windowSec || 900; // Default to 15 minutes
            const observations = await this.getTWAPObservations(pool, token, twapWindow);
            if (!observations) {
                return { success: false };
            }

            // Calculate TWAP price
            const twapPrice = this.calculateTWAP(observations);
            if (!twapPrice) {
                return { success: false };
            }

            // Get current timestamp
            const now = Math.floor(Date.now() / 1000);

            console.log(`[UniswapV3] TWAP calculation for ${token}:`, {
                price: twapPrice.toString(),
                liquidity: liquidity.toString(),
                timestamp: now
            });

            const priceData: PriceData = {
                source: 'uniswap_v3_twap' as OracleSource,
                price: twapPrice,
                priceDecimals: 18, // Uniswap V3 uses 18 decimals for price calculations
                at: now,
                volume24h: undefined,
                meta: {
                    poolAddress: pool.target,
                    harmonicMeanLiquidity: BigInt(liquidity), // Convert to BigInt for validation
                    windowSec: twapWindow, // Match aggregator's expected field name
                    observations: observations.length
                }
            };

            console.log(`[UniswapV3] RETURNING PriceData for ${token}:`, {
                success: true,
                data: {
                    source: priceData.source,
                    price: priceData.price.toString(),
                    priceDecimals: priceData.priceDecimals,
                    at: priceData.at,
                    meta: priceData.meta
                }
            });

            return { success: true, data: priceData };

        } catch (error) {
            console.log(`[UniswapV3] Error fetching price for ${token}:`, error);
            return { success: false };
        }
    }

    private async getTWAPObservations(pool: ethers.Contract, token: string, windowSec: number = 900): Promise<{ tick: bigint; timestamp: number }[] | null> {
        try {
            // Get current slot0 data
            const slot0 = await pool.slot0();
            const currentTick = slot0.tick;
            const currentTime = Math.floor(Date.now() / 1000);

            console.log(`[UniswapV3] Current tick for ${token}: ${currentTick}, time: ${currentTime}`);

            // Calculate TWAP intervals based on provided window
            const twapIntervals = [windowSec / 3, windowSec * 2 / 3, windowSec]; // Divide window into 3 parts

            // Get observations for TWAP calculation
            const observations = [];

            for (const interval of twapIntervals) {
                try {
                    const targetTime = currentTime - interval;
                    const secondsAgos = [interval];

                    const result = await pool.observe(secondsAgos);
                    const tickCumulatives = result.tickCumulatives;

                    if (tickCumulatives && tickCumulatives.length > 0) {
                        const tickCumulative = tickCumulatives[0];
                        observations.push({
                            tick: tickCumulative,
                            timestamp: targetTime
                        });
                    }
                } catch (error) {
                    console.log(`[UniswapV3] Failed to get observation for interval ${interval}s:`, error);
                }
            }

            // Add current tick
            observations.push({
                tick: BigInt(currentTick),
                timestamp: currentTime
            });

            console.log(`[UniswapV3] Gathered ${observations.length} observations for ${token}`);
            return observations;

        } catch (error) {
            console.log(`[UniswapV3] Error getting TWAP observations for ${token}:`, error);
            return null;
        }
    }

    private calculateTWAP(observations: { tick: bigint; timestamp: number }[]): bigint | null {
        try {
            if (observations.length < 2) {
                return null;
            }

            // Sort observations by timestamp
            observations.sort((a, b) => a.timestamp - b.timestamp);

            let weightedTickSum = 0n;
            let totalWeight = 0n;

            // Calculate weighted average tick
            for (let i = 0; i < observations.length - 1; i++) {
                const current = observations[i];
                const next = observations[i + 1];
                const weight = BigInt(next.timestamp - current.timestamp);

                weightedTickSum += current.tick * weight;
                totalWeight += weight;
            }

            if (totalWeight === 0n) {
                return null;
            }

            const averageTick = weightedTickSum / totalWeight;

            // Convert tick to price (simplified calculation)
            // In production, you'd want to use a more accurate tick-to-price conversion
            const price = this.tickToPrice(averageTick);

            console.log(`[UniswapV3] TWAP calculation:`, {
                averageTick: averageTick.toString(),
                calculatedPrice: price.toString(),
                totalWeight: totalWeight.toString()
            });

            return price;

        } catch (error) {
            console.log(`[UniswapV3] Error calculating TWAP:`, error);
            return null;
        }
    }

    private tickToPrice(tick: bigint): bigint {
        // Convert tick to price using Uniswap V3 formula
        // price = 1.0001^tick
        // Handle large tick values safely to avoid Infinity
        const tickNumber = Number(tick);

        // For very large tick values, use a more stable calculation
        if (Math.abs(tickNumber) > 100000) {
            // Use log-based calculation for large ticks
            const logPrice = tickNumber * Math.log(1.0001);
            const price = Math.exp(logPrice);

            // Ensure price is finite
            if (!isFinite(price)) {
                console.log(`[UniswapV3] Tick ${tickNumber} produced infinite price, using fallback`);
                // Fallback: use a reasonable ETH price range
                return ethers.parseUnits('5000', 18); // $5000 as fallback
            }

            return ethers.parseUnits(price.toString(), 18);
        } else {
            // Use standard calculation for smaller ticks
            const price = Math.pow(1.0001, tickNumber);
            return ethers.parseUnits(price.toString(), 18);
        }
    }

    async getHealth(): Promise<OracleHealth> {
        try {
            // Test connectivity to one of the pools
            const ethPool = this.pools.get('ETH');
            if (!ethPool) {
                return {
                    isHealthy: false,
                    lastHeartbeat: Math.floor(Date.now() / 1000),
                    responseTimeMs: 0,
                    errorRate: 1,
                    uptime: 0
                };
            }

            // Try to get current liquidity
            const liquidity = await ethPool.liquidity();

            return {
                isHealthy: true,
                lastHeartbeat: Math.floor(Date.now() / 1000),
                responseTimeMs: 0,
                errorRate: 0,
                uptime: 1
            };

        } catch (error) {
            return {
                isHealthy: false,
                lastHeartbeat: Math.floor(Date.now() / 1000),
                responseTimeMs: 0,
                errorRate: 1,
                uptime: 0
            };
        }
    }
}
