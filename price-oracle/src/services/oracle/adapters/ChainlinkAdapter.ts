import { ethers } from 'ethers';
import { PriceData, OracleHealth, OracleSource } from '../../../types';

// Chainlink Price Feed ABI - only the functions we need
const PRICE_FEED_ABI = [
    'function latestRoundData() external view returns (uint80 roundId, int256 price, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
    'function decimals() external view returns (uint8)',
    'function description() external view returns (string)'
];

// Known Chainlink price feed addresses for mainnet
const PRICE_FEEDS: Record<string, string> = {
    'ETH': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // ETH/USD
    'BTC': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c', // BTC/USD
    'USDC': '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6', // USDC/USD
    'USDT': '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D', // USDT/USD
    'LINK': '0x2A5cD4C9d4B12b4B16B34D0445c4D120Df78fEE9'  // LINK/USD
};

export class ChainlinkAdapter {
    readonly source: OracleSource = 'chainlink';

    private provider: ethers.JsonRpcProvider;
    private health: OracleHealth = {
        isHealthy: true,
        lastHeartbeat: Math.floor(Date.now() / 1000),
        responseTimeMs: 0,
        errorRate: 0,
        uptime: 1
    };

    constructor(rpcUrl: string = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/demo') {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
    }

    async getPrice(token: string, params?: any): Promise<{ success: boolean; data?: PriceData }> {
        try {
            const startTime = Date.now();

            console.log(`[Chainlink] Fetching price for ${token}...`);

            // Get price feed address for token
            const feedAddress = PRICE_FEEDS[token.toUpperCase()];
            if (!feedAddress) {
                throw new Error(`No Chainlink price feed found for token: ${token}`);
            }

            console.log(`[Chainlink] Using price feed address: ${feedAddress} for ${token}`);

            // Create contract instance
            const priceFeed = new ethers.Contract(feedAddress, PRICE_FEED_ABI, this.provider);

            console.log(`[Chainlink] Contract instance created for ${token}`);

            // Get latest round data
            console.log(`[Chainlink] Fetching latestRoundData for ${token}...`);
            const roundData = await priceFeed.latestRoundData();
            console.log(`[Chainlink] Raw round data for ${token}:`, roundData);

            const decimals = await priceFeed.decimals();
            console.log(`[Chainlink] Decimals for ${token}:`, decimals);

            // Extract data from round
            const { price, updatedAt } = roundData;
            console.log(`[Chainlink] Extracted price: ${price}, updatedAt: ${updatedAt} for ${token}`);

            // Convert price to BigInt with proper scaling
            const priceBigInt = BigInt(price.toString());
            console.log(`[Chainlink] Converted to BigInt: ${priceBigInt} for ${token}`);

            // Calculate response time
            const responseTime = Date.now() - startTime;

            // Update health metrics
            this.updateHealth(true, responseTime);

            const priceData: PriceData = {
                source: this.source,
                price: priceBigInt,
                priceDecimals: Number(decimals), // Convert BigInt to number for consistency
                at: Number(updatedAt),
                volume24h: undefined,
                meta: {
                    roundId: roundData.roundId.toString(),
                    answeredInRound: roundData.answeredInRound.toString(),
                    startedAt: Number(roundData.startedAt)
                }
            };

            console.log(`[Chainlink] Created PriceData for ${token}:`, {
                source: priceData.source,
                price: priceData.price.toString(),
                priceDecimals: priceData.priceDecimals,
                at: priceData.at,
                atDate: new Date(priceData.at * 1000).toISOString(),
                currentTime: Math.floor(Date.now() / 1000),
                currentDate: new Date().toISOString(),
                timeDiff: Math.floor(Date.now() / 1000) - priceData.at
            });

            return { success: true, data: priceData };

        } catch (error) {
            this.updateHealth(false, 0);
            console.error(`[Chainlink] Error for ${token}:`, error);
            console.error(`[Chainlink] Error details for ${token}:`, {
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                token,
                timestamp: new Date().toISOString()
            });
            return { success: false };
        }
    }

    async getHealth(): Promise<OracleHealth> {
        return this.health;
    }

    get isHealthy(): boolean {
        return this.health.isHealthy;
    }

    private updateHealth(success: boolean, responseTime: number) {
        const now = Math.floor(Date.now() / 1000);

        // Update response time
        if (responseTime > 0) {
            this.health.responseTimeMs = responseTime;
        }

        // Update error rate (simple moving average)
        if (!success) {
            this.health.errorRate = Math.min(1, this.health.errorRate + 0.1);
        } else {
            this.health.errorRate = Math.max(0, this.health.errorRate - 0.05);
        }

        // Update health status
        this.health.isHealthy = this.health.errorRate < 0.5;
        this.health.lastHeartbeat = now;
        this.health.uptime = now - Math.floor(Date.now() / 1000) + this.health.uptime;
    }
}
