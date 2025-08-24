import { EventEmitter } from 'events';
import { Trigger, ConsolidatedPriceMsg, TriggerSignal } from '../types';
import { TriggerRepository } from '../repositories/TriggerRepository';
import { TransferIntentRepository } from '../repositories/TransferIntentRepository';
import { TriggerEvaluator } from './TriggerEvaluator';
import { EOAExecutionEngine } from './EOAExecutionEngine';
import { AppConfig } from '../config/appConfig';

export class WalletBalancerService extends EventEmitter {
    private triggerEvaluator: TriggerEvaluator;
    private eoaEngine: EOAExecutionEngine;
    private isRunning = false;

    constructor(
        private config: AppConfig,
        private triggerRepo: TriggerRepository,
        private transferIntentRepo: TransferIntentRepository
    ) {
        super();

        this.triggerEvaluator = new TriggerEvaluator(transferIntentRepo);
        this.eoaEngine = new EOAExecutionEngine(config, transferIntentRepo);
    }

    /**
     * Starts the wallet balancer service
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('[WalletBalancerService] Service already running');
            return;
        }

        try {
            console.log('[WalletBalancerService] Starting wallet balancer service...');

            // Initialize database connection
            await this.initializeDatabase();

            this.isRunning = true;
            this.emit('started');

            console.log('[WalletBalancerService] Service started successfully');
        } catch (error) {
            console.error('[WalletBalancerService] Failed to start service:', error);
            throw error;
        }
    }

    /**
     * Stops the wallet balancer service
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            console.log('[WalletBalancerService] Service not running');
            return;
        }

        try {
            console.log('[WalletBalancerService] Stopping wallet balancer service...');

            this.isRunning = false;
            this.emit('stopped');

            console.log('[WalletBalancerService] Service stopped successfully');
        } catch (error) {
            console.error('[WalletBalancerService] Failed to stop service:', error);
            throw error;
        }
    }

    /**
     * Processes a price message and evaluates triggers
     */
    async processPriceMessage(priceMsg: ConsolidatedPriceMsg): Promise<void> {
        if (!this.isRunning) {
            console.log('[WalletBalancerService] Service not running, skipping price message');
            return;
        }

        try {
            console.log(`[WalletBalancerService] Processing price message for ${priceMsg.token} on chain ${priceMsg.chainId}`);

            // Get enabled triggers for this token/chain
            const triggers = await this.triggerRepo.getEnabledTriggersByTokenChain(
                priceMsg.token,
                priceMsg.chainId
            );

            if (triggers.length === 0) {
                console.log(`[WalletBalancerService] No enabled triggers found for ${priceMsg.token} on chain ${priceMsg.chainId}`);
                return;
            }

            // Get current balance for evaluation
            const currentBalance = await this.getCurrentBalance(priceMsg.token, priceMsg.chainId);

            // Evaluate triggers
            const signals = await this.triggerEvaluator.evaluateTriggers(
                triggers,
                priceMsg,
                currentBalance
            );

            if (signals.length === 0) {
                console.log(`[WalletBalancerService] No triggers fired for ${priceMsg.token}`);
                return;
            }

            // Execute transfers for fired triggers
            await this.executeTransfers(signals);

        } catch (error) {
            console.error('[WalletBalancerService] Error processing price message:', error);
            this.emit('error', error);
        }
    }

    /**
     * Executes transfers for multiple trigger signals
     */
    private async executeTransfers(signals: TriggerSignal[]): Promise<void> {
        console.log(`[WalletBalancerService] Executing ${signals.length} transfers`);

        for (const signal of signals) {
            try {
                await this.executeTransfer(signal);
            } catch (error) {
                console.error(`[WalletBalancerService] Failed to execute transfer for signal ${signal.triggerId}:`, error);
                this.emit('transferError', { signal, error });
            }
        }
    }

    /**
     * Executes a single transfer based on trigger signal
     */
    private async executeTransfer(signal: TriggerSignal): Promise<void> {
        try {
            if (signal.executionMode === 'EOA' && this.eoaEngine.isAvailable()) {
                console.log(`[WalletBalancerService] Executing EOA transfer for trigger ${signal.triggerId}`);
                await this.eoaEngine.executeTransfer(signal);
            } else {
                console.log(`[WalletBalancerService] Execution mode ${signal.executionMode} not available for trigger ${signal.triggerId}`);
                // TODO: Implement Safe execution modes
            }
        } catch (error) {
            console.error(`[WalletBalancerService] Failed to execute transfer for signal ${signal.triggerId}:`, error);
            throw error;
        }
    }

    /**
     * Gets current balance for a token/chain combination
     */
    private async getCurrentBalance(token: string, chainId: number): Promise<bigint> {
        // For now, return a placeholder balance
        // In production, this would query the actual wallet balances
        if (token === 'ETH' && chainId === 1) {
            return await this.eoaEngine.getHotWalletBalance();
        }

        // Placeholder balance for other tokens
        return 1000000000000000000n; // 1 token with 18 decimals
    }

    /**
     * Initializes database connection
     */
    private async initializeDatabase(): Promise<void> {
        try {
            // Test database connection by getting triggers count
            const triggersCount = await this.triggerRepo.getAllTriggers();
            console.log(`[WalletBalancerService] Database initialized, found ${triggersCount.length} triggers`);
        } catch (error) {
            console.error('[WalletBalancerService] Database initialization failed:', error);
            throw error;
        }
    }

    /**
     * Gets service status
     */
    getStatus(): { isRunning: boolean; eoaAvailable: boolean } {
        return {
            isRunning: this.isRunning,
            eoaAvailable: this.eoaEngine.isAvailable(),
        };
    }

    /**
     * Manually triggers a transfer (for testing/debugging)
     */
    async manualTrigger(triggerId: number): Promise<void> {
        try {
            const trigger = await this.triggerRepo.getTriggerById(triggerId);
            if (!trigger) {
                throw new Error(`Trigger ${triggerId} not found`);
            }

            // Create a mock price message
            const mockPriceMsg: ConsolidatedPriceMsg = {
                token: trigger.assetAddress,
                chainId: trigger.chainId,
                price: BigInt(Math.floor(trigger.threshold * 1e8)), // Convert threshold to BigInt
                priceDecimals: 8,
                at: Date.now(),
                mode: 'normal',
            };

            await this.processPriceMessage(mockPriceMsg);
        } catch (error) {
            console.error(`[WalletBalancerService] Manual trigger failed for ${triggerId}:`, error);
            throw error;
        }
    }
}
