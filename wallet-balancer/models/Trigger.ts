import { DataTypes, Model, Optional } from 'sequelize';
import { Direction, ExecutionMode } from '../types';

export interface TriggerAttributes {
    id: number;
    assetAddress: string;
    assetSymbol: string;
    chainId: number;
    threshold: number;
    direction: Direction;
    moveAmountType: 'ABSOLUTE' | 'PERCENT';
    moveAmount: number;
    hotWallet: string;
    coldWallet: string;
    executionMode: ExecutionMode;
    hysteresisBps: number;
    cooldownSec: number;
    enabled: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface TriggerCreationAttributes extends Optional<TriggerAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export class TriggerModel extends Model<TriggerAttributes, TriggerCreationAttributes> {
    // Remove public class fields to avoid shadowing Sequelize getters
    // These will be provided by Sequelize automatically
}

export const initTriggerModel = (sequelize: any) => {
    TriggerModel.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            assetAddress: {
                type: DataTypes.STRING(42),
                allowNull: false,
                comment: 'Token contract address',
            },
            assetSymbol: {
                type: DataTypes.STRING(10),
                allowNull: false,
                comment: 'Token symbol (ETH, BTC, etc.)',
            },
            chainId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                comment: 'Ethereum chain ID',
            },
            threshold: {
                type: DataTypes.DECIMAL(20, 8),
                allowNull: false,
                comment: 'Price threshold in USD',
            },
            direction: {
                type: DataTypes.ENUM('hot_to_cold', 'cold_to_hot'),
                allowNull: false,
            },
            moveAmountType: {
                type: DataTypes.ENUM('ABSOLUTE', 'PERCENT'),
                allowNull: false,
            },
            moveAmount: {
                type: DataTypes.DECIMAL(20, 8),
                allowNull: false,
                comment: 'Amount to move (absolute or percentage)',
            },
            hotWallet: {
                type: DataTypes.STRING(42),
                allowNull: false,
                comment: 'Hot wallet address',
            },
            coldWallet: {
                type: DataTypes.STRING(42),
                allowNull: false,
                comment: 'Cold wallet address',
            },
            executionMode: {
                type: DataTypes.ENUM('EOA', 'SAFE_PROPOSE', 'SAFE_EXECUTE'),
                allowNull: false,
                defaultValue: 'EOA',
            },
            hysteresisBps: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 100,
                comment: 'Hysteresis in basis points (1% = 100)',
            },
            cooldownSec: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 3600,
                comment: 'Minimum seconds between triggers',
            },
            enabled: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        },
        {
            sequelize,
            tableName: 'triggers',
            timestamps: true,
            indexes: [
                {
                    fields: ['asset_address', 'chain_id'],
                },
                {
                    fields: ['enabled'],
                },
            ],
        }
    );

    return TriggerModel;
};
