import { DataTypes, Model, Optional } from 'sequelize';

export interface LastGoodStoreAttributes {
    id: number;
    token: string;
    price: string; // BigInt stored as string
    priceDecimals: number;
    at: number; // Unix timestamp
    source: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface LastGoodStoreCreationAttributes extends Optional<LastGoodStoreAttributes, 'id' | 'createdAt' | 'updatedAt'> { }

export class LastGoodStoreModel extends Model<LastGoodStoreAttributes, LastGoodStoreCreationAttributes> {
    // Remove public class fields to avoid shadowing Sequelize getters
    // These will be provided by Sequelize automatically
}

export const initLastGoodStoreModel = (sequelize: any) => {
    LastGoodStoreModel.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            token: {
                type: DataTypes.STRING(10),
                allowNull: false,
            },
            price: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'BigInt stored as string',
            },
            priceDecimals: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            at: {
                type: DataTypes.BIGINT,
                allowNull: false,
                comment: 'Unix timestamp',
            },
            source: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
        },
        {
            sequelize,
            tableName: 'last_good_store',
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['token'],
                },
            ],
        }
    );

    return LastGoodStoreModel;
};
