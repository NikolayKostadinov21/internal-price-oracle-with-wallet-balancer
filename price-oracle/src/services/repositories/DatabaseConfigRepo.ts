import { TokenConfigModel, TokenConfigAttributes } from '../../models/TokenConfig';
import { OracleConfig, TokenConfig } from '../../types';
import { LiquidityTier, OracleSource } from '../../types';

export class DatabaseConfigRepo {
    constructor(private sequelize: any) { }

    async getTokenConfig(token: string): Promise<TokenConfig | null> {
        try {
            const config = await TokenConfigModel.findOne({
                where: { symbol: token.toUpperCase() }
            });

            if (!config) {
                return null;
            }

            // Extract data from Sequelize model
            const configData = config.get();
            return this.mapToTokenConfig(configData);
        } catch (error) {
            console.error(`[DatabaseConfigRepo] Failed to get config for ${token}:`, error);
            return null;
        }
    }

    async getAllTokenConfigs(): Promise<TokenConfig[]> {
        try {
            const configs = await TokenConfigModel.findAll();
            return configs.map(config => this.mapToTokenConfig(config.get()));
        } catch (error) {
            console.error('[DatabaseConfigRepo] Failed to get all configs:', error);
            return [];
        }
    }

    async createTokenConfig(config: TokenConfig): Promise<void> {
        try {
            await TokenConfigModel.create({
                address: config.address,
                symbol: config.symbol,
                chainId: config.chainId,
                liquidityTier: config.liquidityTier,
                primaryOracle: config.primaryOracle,
                fallbackOracles: config.fallbackOracles,
                minLiquidity: config.minLiquidity?.toString() || '0',
                twapWindow: config.twapWindow || 3600,
                allowedPools: config.allowedPools || [],
                ttlBySource: config.ttlBySource,
                epsilon: config.epsilon || 0.01,
                deltaBps: config.deltaBps || 150,
            });
            console.log(`[DatabaseConfigRepo] Created config for ${config.symbol}`);
        } catch (error) {
            console.error(`[DatabaseConfigRepo] Failed to create config for ${config.symbol}:`, error);
            throw error;
        }
    }

    async updateTokenConfig(token: string, updates: Partial<TokenConfig>): Promise<void> {
        try {
            const updateData: any = {};

            if (updates.address !== undefined) updateData.address = updates.address;
            if (updates.chainId !== undefined) updateData.chainId = updates.chainId;
            if (updates.liquidityTier !== undefined) updateData.liquidityTier = updates.liquidityTier;
            if (updates.primaryOracle !== undefined) updateData.primaryOracle = updates.primaryOracle;
            if (updates.fallbackOracles !== undefined) updateData.fallbackOracles = updates.fallbackOracles;
            if (updates.minLiquidity !== undefined) updateData.minLiquidity = updates.minLiquidity.toString();
            if (updates.twapWindow !== undefined) updateData.twapWindow = updates.twapWindow;
            if (updates.allowedPools !== undefined) updateData.allowedPools = updates.allowedPools;
            if (updates.ttlBySource !== undefined) updateData.ttlBySource = updates.ttlBySource;
            if (updates.epsilon !== undefined) updateData.epsilon = updates.epsilon;
            if (updates.deltaBps !== undefined) updateData.deltaBps = updates.deltaBps;

            const result = await TokenConfigModel.update(updateData, {
                where: { symbol: token.toUpperCase() }
            });

            if (result[0] === 0) {
                throw new Error(`Token config for ${token} not found`);
            }

            console.log(`[DatabaseConfigRepo] Updated config for ${token}`);
        } catch (error) {
            console.error(`[DatabaseConfigRepo] Failed to update config for ${token}:`, error);
            throw error;
        }
    }

