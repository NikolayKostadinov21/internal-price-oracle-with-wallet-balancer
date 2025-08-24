import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

const ConfigSchema = z.object({
    // Database
    DB_URL: z.string().optional(),
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.number().default(5432),
    DB_USERNAME: z.string().default('postgres'),
    DB_PASSWORD: z.string().default('postgres'),
    DB_NAME: z.string().default('wallet_balancer'),

    // Redis
    REDIS_URL: z.string().optional(),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.number().default(6379),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: z.number().default(1),

    // Price Oracle
    PRICE_ORACLE_URL: z.string().default('http://localhost:3000'),
    PRICE_ORACLE_SSE_URL: z.string().default('http://localhost:3000/stream/prices'),

    // Ethereum RPC
    ETHEREUM_RPC_URL: z.string().default('https://eth-mainnet.g.alchemy.com/v2/demo'),
    ETHEREUM_CHAIN_ID: z.number().default(1),

    // Safe Service
    SAFE_SERVICE_URL: z.string().optional(),

    // Hot Wallet (for EOA mode)
    HOT_WALLET_PRIVATE_KEY: z.string().optional(),

    // Server
    PORT: z.number().default(3001),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): AppConfig {
    try {
        const config = ConfigSchema.parse({
            DB_URL: process.env.DB_URL,
            DB_HOST: process.env.DB_HOST,
            DB_PORT: parseInt(process.env.DB_PORT || '5432'),
            DB_USERNAME: process.env.DB_USERNAME,
            DB_PASSWORD: process.env.DB_PASSWORD,
            DB_NAME: process.env.DB_NAME,
            REDIS_URL: process.env.REDIS_URL,
            REDIS_HOST: process.env.REDIS_HOST,
            REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
            REDIS_PASSWORD: process.env.REDIS_PASSWORD,
            REDIS_DB: parseInt(process.env.REDIS_DB || '1'),
            PRICE_ORACLE_URL: process.env.PRICE_ORACLE_URL,
            PRICE_ORACLE_SSE_URL: process.env.PRICE_ORACLE_SSE_URL,
            ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL,
            ETHEREUM_CHAIN_ID: parseInt(process.env.ETHEREUM_CHAIN_ID || '1'),
            SAFE_SERVICE_URL: process.env.SAFE_SERVICE_URL,
            HOT_WALLET_PRIVATE_KEY: process.env.HOT_WALLET_PRIVATE_KEY,
            PORT: parseInt(process.env.PORT || '3001'),
            NODE_ENV: process.env.NODE_ENV,
        });

        console.log('Wallet Balancer configuration loaded successfully');
        return config;
    } catch (error) {
        console.error('Failed to load configuration:', error);
        throw new Error('Invalid configuration');
    }
}
