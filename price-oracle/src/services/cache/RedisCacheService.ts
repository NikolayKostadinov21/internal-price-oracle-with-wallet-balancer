import { RedisService } from '../../config/redis';
import { PriceData, TokenConfig } from '../../types';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix for namespacing
}

export class RedisCacheService {
  private redis: RedisService;
  private defaultTTL: number;
  private prefix: string;

  constructor(redis: RedisService, options: CacheOptions = {}) {
    this.redis = redis;
    this.defaultTTL = options.ttl || 300; // 5 minutes default
    this.prefix = options.prefix || 'price_oracle';
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  // Price data caching
  async cachePriceData(token: string, source: string, priceData: PriceData, ttl?: number): Promise<void> {
    const key = this.getKey(`price:${token}:${source}`);
    const data = JSON.stringify({
      ...priceData,
      price: priceData.price.toString(), // Convert BigInt to string for JSON
    });

    await this.redis.set(key, data, ttl || this.defaultTTL);
  }

  async getCachedPriceData(token: string, source: string): Promise<PriceData | null> {
    const key = this.getKey(`price:${token}:${source}`);
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    try {
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        price: BigInt(parsed.price), // Convert string back to BigInt
      };
    } catch (error) {
      console.error(`[RedisCache] Failed to parse cached price data for ${token}:${source}:`, error);
      return null;
    }
  }

  async invalidatePriceData(token: string, source?: string): Promise<void> {
    if (source) {
      const key = this.getKey(`price:${token}:${source}`);
      await this.redis.del(key);
    } else {
      // Invalidate all sources for this token
      const pattern = this.getKey(`price:${token}:*`);
      // Note: Redis doesn't support pattern deletion directly, we'd need to scan
      // For now, we'll just invalidate common sources
      const sources = ['chainlink', 'pyth', 'uniswap_v3_twap', 'api3'];
      for (const src of sources) {
        const key = this.getKey(`price:${token}:${src}`);
        await this.redis.del(key);
      }
    }
  }

  // Configuration caching
  async cacheTokenConfig(token: string, config: TokenConfig, ttl?: number): Promise<void> {
    const key = this.getKey(`config:${token}`);
    const data = JSON.stringify({
      ...config,
      minLiquidity: config.minLiquidity?.toString(), // Convert BigInt to string
    });

    await this.redis.set(key, data, ttl || this.defaultTTL);
  }

  async getCachedTokenConfig(token: string): Promise<TokenConfig | null> {
    const key = this.getKey(`config:${token}`);
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    try {
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        minLiquidity: BigInt(parsed.minLiquidity), // Convert string back to BigInt
      };
    } catch (error) {
      console.error(`[RedisCache] Failed to parse cached config for ${token}:`, error);
      return null;
    }
  }

  async invalidateTokenConfig(token: string): Promise<void> {
    const key = this.getKey(`config:${token}`);
    await this.redis.del(key);
  }

  // Aggregated price caching
  async cacheAggregatedPrice(token: string, aggregatedData: any, ttl?: number): Promise<void> {
    const key = this.getKey(`aggregated:${token}`);
    const data = JSON.stringify(aggregatedData);

    await this.redis.set(key, data, ttl || this.defaultTTL);
  }

  async getCachedAggregatedPrice(token: string): Promise<any | null> {
    const key = this.getKey(`aggregated:${token}`);
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error(`[RedisCache] Failed to parse cached aggregated price for ${token}:`, error);
      return null;
    }
  }

  async invalidateAggregatedPrice(token: string): Promise<void> {
    const key = this.getKey(`aggregated:${token}`);
    await this.redis.del(key);
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      return await this.redis.ping();
    } catch (error) {
      console.error('[RedisCache] Health check failed:', error);
      return false;
    }
  }

  // Cache statistics
  async getCacheStats(): Promise<{ totalKeys: number; memoryUsage: string }> {
    try {
      // This is a simplified version - in production you might want more detailed stats
      const info = await this.redis.ping(); // Placeholder for actual stats
      return {
        totalKeys: 0, // Would need to implement key counting
        memoryUsage: 'N/A', // Would need to implement memory usage
      };
    } catch (error) {
      console.error('[RedisCache] Failed to get cache stats:', error);
      return { totalKeys: 0, memoryUsage: 'Error' };
    }
  }

  // Bulk operations
  async clearAllCache(): Promise<void> {
    try {
      // Note: This is destructive - use with caution
      // In production, you might want to implement pattern-based clearing
      console.warn('[RedisCache] Clearing all cache - this is destructive!');
      // await this.redis.flushdb(); // Would need to implement this
    } catch (error) {
      console.error('[RedisCache] Failed to clear all cache:', error);
      throw error;
    }
  }

  // Cache warming
  async warmCache(token: string, config: TokenConfig): Promise<void> {
    try {
      // Pre-cache configuration
      await this.cacheTokenConfig(token, config, 3600); // 1 hour TTL for configs

      console.log(`[RedisCache] Warmed cache for ${token}`);
    } catch (error) {
      console.error(`[RedisCache] Failed to warm cache for ${token}:`, error);
    }
  }
}
