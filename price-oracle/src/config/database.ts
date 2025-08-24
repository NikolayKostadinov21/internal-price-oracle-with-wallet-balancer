import { Sequelize } from 'sequelize';
import { initTokenConfigModel } from '../models/TokenConfig';
import { initLastGoodStoreModel } from '../models/LastGoodStore';

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

export const createDatabase = (config: DatabaseConfig) => {
  const sequelize = new Sequelize({
    dialect: config.dialect,
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    storage: config.storage,
    logging: config.logging ?? false,
    define: {
      timestamps: true,
      underscored: true,
    },
  });

  // Initialize models
  initTokenConfigModel(sequelize);
  initLastGoodStoreModel(sequelize);

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
      database: process.env.DB_NAME || 'price_oracle',
      logging: process.env.DB_LOGGING === 'true',
    };
  }

  // Development: SQLite
  return {
    dialect: 'sqlite',
    database: 'price_oracle_dev',
    storage: './data/price_oracle_dev.sqlite',
    logging: process.env.DB_LOGGING === 'true',
  };
};
