import { loadConfig } from './config/appConfig';
import { createWalletBalancerDatabase } from './config/database';
import { TriggerRepository } from './repositories/TriggerRepository';
import { TransferIntentRepository } from './repositories/TransferIntentRepository';
import { WalletBalancerService } from './core/WalletBalancerService';

export class WalletBalancer {
    private service!: WalletBalancerService;
    private isInitialized = false;

    constructor() {
        // Will be initialized in start()
    }

    /**
     * Starts the wallet balancer
     */
    async start(): Promise<void> {
        try {
            console.log('[WalletBalancer] Starting wallet balancer...');

            // Load configuration
            const config = loadConfig();
            console.log('[WalletBalancer] Configuration loaded');

            // Initialize database
            const sequelize = createWalletBalancerDatabase(config);
            await sequelize.authenticate();
            console.log('[WalletBalancer] Database connected');

            // Sync database models
            await sequelize.sync({ alter: true });
            console.log('[WalletBalancer] Database models synced');

            // Initialize repositories
            const triggerRepo = new TriggerRepository(sequelize);
            const transferIntentRepo = new TransferIntentRepository(sequelize);
            console.log('[WalletBalancer] Repositories initialized');

            // Initialize service
            this.service = new WalletBalancerService(config, triggerRepo, transferIntentRepo);

            // Set up event listeners
            this.setupEventListeners();

            // Start the service
            await this.service.start();

            this.isInitialized = true;
            console.log('[WalletBalancer] Wallet balancer started successfully');

        } catch (error) {
            console.error('[WalletBalancer] Failed to start:', error);
            throw error;
        }
    }

    /**
     * Stops the wallet balancer
     */
    async stop(): Promise<void> {
        if (!this.isInitialized) {
            console.log('[WalletBalancer] Not initialized, nothing to stop');
            return;
        }

        try {
            console.log('[WalletBalancer] Stopping wallet balancer...');
            await this.service.stop();
            this.isInitialized = false;
            console.log('[WalletBalancer] Wallet balancer stopped successfully');
        } catch (error) {
            console.error('[WalletBalancer] Failed to stop:', error);
            throw error;
        }
    }

    /**
     * Gets the wallet balancer service instance
     */
    getService(): WalletBalancerService | null {
        return this.isInitialized ? this.service : null;
    }

    /**
     * Sets up event listeners for the service
     */
    private setupEventListeners(): void {
        if (!this.service) return;

        this.service.on('started', () => {
            console.log('[WalletBalancer] Service started event received');
        });

        this.service.on('stopped', () => {
            console.log('[WalletBalancer] Service stopped event received');
        });

        this.service.on('error', (error) => {
            console.error('[WalletBalancer] Service error event received:', error);
        });

        this.service.on('transferError', ({ signal, error }) => {
            console.error(`[WalletBalancer] Transfer error for trigger ${signal.triggerId}:`, error);
        });
    }

    /**
     * Gets the current status
     */
    getStatus(): { isInitialized: boolean; serviceStatus?: any } {
        const status: any = { isInitialized: this.isInitialized };

        if (this.isInitialized && this.service) {
            status.serviceStatus = this.service.getStatus();
        }

        return status;
    }
}

// Export for use in other modules
export { WalletBalancerService } from './core/WalletBalancerService';
export { TriggerRepository } from './repositories/TriggerRepository';
export { TransferIntentRepository } from './repositories/TransferIntentRepository';
export { TriggerEvaluator } from './core/TriggerEvaluator';
export { EOAExecutionEngine } from './core/EOAExecutionEngine';
export { loadConfig } from './config/appConfig';
export { createWalletBalancerDatabase } from './config/database';
export * from './types';
