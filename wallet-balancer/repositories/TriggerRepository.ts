import { TriggerModel, TriggerAttributes } from '../models/Trigger';
import { Trigger, TriggerCreationAttributes } from '../types';

export class TriggerRepository {
    constructor(private sequelize: any) { }

    async createTrigger(trigger: TriggerCreationAttributes): Promise<Trigger> {
        try {
            const created = await TriggerModel.create({
                assetAddress: trigger.assetAddress,
                assetSymbol: trigger.assetSymbol,
                chainId: trigger.chainId,
                threshold: trigger.threshold,
                direction: trigger.direction,
                moveAmountType: trigger.moveAmountType,
                moveAmount: trigger.moveAmount,
                hotWallet: trigger.hotWallet,
                coldWallet: trigger.coldWallet,
                executionMode: trigger.executionMode,
                hysteresisBps: trigger.hysteresisBps,
                cooldownSec: trigger.cooldownSec,
                enabled: trigger.enabled,
            });

            // Access data directly from the model
            return this.mapToTrigger(created.dataValues);
        } catch (error) {
            console.error('[TriggerRepository] Failed to create trigger:', error);
            throw error;
        }
    }

    async getTriggerById(id: number): Promise<Trigger | null> {
        try {
            const trigger = await TriggerModel.findByPk(id);
            if (!trigger) return null;
            return this.mapToTrigger(trigger.dataValues);
        } catch (error) {
            console.error(`[TriggerRepository] Failed to get trigger ${id}:`, error);
            return null;
        }
    }

    async getAllTriggers(): Promise<Trigger[]> {
        try {
            const triggers = await TriggerModel.findAll();
            return triggers.map(trigger => this.mapToTrigger(trigger.dataValues));
        } catch (error) {
            console.error('[TriggerRepository] Failed to get all triggers:', error);
            return [];
        }
    }

    async getEnabledTriggersByTokenChain(assetAddress: string, chainId: number): Promise<Trigger[]> {
        try {
            const triggers = await TriggerModel.findAll({
                where: {
                    assetAddress,
                    chainId,
                    enabled: true,
                },
            });
            return triggers.map(trigger => this.mapToTrigger(trigger.dataValues));
        } catch (error) {
            console.error(`[TriggerRepository] Failed to get enabled triggers for ${assetAddress} on chain ${chainId}:`, error);
            return [];
        }
    }

    async updateTrigger(id: number, updates: Partial<Trigger>): Promise<void> {
        try {
            const updateData: any = {};

            if (updates.assetAddress !== undefined) updateData.assetAddress = updates.assetAddress;
            if (updates.assetSymbol !== undefined) updateData.assetSymbol = updates.assetSymbol;
            if (updates.chainId !== undefined) updateData.chainId = updates.chainId;
            if (updates.threshold !== undefined) updateData.threshold = updates.threshold;
            if (updates.direction !== undefined) updateData.direction = updates.direction;
            if (updates.moveAmountType !== undefined) updateData.moveAmountType = updates.moveAmountType;
            if (updates.moveAmount !== undefined) updateData.moveAmount = updates.moveAmount;
            if (updates.hotWallet !== undefined) updateData.hotWallet = updates.hotWallet;
            if (updates.coldWallet !== undefined) updateData.coldWallet = updates.coldWallet;
            if (updates.executionMode !== undefined) updateData.executionMode = updates.executionMode;
            if (updates.hysteresisBps !== undefined) updateData.hysteresisBps = updates.hysteresisBps;
            if (updates.cooldownSec !== undefined) updateData.cooldownSec = updates.cooldownSec;
            if (updates.enabled !== undefined) updateData.enabled = updates.enabled;

            const result = await TriggerModel.update(updateData, {
                where: { id }
            });

            if (result[0] === 0) {
                throw new Error(`Trigger ${id} not found`);
            }
        } catch (error) {
            console.error(`[TriggerRepository] Failed to update trigger ${id}:`, error);
            throw error;
        }
    }

    async deleteTrigger(id: number): Promise<void> {
        try {
            const result = await TriggerModel.destroy({
                where: { id }
            });

            if (result === 0) {
                throw new Error(`Trigger ${id} not found`);
            }
        } catch (error) {
            console.error(`[TriggerRepository] Failed to delete trigger ${id}:`, error);
            throw error;
        }
    }

    private mapToTrigger(dbTrigger: any): Trigger {
        return {
            id: dbTrigger.id,
            assetAddress: dbTrigger.assetAddress,
            assetSymbol: dbTrigger.assetSymbol,
            chainId: dbTrigger.chainId,
            threshold: dbTrigger.threshold,
            direction: dbTrigger.direction,
            moveAmountType: dbTrigger.moveAmountType,
            moveAmount: dbTrigger.moveAmount,
            hotWallet: dbTrigger.hotWallet,
            coldWallet: dbTrigger.coldWallet,
            executionMode: dbTrigger.executionMode,
            hysteresisBps: dbTrigger.hysteresisBps,
            cooldownSec: dbTrigger.cooldownSec,
            enabled: dbTrigger.enabled,
            createdAt: dbTrigger.createdAt!,
            updatedAt: dbTrigger.updatedAt!,
        };
    }
}
