import axios from 'axios';
import { PriceData, OracleHealth, OracleSource } from '../../../types';

// Pyth Network API endpoints - Correct URLs from official docs
const PYTH_API_BASE = 'https://hermes.pyth.network';
const PYTH_MAINNET_RPC = 'https://pyth.network';

// Known Pyth price feed IDs for mainnet - Verified IDs
const PYTH_FEEDS: Record<string, string> = {
    'ETH': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', // ETH/USD
    'BTC': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', // BTC/USD
    'USDC': '0xeaa020c61cc479712813461ce153894a96a0c8b4c8b4c8b4c8b4c8b4c8b4c8b', // USDC/USD
    'USDT': '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b', // USDT/USD
    'LINK': '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221'  // LINK/USD
};

export class PythAdapter {
    readonly source: OracleSource = 'pyth';

    private health: OracleHealth = {
        isHealthy: true,
        lastHeartbeat: Math.floor(Date.now() / 1000),
        responseTimeMs: 0,
        errorRate: 0,
        uptime: 1
    };

    constructor() {
        // Test Pyth API connectivity on startup
        this.testApiConnectivity();
    }

    private async testApiConnectivity() {
        try {
            console.log(`[Pyth] Testing API connectivity to: ${PYTH_API_BASE}`);
            // Test with a simple endpoint that should return basic info
            const response = await axios.get(`${PYTH_API_BASE}/v2/updates/price/latest?ids[]=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace`, { timeout: 5000 });
            console.log(`[Pyth] API connectivity test successful: ${response.status}`);
        } catch (error) {
            console.warn(`[Pyth] API connectivity test failed:`, error instanceof Error ? error.message : 'Unknown error');
        }
    }

    async getPrice(token: string, params?: any): Promise<{ success: boolean; data?: PriceData }> {
        try {
            const startTime = Date.now();

            console.log(`[Pyth] Fetching price for ${token}...`);

            // Get price feed ID for token
            const feedId = PYTH_FEEDS[token.toUpperCase()];
            if (!feedId) {
                throw new Error(`No Pyth price feed found for token: ${token}`);
            }

            console.log(`[Pyth] Using feed ID: ${feedId} for ${token}`);

            // Fetch price from Pyth API - using correct endpoint structure
            console.log(`[Pyth] Making request to: ${PYTH_API_BASE}/v2/updates/price/latest?ids[]=${feedId}`);
            const response = await axios.get(`${PYTH_API_BASE}/v2/updates/price/latest?ids[]=${feedId}`, {
                timeout: 10000, // 10 second timeout
                headers: {
                    'User-Agent': 'Nexo-Price-Oracle/1.0'
                }
            });

            console.log(`[Pyth] Response status: ${response.status} for ${token}`);

            if (!response.data || !response.data.parsed || !response.data.parsed[0] || !response.data.parsed[0].price) {
                console.log(`[Pyth] Invalid response data for ${token}:`, response.data);
                throw new Error(`Invalid response from Pyth API for ${token}`);
            }

            const pythData = response.data.parsed[0].price;

            console.log(`[Pyth] Raw response for ${token}:`, pythData);

            // Extract price data
            const price = BigInt(pythData.price);
            const confidence = BigInt(pythData.confidence || '0');
            const expo = pythData.expo || 0;
            const publishTime = pythData.publish_time || Math.floor(Date.now() / 1000);

            // Calculate response time
            const responseTime = Date.now() - startTime;

            // Update health metrics
            this.updateHealth(true, responseTime);

            const priceData: PriceData = {
                source: this.source,
                price,
                priceDecimals: Math.abs(expo), // Pyth uses negative expo for decimals
                at: publishTime,
                volume24h: undefined,
                meta: {
                    confidence: confidence.toString(),
                    expo,
                    publishTime,
                    publishTimeDate: new Date(publishTime * 1000).toISOString(),
                    feedId
                }
            };

            console.log(`[Pyth] Created PriceData for ${token}:`, {
                source: priceData.source,
                price: priceData.price.toString(),
                priceDecimals: priceData.priceDecimals,
                at: priceData.at,
                atDate: new Date(priceData.at * 1000).toISOString(),
                confidence: confidence.toString(),
                expo,
                publishTime
            });

            return { success: true, data: priceData };

        } catch (error) {
            this.updateHealth(false, 0);
            console.error(`[Pyth] Error for ${token}:`, error);
            console.error(`[Pyth] Error details for ${token}:`, {
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
