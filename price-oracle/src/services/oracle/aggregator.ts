import { ConsolidatedPrice, PriceData, OracleValidation } from "../../types";
import { NexoOracleAggregator } from "./types";

export class PriceOracleAggregator implements NexoOracleAggregator {
    getConsolidatedPrice(token: string): Promise<ConsolidatedPrice> {
        throw new Error("Method not implemented.");
    }
    aggregateOraclePrices(prices: PriceData[]): ConsolidatedPrice {
        throw new Error("Method not implemented.");
    }
    validateOracleData(price: PriceData, token: string): OracleValidation {
        throw new Error("Method not implemented.");
    }
    calculateMedian(prices: PriceData[]): { price: bigint; priceDecimals: number; } {
        throw new Error("Method not implemented.");
    }
    selectBestPrice(prices: PriceData[]): PriceData {
        throw new Error("Method not implemented.");
    }
    getLastKnownPrice(token: string): ConsolidatedPrice | null {
        throw new Error("Method not implemented.");
    }
    markPriceFrozen(token: string): void {
        throw new Error("Method not implemented.");
    }

}