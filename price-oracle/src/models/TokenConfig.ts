import { DataTypes, Model, Optional } from 'sequelize';
import { LiquidityTier, OracleSource } from '../types';

export interface TokenConfigAttributes {
    id: number;
    address: string;
    symbol: string;
    chainId: number;
    liquidityTier: LiquidityTier;
    primaryOracle: OracleSource;
    fallbackOracles: OracleSource[];
    minLiquidity: string; // BigInt stored as string
    twapWindow: number;
    allowedPools: string[];
    ttlBySource: Record<OracleSource, number>;
    epsilon: number;
    deltaBps: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface TokenConfigCreationAttributes extends Optional<TokenConfigAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export class TokenConfigModel extends Model<TokenConfigAttributes, TokenConfigCreationAttributes> {
    // Remove public class fields to avoid shadowing Sequelize getters
    // These will be provided by Sequelize automatically
}

export const initTokenConfigModel = (sequelize: any) => {
    TokenConfigModel.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            address: {
                type: DataTypes.STRING(42), // Ethereum address length
                allowNull: false,
                unique: true,
            },
            symbol: {
                type: DataTypes.STRING(10),
                allowNull: false,
            },
            chainId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            liquidityTier: {
                type: DataTypes.ENUM(...Object.values(LiquidityTier) as string[]),
                allowNull: false,
            },
            primaryOracle: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    isIn: [['chainlink', 'pyth', 'uniswap_v3_twap', 'api3', 'nexo']]
                }
            },
            fallbackOracles: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
            },
            minLiquidity: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'BigInt stored as string',
            },
            twapWindow: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 3600,
            },
            allowedPools: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
            },
            ttlBySource: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: {},
                comment: 'Record of OracleSource to TTL mapping',
            },
            epsilon: {
                type: DataTypes.DECIMAL(10, 6),
                allowNull: false,
                defaultValue: 0.01,
            },
            deltaBps: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 150,
            },
        },
        {
            sequelize,
            tableName: 'token_configs',
            timestamps: true,
        }
    );

    return TokenConfigModel;
};
