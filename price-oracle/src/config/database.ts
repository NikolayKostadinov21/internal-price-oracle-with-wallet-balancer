import { Sequelize } from 'sequelize';
import { initTokenConfigModel } from '../models/TokenConfig';
import { initLastGoodStoreModel } from '../models/LastGoodStore';

export interface DatabaseConfig {
  dialect: 'sqlite' | 'postgres' | 'mysql';
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
      dialect: 'mysql',
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      username: process.env.MYSQL_USER || 'oracle_user',
      password: process.env.MYSQL_PASSWORD || '1234',
      database: process.env.MYSQL_DATABASE || 'price_oracle',
      logging: process.env.DB_LOGGING === 'true',
    };
  }

  // Development: MySQL (for Docker setup)
  return {
    dialect: 'mysql',
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    username: process.env.MYSQL_USER || 'oracle_user',
    password: process.env.MYSQL_PASSWORD || '1234',
    database: process.env.MYSQL_DATABASE || 'price_oracle',
    logging: process.env.DB_LOGGING === 'true',
  };
};
