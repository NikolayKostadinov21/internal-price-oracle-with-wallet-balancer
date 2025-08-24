import { ConsolidatedPrice, TokenConfig } from '../../src/types';

export class InMemoryConfigRepo {
    private cfgByToken = new Map<string, TokenConfig>();

    setTokenConfig(token: string, cfg: TokenConfig) {
        this.cfgByToken.set(token, cfg);
    }

    async getTokenConfig(token: string): Promise<TokenConfig> {
        const v = this.cfgByToken.get(token);
        if (!v) throw new Error(`No TokenConfig for ${token}`);
        return v;
    }
}

export class InMemoryLastGoodStore {
    private byToken = new Map<string, ConsolidatedPrice>();

    async getLastGood(token: string): Promise<ConsolidatedPrice | null> {
        return this.byToken.get(token) ?? null;
    }

    async putLastGood(token: string, price: ConsolidatedPrice): Promise<void> {
        if (price.source !== 'nexo') {
            throw new Error('ConsolidatedPrice.source must be "nexo"');
        }
        this.byToken.set(token, price);
    }
}