    async deleteTokenConfig(token: string): Promise<void> {
        try {
            const result = await TokenConfigModel.destroy({
                where: { symbol: token.toUpperCase() }
            });

            if (result === 0) {
                throw new Error(`Token config for ${token} not found`);
            }

            console.log(`[DatabaseConfigRepo] Deleted config for ${token}`);
        } catch (error) {
            console.error(`[DatabaseConfigRepo] Failed to delete config for ${token}:`, error);
            throw error;
        }
    }

    async seedDefaultConfigs(): Promise<void> {
        try {
            const existingConfigs = await TokenConfigModel.count();
            if (existingConfigs > 0) {
                console.log('[DatabaseConfigRepo] Default configs already exist, skipping seed');
                return;
            }

            const defaultConfigs = [
                {
                    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                    symbol: 'ETH',
                    chainId: 1,
                    liquidityTier: LiquidityTier.DEEP,
                    primaryOracle: 'chainlink' as OracleSource,
                    fallbackOracles: ['pyth', 'uniswap_v3_twap'] as OracleSource[],
                    minLiquidity: '1000000000000000000',
                    twapWindow: 3600,
                    allowedPools: ['0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8'],
                    ttlBySource: {
                        chainlink: 3600,
                        pyth: 30,
                        uniswap_v3_twap: 1800,
                        api3: 300,
                        nexo: 3600, // Add nexo to satisfy the full Record requirement
                    },
                    epsilon: 0.01,
                    deltaBps: 150,
                },
                {
                    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
                    symbol: 'BTC',
                    chainId: 1,
                    liquidityTier: LiquidityTier.DEEP,
                    primaryOracle: 'chainlink' as OracleSource,
                    fallbackOracles: ['pyth', 'uniswap_v3_twap'] as OracleSource[],
                    minLiquidity: '1000000000000000000',
                    twapWindow: 3600,
                    allowedPools: ['0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35'],
                    ttlBySource: {
                        chainlink: 3600,
                        pyth: 30,
                        uniswap_v3_twap: 1800,
                        api3: 300,
                        nexo: 3600, // Add nexo to satisfy the full Record requirement
                    },
                    epsilon: 0.01,
                    deltaBps: 150,
                },
                {
                    address: '0xA0b86991c6218b36c1d19d4a2e9Eb0cE3606eB48',
                    symbol: 'USDC',
                    chainId: 1,
                    liquidityTier: LiquidityTier.DEEP,
                    primaryOracle: 'chainlink' as OracleSource,
                    fallbackOracles: ['pyth', 'uniswap_v3_twap'] as OracleSource[],
                    minLiquidity: '1000000000000000000',
                    twapWindow: 3600,
                    allowedPools: ['0x7858E9e971Fa69A63C01a7bA06b6b5Fc7df3dfa6'],
                    ttlBySource: {
                        chainlink: 3600,
                        pyth: 30,
                        uniswap_v3_twap: 1800,
                        api3: 300,
                        nexo: 3600, // Add nexo to satisfy the full Record requirement
                    },
                    epsilon: 0.01,
                    deltaBps: 150,
                },
            ];

            await TokenConfigModel.bulkCreate(defaultConfigs);
            console.log('[DatabaseConfigRepo] Seeded default configs successfully');
        } catch (error) {
            console.error('[DatabaseConfigRepo] Failed to seed default configs:', error);
            throw error;
        }
    }

    private mapToTokenConfig(dbConfig: TokenConfigAttributes): TokenConfig {
        return {
            address: dbConfig.address,
            symbol: dbConfig.symbol,
            chainId: dbConfig.chainId,
            liquidityTier: dbConfig.liquidityTier,
            primaryOracle: dbConfig.primaryOracle,
            fallbackOracles: dbConfig.fallbackOracles,
            minLiquidity: BigInt(dbConfig.minLiquidity),
            twapWindow: dbConfig.twapWindow,
            allowedPools: dbConfig.allowedPools,
            ttlBySource: dbConfig.ttlBySource,
            epsilon: dbConfig.epsilon,
            deltaBps: dbConfig.deltaBps,
        };
    }
}
