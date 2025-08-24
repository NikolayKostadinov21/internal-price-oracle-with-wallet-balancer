import { createDatabase, getDefaultDatabaseConfig } from '../config/database';
import { DatabaseConfigRepo } from '../services/repositories/DatabaseConfigRepo';
import { DatabaseLastGoodStore } from '../services/repositories/DatabaseLastGoodStore';
import { getDefaultRedisConfig } from '../config/redis';
import { RedisService } from '../config/redis';

async function initializeDatabase() {
  console.log('Initializing Price Oracle Database...');

  try {
    // Initialize database
    const dbConfig = getDefaultDatabaseConfig();
    console.log(`Database config: ${dbConfig.dialect} - ${dbConfig.database}`);

    const sequelize = createDatabase(dbConfig);

    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully');

    // Sync models (create tables)
    await sequelize.sync({ force: false }); // force: false preserves existing data
    console.log('Database tables synchronized');

    // Initialize repositories
    const configRepo = new DatabaseConfigRepo(sequelize);
    const lastGoodStore = new DatabaseLastGoodStore(sequelize);

    // Seed default configurations
    await configRepo.seedDefaultConfigs();
    console.log('Default token configurations seeded');

    // Test Redis connection
    const redisConfig = getDefaultRedisConfig();
    console.log(`Redis config: ${redisConfig.host}:${redisConfig.port}`);

    const redis = new RedisService(redisConfig);

    try {
      await redis.connect();
      const isHealthy = await redis.ping();
      if (isHealthy) {
        console.log('Redis connection established successfully');
      } else {
        console.log('Redis connection established but ping failed');
      }
      await redis.disconnect();
    } catch (redisError) {
      console.log('Redis connection failed (continuing without Redis):', redisError);
    }

    console.log('\nDatabase initialization completed successfully!');
    console.log('\nAvailable endpoints:');
    console.log('  GET  /health - Health check');
    console.log('  GET  /price/:token - Get price for token');
    console.log('  GET  /config/:token - Get token configuration');
    console.log('  POST /config/:token - Create/update token configuration');
    console.log('  DELETE /config/:token - Delete token configuration');

    await sequelize.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

export { initializeDatabase };
