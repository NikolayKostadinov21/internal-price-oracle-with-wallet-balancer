import { TransferIntentModel, TransferIntentAttributes } from '../models/TransferIntent';
import { TransferIntentPlan, TransferIntentStatus } from '../types';

export class TransferIntentRepository {
    constructor(private sequelize: any) { }

    async insertPlanned(intent: TransferIntentPlan): Promise<TransferIntentPlan> {
        try {
            const created = await TransferIntentModel.create({
                idempotencyKey: intent.idempotencyKey,
                triggerId: intent.triggerId,
                priceAt: intent.priceAt,
                amount: intent.amount.toString(),
                fromAddress: intent.fromAddress,
                toAddress: intent.toAddress,
                mode: intent.mode,
                status: intent.status,
                safeTxHash: intent.safeTxHash,
                txHash: intent.txHash,
            });

            return this.mapToTransferIntentPlan(created.get());
        } catch (error) {
            console.error('[TransferIntentRepository] Failed to insert planned intent:', error);
            throw error;
        }
    }

    async updateStatus(idempotencyKey: string, status: TransferIntentStatus, txHash?: string, safeTxHash?: string): Promise<void> {
        try {
            const updateData: any = { status };
            if (txHash !== undefined) updateData.txHash = txHash;
            if (safeTxHash !== undefined) updateData.safeTxHash = safeTxHash;

            const result = await TransferIntentModel.update(updateData, {
                where: { idempotencyKey }
            });

            if (result[0] === 0) {
                throw new Error(`Transfer intent with key ${idempotencyKey} not found`);
            }
        } catch (error) {
            console.error(`[TransferIntentRepository] Failed to update status for ${idempotencyKey}:`, error);
            throw error;
        }
    }

    async findPendingByAccount(fromAddress: string): Promise<TransferIntentPlan[]> {
        try {
            const intents = await TransferIntentModel.findAll({
                where: {
                    fromAddress,
                    status: ['PLANNED', 'PROPOSED', 'SUBMITTED'],
                },
                order: [['createdAt', 'ASC']],
            });

            return intents.map(intent => this.mapToTransferIntentPlan(intent.dataValues));
        } catch (error) {
            console.error(`[TransferIntentRepository] Failed to find pending intents for ${fromAddress}:`, error);
            return [];
        }
    }

    async findByIdempotencyKey(idempotencyKey: string): Promise<TransferIntentPlan | null> {
        try {
            const intent = await TransferIntentModel.findOne({
                where: { idempotencyKey }
            });

            if (!intent) return null;
            return this.mapToTransferIntentPlan(intent.dataValues);
        } catch (error) {
            console.error(`[TransferIntentRepository] Failed to find intent by key ${idempotencyKey}:`, error);
            return null;
        }
    }

    async getAllIntents(): Promise<TransferIntentPlan[]> {
        try {
            const intents = await TransferIntentModel.findAll({
                order: [['createdAt', 'DESC']],
            });

            return intents.map(intent => this.mapToTransferIntentPlan(intent.dataValues));
        } catch (error) {
            console.error('[TransferIntentRepository] Failed to get all intents:', error);
            return [];
        }
    }

    async getIntentsByStatus(status: TransferIntentStatus): Promise<TransferIntentPlan[]> {
        try {
            const intents = await TransferIntentModel.findAll({
                where: { status },
                order: [['createdAt', 'ASC']],
            });

            return intents.map(intent => this.mapToTransferIntentPlan(intent.dataValues));
        } catch (error) {
            console.error(`[TransferIntentRepository] Failed to get intents by status ${status}:`, error);
            return [];
        }
    }

    private mapToTransferIntentPlan(dbIntent: any): TransferIntentPlan {
        return {
            idempotencyKey: dbIntent.idempotencyKey,
            triggerId: dbIntent.triggerId,
            priceAt: dbIntent.priceAt,
            amount: BigInt(dbIntent.amount),
            fromAddress: dbIntent.fromAddress,
            toAddress: dbIntent.toAddress,
            mode: dbIntent.mode,
            status: dbIntent.status,
            safeTxHash: dbIntent.safeTxHash,
            txHash: dbIntent.txHash,
            createdAt: dbIntent.createdAt!,
            updatedAt: dbIntent.updatedAt!,
        };
    }
}
