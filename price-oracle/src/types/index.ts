export type Mode = 'normal' | 'degraded' | 'frozen';

export type OracleSource =
    | 'chainlink'
    | 'pyth'
    | 'uniswap_v3_twap'
    | 'api3'
    | 'nexo';

// A single source reading (Chainlink, Pyth, Uniswap TWAP, API3)
export interface PriceData {
    source: OracleSource;
    price: bigint;
    priceDecimals: number;
    at: number;                                                 // epoch in seconds from the source/update
    volume24h?: number;
    meta?: Record<string, unknown>;
}

// The consolidated nexo-oracle output we emit/store
export interface ConsolidatedPrice {
    source: 'nexo';
    price: bigint;
    priceDecimals: number;
    at: number;                                                 // epoch in seconds (time we consolidated)
    mode: Mode;
    timestamp?: number;                                         // ms | server receive time
    lastUpdated?: number;                                       // ms | time we last changed the consolidated price
    volume24h?: number;
    // Audit trail of inputs used in this decision
    sourcesUsed: Array<{
        source: OracleSource;
        price: bigint;
        priceDecimals: number;
        at: number;
    }>;

}

// Generic adapter response shape
export interface OracleResponse {
    success: boolean;
    data?: PriceData;
    error?: string;
    latencyMs?: number;
    at?: number;                                                // seconds (optional, if you keep it)
}

export interface OracleValidation {
    isStale: boolean;
    hasValidHeartbeat: boolean;
    meetsLiquidityThreshold: boolean;
    confidenceAcceptable: boolean;
    overallValid: boolean;
}

export enum LiquidityTier {
    DEEP = 'deep',                                              // ≥$100M
    MID = 'mid',                                                // $10-$100M
    THIN = 'thin'                                               // ≤$1M
}

export interface TokenConfig {
    address: string;
    symbol: string;
    chainId: number;

    liquidityTier: LiquidityTier;

    primaryOracle: OracleSource;
    fallbackOracles: OracleSource[];

    // TWAP safety
    minLiquidity?: bigint;                                      // harmonic-mean liquidity threshold (on-chain units)
    twapWindow?: number;                                        // seconds
    allowedPools?: string[];                                    // whitelisted Uniswap v3 pools

    // Freshness / acceptance thresholds (overrides per-source defaults)
    ttlBySource: Record<OracleSource, number>;         // seconds
    epsilon?: number;                                           // Pyth confidence / price threshold (e.g. 0.01)
    deltaBps?: number;                                          // Divergence alert threshold (e.g. 150)
}

export interface OracleHealth {
    isHealthy: boolean;
    lastHeartbeat: number;                                      // epoch in seconds
    responseTimeMs: number;
    errorRate: number;                                          // 0..1
    uptime: number;                                             // 0..1
}

export const DEFAULTS = {
    ttl: {
        chainlink: 300,                                         // 5 minutes
        pyth: 30,                                               // 30 seconds
        uniswap_v3_twap: 1800,                                  // 30 minutes
        api3: 300                                               // 5 minutes
    } as Record<Exclude<OracleSource, 'nexo'>, number>,
    epsilon: 0.01,                                              // ε -> 1% confidence threshold
    deltaBps: 150                                               // δ -> 150 basis points divergence
}

export interface OracleConfig {
    getTokenConfig(token: string): Promise<TokenConfig>;
}

export interface LastGoodStore {
    getLastGood(token: string): Promise<ConsolidatedPrice | null>;
    putLastGood(token: string, price: ConsolidatedPrice): Promise<void>;
}

export interface NexoOracleResult {
    finalPrice: string;                                         // decimal string rendered from (price, priceDecimals)
    priceDecimals: number;
    mode: Mode;
    source: 'nexo';
    contributingOracles: Exclude<OracleSource, 'nexo'>[];
    confidence: 'high' | 'medium' | 'low' | 'frozen';
    aggregationMethod: 'median' | 'single' | 'last-known';
    validationDetails: Partial<Record<Exclude<OracleSource, 'nexo'>, OracleValidation>>;
    at: number;                                                 // epoch in seconds
}
