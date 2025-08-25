import { DataTypes, Model, Optional } from 'sequelize';
import { ExecutionMode, TransferIntentStatus } from '../types';

export interface TransferIntentAttributes {
    id: number;
    idempotencyKey: string;
    triggerId: number;
    priceAt: bigint;
    amount: string; // BigInt stored as string
    fromAddress: string;
    toAddress: string;
    mode: ExecutionMode;
    status: TransferIntentStatus;
    safeTxHash?: string;
    txHash?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface TransferIntentCreationAttributes extends Optional<TransferIntentAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export class TransferIntentModel extends Model<TransferIntentAttributes, TransferIntentCreationAttributes> {
    // Remove public class fields to avoid shadowing Sequelize getters
    // These will be provided by Sequelize automatically
}

export const initTransferIntentModel = (sequelize: any) => {
    TransferIntentModel.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            idempotencyKey: {
                type: DataTypes.STRING(64),
                allowNull: false,
                unique: true,
                comment: 'Unique idempotency key to prevent duplicate transfers',
            },
            triggerId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                comment: 'Reference to the trigger that fired',
            },
            priceAt: {
                type: DataTypes.BIGINT,
                allowNull: false,
                comment: 'Price when trigger fired (timestamp)',
            },
            amount: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'Amount to transfer (BigInt as string)',
            },
            fromAddress: {
                type: DataTypes.STRING(42),
                allowNull: false,
                comment: 'Source wallet address',
            },
            toAddress: {
                type: DataTypes.STRING(42),
                allowNull: false,
                comment: 'Destination wallet address',
            },
            mode: {
                type: DataTypes.ENUM('EOA', 'SAFE_PROPOSE', 'SAFE_EXECUTE'),
                allowNull: false,
            },
            status: {
                type: DataTypes.ENUM('PLANNED', 'PROPOSED', 'SUBMITTED', 'MINED_SUCCESS', 'MINED_FAILED'),
                allowNull: false,
                defaultValue: 'PLANNED',
            },
            safeTxHash: {
                type: DataTypes.STRING(66),
                allowNull: true,
                comment: 'Safe transaction hash for multisig operations',
            },
            txHash: {
                type: DataTypes.STRING(66),
                allowNull: true,
                comment: 'Ethereum transaction hash',
            },
        },
        {
            sequelize,
            tableName: 'transfer_intents',
            timestamps: true,
            underscored: true, // Use snake_case for database columns
            indexes: [
                {
                    unique: true,
                    fields: ['idempotency_key'],
                },
                {
                    fields: ['trigger_id'],
                },
                {
                    fields: ['status'],
                },
                {
                    fields: ['from_address'],
                },
            ],
        }
    );

    return TransferIntentModel;
};
