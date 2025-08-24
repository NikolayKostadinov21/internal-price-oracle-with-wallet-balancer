import { ethers } from 'ethers';
import { TriggerSignal, TransferIntentPlan, TransferIntentStatus } from '../types';
import { TransferIntentRepository } from '../repositories/TransferIntentRepository';
import { AppConfig } from '../config/appConfig';

export class EOAExecutionEngine {
    private provider: ethers.JsonRpcProvider;
    private signer: ethers.Wallet | null = null;

    constructor(
        private config: AppConfig,
        private transferIntentRepo: TransferIntentRepository
    ) {
        this.provider = new ethers.JsonRpcProvider(config.ETHEREUM_RPC_URL);

        if (config.HOT_WALLET_PRIVATE_KEY) {
            this.signer = new ethers.Wallet(config.HOT_WALLET_PRIVATE_KEY, this.provider);
            console.log(`[EOAExecutionEngine] Initialized with hot wallet: ${this.signer.address}`);
        } else {
            console.warn('[EOAExecutionEngine] No hot wallet private key configured - EOA mode disabled');
        }
    }

    /**
     * Executes a transfer using EOA (Externally Owned Account)
     */
    async executeTransfer(signal: TriggerSignal): Promise<TransferIntentPlan | null> {
        try {
            if (!this.signer) {
                throw new Error('EOA execution not available - no private key configured');
            }

            // Create idempotency key
            const idempotencyKey = this.generateIdempotencyKey(signal);

            // Check if already executed
            const existingIntent = await this.transferIntentRepo.findByIdempotencyKey(idempotencyKey);
            if (existingIntent) {
                console.log(`[EOAExecutionEngine] Transfer already planned with key: ${idempotencyKey}`);
                return existingIntent;
            }

            // Create transfer intent plan
            const intent: TransferIntentPlan = {
                idempotencyKey,
                triggerId: signal.triggerId,
                priceAt: signal.price,
                amount: signal.amount,
                fromAddress: this.signer.address,
                toAddress: this.getDestinationAddress(signal),
                mode: 'EOA',
                status: 'PLANNED',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // Store the planned intent
            await this.transferIntentRepo.insertPlanned(intent);

            // Execute the transfer
            const txHash = await this.submitTransfer(signal);

            // Update intent with transaction hash
            await this.transferIntentRepo.updateStatus(idempotencyKey, 'SUBMITTED', txHash);

            // Wait for confirmation
            const receipt = await this.provider.waitForTransaction(txHash, 1);

            if (receipt?.status === 1) {
                await this.transferIntentRepo.updateStatus(idempotencyKey, 'MINED_SUCCESS', txHash);
                console.log(`[EOAExecutionEngine] Transfer executed successfully: ${txHash}`);
            } else {
                await this.transferIntentRepo.updateStatus(idempotencyKey, 'MINED_FAILED', txHash);
                console.error(`[EOAExecutionEngine] Transfer failed: ${txHash}`);
            }

            return intent;

        } catch (error) {
            console.error('[EOAExecutionEngine] Failed to execute transfer:', error);
            return null;
        }
    }

    /**
     * Submits the actual transfer transaction
     */
    private async submitTransfer(signal: TriggerSignal): Promise<string> {
        if (!this.signer) {
            throw new Error('No signer available');
        }

        // For now, we'll do a simple ETH transfer
        // In production, this would handle ERC-20 tokens and other assets
        const tx = await this.signer.sendTransaction({
            to: this.getDestinationAddress(signal),
            value: signal.amount,
            gasLimit: 21000, // Standard ETH transfer gas limit
        });

        return tx.hash;
    }

    /**
     * Determines destination address based on transfer direction
     */
    private getDestinationAddress(signal: TriggerSignal): string {
        // This is a simplified version - in production, you'd get the actual
        // hot/cold wallet addresses from the trigger configuration
        if (signal.direction === 'hot_to_cold') {
            // Move from hot to cold wallet
            return '0x0000000000000000000000000000000000000000'; // Placeholder
        } else {
            // Move from cold to hot wallet
            return this.signer?.address || '0x0000000000000000000000000000000000000000';
        }
    }

    /**
     * Generates unique idempotency key for the transfer
     */
    private generateIdempotencyKey(signal: TriggerSignal): string {
        const timestamp = Math.floor(Date.now() / 1000);
        const data = `${signal.triggerId}-${signal.timestamp}-${signal.amount}-${signal.direction}`;
        return ethers.keccak256(ethers.toUtf8Bytes(data)).slice(2, 18); // 16 chars
    }

    /**
     * Gets current balance of the hot wallet
     */
    async getHotWalletBalance(): Promise<bigint> {
        if (!this.signer) {
            return 0n;
        }

        try {
            const balance = await this.provider.getBalance(this.signer.address);
            return balance;
        } catch (error) {
            console.error('[EOAExecutionEngine] Failed to get hot wallet balance:', error);
            return 0n;
        }
    }

    /**
     * Checks if EOA execution is available
     */
    isAvailable(): boolean {
        return this.signer !== null;
    }
}
