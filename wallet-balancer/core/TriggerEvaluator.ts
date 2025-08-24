import { Trigger, ConsolidatedPriceMsg, TriggerSignal, Direction } from '../types';
import { TransferIntentRepository } from '../repositories/TransferIntentRepository';

export class TriggerEvaluator {
    constructor(
        private transferIntentRepo: TransferIntentRepository
    ) { }

    /**
     * Evaluates if a trigger should fire based on current price and conditions
     */
    async evaluateTrigger(
        trigger: Trigger,
        priceMsg: ConsolidatedPriceMsg,
        currentBalance: bigint
    ): Promise<TriggerSignal | null> {
        try {
            // Check if trigger is enabled
            if (!trigger.enabled) {
                return null;
            }

            // Check cooldown period
            const timeSinceLastTrigger = await this.getTimeSinceLastTrigger(trigger.id);
            if (timeSinceLastTrigger < trigger.cooldownSec) {
                return null;
            }

            // Convert price to number for comparison
            const currentPrice = this.convertBigIntToNumber(priceMsg.price, priceMsg.priceDecimals);

            // Check if price threshold is met
            if (!this.isThresholdMet(trigger, currentPrice)) {
                return null;
            }

            // Calculate transfer amount
            const transferAmount = this.calculateTransferAmount(trigger, currentBalance);
            if (transferAmount === 0n) {
                return null;
            }

            // Check if we have sufficient balance
            if (transferAmount > currentBalance) {
                console.log(`[TriggerEvaluator] Insufficient balance for trigger ${trigger.id}: ${transferAmount} > ${currentBalance}`);
                return null;
            }

            // Create trigger signal
            const signal: TriggerSignal = {
                triggerId: trigger.id,
                price: priceMsg.price,
                priceDecimals: priceMsg.priceDecimals,
                direction: trigger.direction,
                amount: transferAmount,
                executionMode: trigger.executionMode,
                timestamp: priceMsg.at,
            };

            console.log(`[TriggerEvaluator] Trigger ${trigger.id} fired: ${trigger.direction} ${transferAmount} at price ${currentPrice}`);
            return signal;

        } catch (error) {
            console.error(`[TriggerEvaluator] Error evaluating trigger ${trigger.id}:`, error);
            return null;
        }
    }

    /**
     * Checks if price threshold is met considering hysteresis
     */
    private isThresholdMet(trigger: Trigger, currentPrice: number): boolean {
        const threshold = trigger.threshold;
        const hysteresis = threshold * (trigger.hysteresisBps / 10000);

        if (trigger.direction === 'hot_to_cold') {
            // Move to cold when price is HIGH (above threshold)
            return currentPrice >= threshold + hysteresis;
        } else {
            // Move to hot when price is LOW (below threshold)
            return currentPrice <= threshold - hysteresis;
        }
    }

    /**
     * Calculates the amount to transfer based on trigger configuration
     */
    private calculateTransferAmount(trigger: Trigger, currentBalance: bigint): bigint {
        if (trigger.moveAmountType === 'ABSOLUTE') {
            // Convert decimal amount to BigInt (assuming 18 decimals for most tokens)
            return BigInt(Math.floor(trigger.moveAmount * 1e18));
        } else {
            // Percentage-based transfer
            const percentage = trigger.moveAmount / 100;
            return (currentBalance * BigInt(Math.floor(percentage * 1e6))) / 1000000n;
        }
    }

    /**
     * Gets time since last trigger to enforce cooldown
     */
    private async getTimeSinceLastTrigger(triggerId: number): Promise<number> {
        try {
            const lastIntent = await this.transferIntentRepo.getIntentsByStatus('MINED_SUCCESS');
            const lastTriggerIntent = lastIntent
                .filter(intent => intent.triggerId === triggerId)
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

            if (!lastTriggerIntent) {
                return Infinity; // No previous trigger, cooldown not applicable
            }

            const now = Date.now();
            const lastTriggerTime = lastTriggerIntent.createdAt.getTime();
            return Math.floor((now - lastTriggerTime) / 1000);
        } catch (error) {
            console.error(`[TriggerEvaluator] Error getting time since last trigger:`, error);
            return 0; // Default to allowing trigger
        }
    }

    /**
     * Converts BigInt price to number for threshold comparison
     */
    private convertBigIntToNumber(price: bigint, decimals: number): number {
        const divisor = BigInt(10 ** decimals);
        const wholePart = Number(price / divisor);
        const fractionalPart = Number(price % divisor) / Number(divisor);
        return wholePart + fractionalPart;
    }

    /**
     * Evaluates multiple triggers for a given price message
     */
    async evaluateTriggers(
        triggers: Trigger[],
        priceMsg: ConsolidatedPriceMsg,
        currentBalance: bigint
    ): Promise<TriggerSignal[]> {
        const signals: TriggerSignal[] = [];

        for (const trigger of triggers) {
            const signal = await this.evaluateTrigger(trigger, priceMsg, currentBalance);
            if (signal) {
                signals.push(signal);
            }
        }

        return signals;
    }
}
