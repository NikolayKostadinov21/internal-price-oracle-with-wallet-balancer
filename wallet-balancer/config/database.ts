import { Sequelize } from 'sequelize';
import { initTriggerModel } from '../models/Trigger';
import { initTransferIntentModel } from '../models/TransferIntent';
import { AppConfig } from './appConfig';

export interface DatabaseConfig {
    dialect: 'sqlite' | 'mysql' | 'postgres';
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database: string;
    storage?: string; // For SQLite
    logging?: boolean;
}

export const createWalletBalancerDatabase = (config: AppConfig) => {
    let dbConfig: DatabaseConfig;

    // Check if MySQL environment variables are provided
    if (config.DB_HOST && config.DB_USERNAME && config.DB_PASSWORD) {
        dbConfig = {
            dialect: 'mysql',
            host: config.DB_HOST,
            port: config.DB_PORT || 3306,
            username: config.DB_USERNAME,
            password: config.DB_PASSWORD,
            database: config.DB_NAME || 'wallet_balancer',
            logging: config.NODE_ENV === 'development',
        };
    } else if (config.NODE_ENV === 'production' && config.DB_URL) {
        // Use PostgreSQL in production if configured
        dbConfig = {
            dialect: 'postgres',
            database: config.DB_NAME,
            host: config.DB_HOST,
            port: config.DB_PORT,
            username: config.DB_USERNAME,
            password: config.DB_PASSWORD,
        };
    } else {
        // Fallback to SQLite for development
        dbConfig = {
            dialect: 'sqlite',
            database: 'wallet_balancer_dev',
            storage: './data/wallet_balancer_dev.sqlite',
            logging: config.NODE_ENV === 'development',
        };
    }

    const sequelize = new Sequelize({
        dialect: dbConfig.dialect,
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
        storage: dbConfig.storage,
        logging: dbConfig.logging ?? false,
        define: {
            timestamps: true,
            underscored: true,
        },
    });

    // Initialize models
    initTriggerModel(sequelize);
    initTransferIntentModel(sequelize);

    return sequelize;
};

export const getDefaultDatabaseConfig = (): DatabaseConfig => {
    const env = process.env.NODE_ENV || 'development';

    if (env === 'production') {
        return {
            dialect: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            database: process.env.DB_NAME || 'wallet_balancer',
            logging: process.env.DB_LOGGING === 'true',
        };
    }

    // Development: SQLite
    return {
        dialect: 'sqlite',
        database: 'wallet_balancer_dev',
        storage: './data/wallet_balancer_dev.sqlite',
        logging: process.env.DB_LOGGING === 'true',
    };
};
