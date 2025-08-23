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

export interface API3Oracle extends OracleService {
    readonly source: 'api3';

    getDirectPrice(dapiAddress: string): Promise<OracleResponse>;
    getPublisherData(publisher: string): Promise<OracleResponse>;
}

export interface NexoOracleAggregator {
    getConsolidatedPrice(token: string): Promise<ConsolidatedPrice>;

    aggregateOraclePrices(prices: PriceData[]): ConsolidatedPrice;
    validateOracleData(price: PriceData, token: string): OracleValidation;
    calculateMedian(prices: PriceData[]): { price: bigint; priceDecimals: number };
    selectBestPrice(prices: PriceData[]): PriceData;
    getLastKnownPrice(token: string): ConsolidatedPrice | null;
    markPriceFrozen(token: string): void;
}
