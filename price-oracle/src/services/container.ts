import { createContainer as createAwilixContainer, AwilixContainer, asValue, asClass } from 'awilix';
import { PriceOracleAggregator } from './oracle/aggregator';
import { LiquidityTier, OracleSource } from '../types';

// Database and Redis imports
import { createDatabase, getDefaultDatabaseConfig } from '../config/database';
import { DatabaseConfigRepo } from './repositories/DatabaseConfigRepo';
import { DatabaseLastGoodStore } from './repositories/DatabaseLastGoodStore';
import { ConfigRepoWrapper } from './repositories/ConfigRepoWrapper';
import { LastGoodStoreWrapper } from './repositories/LastGoodStoreWrapper';
import { RedisService, getDefaultRedisConfig } from '../config/redis';
import { RedisCacheService } from './cache/RedisCacheService';

// Real Chainlink adapter
import { ChainlinkAdapter } from './oracle/adapters/ChainlinkAdapter';

// Real Pyth adapter
import { PythAdapter } from './oracle/adapters/PythAdapter';

// Real Uniswap V3 adapter
import { UniswapV3Adapter } from './oracle/adapters/UniswapV3Adapter';

// Note: API3 is excluded per assignment requirements

export async function createContainer(): Promise<AwilixContainer> {
    const container = createAwilixContainer();

    // Validate required environment variables
    const requiredEnvVars = [
        'MYSQL_DATABASE',
        'MYSQL_USER',
        'MYSQL_PASSWORD'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    try {
        // Initialize database
        const dbConfig = getDefaultDatabaseConfig();
        const sequelize = createDatabase(dbConfig);

        // Test database connection
        await sequelize.authenticate();
        console.log('Database connection established');

        // Sync models
        await sequelize.sync({ force: false });
        console.log('Database models synchronized');

        // Create real oracle adapters (API3 excluded per assignment requirements)
        const chainlinkOracle = new ChainlinkAdapter();
        const pythOracle = new PythAdapter();
        const uniswapV3Oracle = new UniswapV3Adapter(process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo');

        // Create dummy API3 adapter (excluded per assignment requirements)
        const api3Oracle = {
            getPrice: async () => ({ success: false, error: 'API3 not implemented per assignment requirements' })
        };

        // Create database-backed configuration and storage
        const dbConfigRepo = new DatabaseConfigRepo(sequelize);
        const configRepo = new ConfigRepoWrapper(dbConfigRepo);
        const dbLastGoodStore = new DatabaseLastGoodStore(sequelize);
        const lastGoodStore = new LastGoodStoreWrapper(dbLastGoodStore);

        // Initialize Redis (optional)
        let redisService: RedisService | null = null;
        let cacheService: RedisCacheService | null = null;

        try {
            const redisConfig = getDefaultRedisConfig();
            redisService = new RedisService(redisConfig);
            await redisService.connect();

            if (await redisService.ping()) {
                console.log('Redis connection established');
                cacheService = new RedisCacheService(redisService);
            } else {
                console.log('Redis ping failed, continuing without Redis');
            }
        } catch (redisError) {
            console.log('Redis connection failed, continuing without Redis:', redisError);
        }

        // Seed database with default configurations
        await configRepo.seedDefaultConfigs();
        console.log('Database seeded with default configurations');

        // Create main aggregator with proper constructor parameters
        const priceOracleAggregator = new PriceOracleAggregator(
            chainlinkOracle,
            pythOracle,
            uniswapV3Oracle,
            configRepo,
            lastGoodStore
        );

        // Register services
        container.register({
            sequelize: asValue(sequelize),
            chainlinkOracle: asValue(chainlinkOracle),
            pythOracle: asValue(pythOracle),
            uniswapV3Oracle: asValue(uniswapV3Oracle),
            api3Oracle: asValue(api3Oracle),
            configRepo: asValue(configRepo),
            lastGoodStore: asValue(lastGoodStore),
            priceOracleAggregator: asValue(priceOracleAggregator)
        });

        if (redisService) {
            container.register({
                redisService: asValue(redisService),
            });
        }

        if (cacheService) {
            container.register({
                cacheService: asValue(cacheService),
            });
        }

        console.log('Container initialized successfully');
        return container;

    } catch (error) {
        console.error('Failed to initialize container:', error);
        throw error;
    }
}
