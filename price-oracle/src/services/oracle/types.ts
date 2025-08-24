import {
    OracleHealth,
    OracleResponse,
    OracleSource,
    PriceData,
    OracleValidation,
    ConsolidatedPrice,
    Mode
} from "../../types";

export interface OracleService {
    readonly source: OracleSource;
    readonly isHealthy: boolean;

    getPrice(tokenAddress: string, options?: any): Promise<OracleResponse>;
    getHealth(): Promise<OracleHealth>;
    validatePrice(price: PriceData): OracleValidation;
}

export interface ChainlinkOracle extends OracleService {
    readonly source: 'chainlink';

    getPriceFromFeed(feedAddress: string): Promise<OracleResponse>;
    getLatestRoundData(feedAddress: string): Promise<OracleResponse>;
}

export interface PythOracle extends OracleService {
    readonly source: 'pyth';

    getPriceFromFeed(feedId: string): Promise<OracleResponse>;
    getPriceWithConfidence(feedId: string): Promise<OracleResponse>;
}

export interface UniswapV3Oracle extends OracleService {
    readonly source: 'uniswap_v3_twap';

    calculateTWAP(poolAddress: string, window: number): Promise<OracleResponse>;
    getSpotPrice(poolAddress: string): Promise<OracleResponse>;
    validateLiquidity(poolAddress: string, minLiquidity: bigint): Promise<boolean>;

    getPrice(token: string, options?: { poolAddress: string; windowSec: number }): Promise<OracleResponse>;
}

// API3Oracle interface removed - API3 excluded per assignment requirements

// export interface NexoOracleAggregator {
//     getConsolidatedPrice(token: string): Promise<ConsolidatedPrice>;

//     aggregateOraclePrices(prices: PriceData[]): ConsolidatedPrice;
//     validateOracleData(price: PriceData, token: string): OracleValidation;
//     selectBestPrice(prices: PriceData[]): PriceData;
//     getLastKnownPrice(token: string): ConsolidatedPrice | null;
//     markPriceFrozen(token: string): void;
// }
