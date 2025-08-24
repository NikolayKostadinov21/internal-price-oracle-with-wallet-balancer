import { OracleSource, PriceData, OracleResponse, OracleHealth } from '../../src/types';

type PriceEntry = Omit<PriceData, 'source'> & { source: Exclude<OracleSource, 'meta'> };

export class BaseMockAdapter {
    private byToken = new Map<string, PriceEntry | Error>();
    private health: OracleHealth = {
        isHealthy: true,
        lastHeartbeat: Math.floor(Date.now() / 1000),
        responseTimeMs: 50,
        errorRate: 0,
        uptime: 1
    };

    setPrice(token: string, entry: PriceEntry) {
        this.byToken.set(token, entry);
    }

    setError(token: string, err: Error) {
        this.byToken.set(token, err);
    }

    setHealth(health: Partial<OracleHealth>) {
        this.health = { ...this.health, ...health };
    }

    async getPrice(token: string): Promise<{ success: boolean; data?: PriceData }> {
        const v = this.byToken.get(token);
        if (!v) return { success: false };
        if (v instanceof Error) return { success: false };
        return { success: true, data: { ...v } as PriceData };
    }

    async getHealth(): Promise<OracleHealth> {
        return this.health;
    }

    get isHealthy(): boolean {
        return this.health.isHealthy;
    }
}

export class MockChainlinkAdapter extends BaseMockAdapter {
    readonly source: OracleSource = 'chainlink';
}

export class MockPythAdapter extends BaseMockAdapter {
    readonly source: OracleSource = 'pyth';
}

export class MockApi3Adapter extends BaseMockAdapter {
    readonly source: OracleSource = 'chainlink'; // Changed from 'api3' since API3 is excluded
}

export class MockUniswapV3TwapAdapter extends BaseMockAdapter {
    readonly source: OracleSource = 'uniswap_v3_twap';
}
