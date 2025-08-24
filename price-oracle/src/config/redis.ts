import { createClient, RedisClientType } from 'redis';

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
}

export class RedisService {
  private client: RedisClientType;
  private config: RedisConfig;

  constructor(config: RedisConfig) {
    this.config = config;
    this.client = createClient({
      url: config.url,
      socket: {
        host: config.host || 'localhost',
        port: config.port || 6379,
      },
      password: config.password,
      database: config.db || 0,
      // Note: Redis v5+ uses different option names
      // retry_delay_on_failover: config.retryDelayOnFailover || 100,
      // max_retries_per_request: config.maxRetriesPerRequest || 3,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('error', (err) => {
      console.error('[Redis] Error:', err);
    });

    this.client.on('connect', () => {
      console.log('[Redis] Connected to Redis server');
    });

    this.client.on('ready', () => {
      console.log('[Redis] Redis client ready');
    });

    this.client.on('end', () => {
      console.log('[Redis] Redis client disconnected');
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      console.error('[Redis] Failed to connect:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
    } catch (error) {
      console.error('[Redis] Failed to disconnect:', error);
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const result = await this.client.get(key);
      return result as string | null;
    } catch (error) {
      console.error(`[Redis] Failed to get key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error(`[Redis] Failed to set key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`[Redis] Failed to delete key ${key}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[Redis] Failed to check existence of key ${key}:`, error);
      return false;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('[Redis] Ping failed:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.client.isReady;
  }
}

export const getDefaultRedisConfig = (): RedisConfig => {
  return {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
  };
};
