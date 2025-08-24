import { Sequelize } from 'sequelize';
import { initTriggerModel } from '../models/Trigger';
import { initTransferIntentModel } from '../models/TransferIntent';
import { AppConfig } from './appConfig';

export interface DatabaseConfig {
    dialect: 'sqlite' | 'postgres';
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database: string;
    storage?: string; // For SQLite
    logging?: boolean;
}

export const createWalletBalancerDatabase = (config: AppConfig) => {
    const dbConfig: DatabaseConfig = {
        dialect: 'sqlite', // Start with SQLite for development
        database: 'wallet_balancer_dev',
        storage: './data/wallet_balancer_dev.sqlite',
        logging: config.NODE_ENV === 'development',
    };

    // Use PostgreSQL in production if configured
    if (config.NODE_ENV === 'production' && config.DB_URL) {
        dbConfig.dialect = 'postgres';
        dbConfig.database = config.DB_NAME;
        dbConfig.host = config.DB_HOST;
        dbConfig.port = config.DB_PORT;
        dbConfig.username = config.DB_USERNAME;
        dbConfig.password = config.DB_PASSWORD;
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
