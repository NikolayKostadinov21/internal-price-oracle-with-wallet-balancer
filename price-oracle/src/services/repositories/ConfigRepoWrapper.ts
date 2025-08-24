import { DatabaseConfigRepo } from './DatabaseConfigRepo';
import { OracleConfig, TokenConfig } from '../../types';

export class ConfigRepoWrapper implements OracleConfig {
  constructor(private dbConfigRepo: DatabaseConfigRepo) {}

  async getTokenConfig(token: string): Promise<TokenConfig> {
    const config = await this.dbConfigRepo.getTokenConfig(token);
    if (!config) {
      throw new Error(`Token configuration not found for ${token}`);
    }
    return config;
  }

  async getAllTokenConfigs(): Promise<TokenConfig[]> {
    return this.dbConfigRepo.getAllTokenConfigs();
  }

  async createTokenConfig(config: TokenConfig): Promise<void> {
    return this.dbConfigRepo.createTokenConfig(config);
  }

  async updateTokenConfig(token: string, updates: Partial<TokenConfig>): Promise<void> {
    return this.dbConfigRepo.updateTokenConfig(token, updates);
  }

  async deleteTokenConfig(token: string): Promise<void> {
    return this.dbConfigRepo.deleteTokenConfig(token);
  }

  async seedDefaultConfigs(): Promise<void> {
    return this.dbConfigRepo.seedDefaultConfigs();
  }
}
