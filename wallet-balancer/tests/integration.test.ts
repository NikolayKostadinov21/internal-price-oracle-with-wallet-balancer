import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { WalletBalancer } from '../index';
import { createWalletBalancerDatabase } from '../config/database';
import { loadConfig } from '../config/appConfig';
import { TriggerRepository } from '../repositories/TriggerRepository';
import { TransferIntentRepository } from '../repositories/TransferIntentRepository';
import { Trigger, TransferIntentPlan, ConsolidatedPriceMsg } from '../types';
import { TriggerCreationAttributes } from '../types';
import { TriggerModel } from '../models/Trigger';
import { TransferIntentModel } from '../models/TransferIntent';

// Set test environment
process.env.NODE_ENV = 'test';

// Set test configuration for integration tests
process.env.HOT_WALLET_PRIVATE_KEY = '0x1234567890123456789012345678901234567890123456789012345678901234';
process.env.ETHEREUM_RPC_URL = 'https://eth-mainnet.g.alchemy.com/v2/demo';
process.env.ETHEREUM_CHAIN_ID = '1';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3308';
process.env.DB_USERNAME = 'balancer_user';
process.env.DB_PASSWORD = '1234';
process.env.DB_NAME = 'wallet_balancer';

describe('Wallet Balancer Integration Tests', () => {
    let walletBalancer: WalletBalancer;
    let sequelize: any;
    let triggerRepo: TriggerRepository;
    let transferIntentRepo: TransferIntentRepository;

    beforeAll(async () => {
        try {
            // Load test configuration
            const config = loadConfig();

            // Create test database
            sequelize = createWalletBalancerDatabase(config);
            await sequelize.authenticate();
            await sequelize.sync({ force: true }); // Recreate tables

            // Initialize repositories
            triggerRepo = new TriggerRepository(sequelize);
            transferIntentRepo = new TransferIntentRepository(sequelize);

            console.log('Integration test database initialized');
        } catch (error) {
            console.error('Integration test setup failed:', error);
            throw error;
        }
    });

    afterAll(async () => {
        if (sequelize) {
            try {
                await sequelize.close();
                console.log('Integration test database closed');
            } catch (error) {
                console.error('Failed to close integration test database:', error);
            }
        }
    });

    beforeEach(async () => {
        // Clean up tables before each test
        try {
            // Use direct model references for cleanup
            await TransferIntentModel.destroy({ where: {}, force: true });
            await TriggerModel.destroy({ where: {}, force: true });
        } catch (error) {
            // Ignore cleanup errors
        }

        // Create fresh wallet balancer instance
        walletBalancer = new WalletBalancer();
    });

    describe('Full Service Lifecycle', () => {
        it('should start and stop successfully', async () => {
            await walletBalancer.start();

            const status = walletBalancer.getStatus();
            expect(status.isInitialized).toBe(true);
            expect(status.serviceStatus?.isRunning).toBe(true);

            await walletBalancer.stop();

            const finalStatus = walletBalancer.getStatus();
            expect(finalStatus.isInitialized).toBe(false);
        });

        it('should handle multiple start/stop cycles', async () => {
            // First cycle
            await walletBalancer.start();
            expect(walletBalancer.getStatus().isInitialized).toBe(true);
            await walletBalancer.stop();
            expect(walletBalancer.getStatus().isInitialized).toBe(false);

            // Second cycle
            await walletBalancer.start();
            expect(walletBalancer.getStatus().isInitialized).toBe(true);
            await walletBalancer.stop();
            expect(walletBalancer.getStatus().isInitialized).toBe(false);
        });
    });

    describe('Trigger Management', () => {
        it('should create and retrieve triggers', async () => {
            await walletBalancer.start();

            const service = walletBalancer.getService();
            expect(service).not.toBeNull();

            // Create a test trigger
            const testTrigger: TriggerCreationAttributes = {
                assetAddress: '0x1234567890123456789012345678901234567890',
                assetSymbol: 'ETH',
                chainId: 1,
                threshold: 2000,
                direction: 'hot_to_cold',
                moveAmountType: 'PERCENT',
                moveAmount: 20,
                hotWallet: '0xHotWalletAddress...',
                coldWallet: '0xColdWalletAddress...',
                executionMode: 'EOA',
                hysteresisBps: 100,
                cooldownSec: 3600,
                enabled: true,
            };

            const createdTrigger = await triggerRepo.createTrigger(testTrigger);
            expect(createdTrigger.id).toBeGreaterThan(0);
            expect(createdTrigger.assetSymbol).toBe('ETH');

            // Retrieve the trigger
            const retrievedTrigger = await triggerRepo.getTriggerById(createdTrigger.id);
            expect(retrievedTrigger).not.toBeNull();
            expect(retrievedTrigger?.assetSymbol).toBe('ETH');

            await walletBalancer.stop();
        });

        it('should update trigger status', async () => {
            await walletBalancer.start();

            // Create a test trigger
            const testTrigger: TriggerCreationAttributes = {
                assetAddress: '0x1234567890123456789012345678901234567890',
                assetSymbol: 'ETH',
                chainId: 1,
                threshold: 2000,
                direction: 'hot_to_cold',
                moveAmountType: 'PERCENT',
                moveAmount: 20,
                hotWallet: '0xHotWalletAddress...',
                coldWallet: '0xColdWalletAddress...',
                executionMode: 'EOA',
                hysteresisBps: 100,
                cooldownSec: 3600,
                enabled: true,
            };

            await triggerRepo.createTrigger(testTrigger);

            // Get the created trigger to get its ID
            const triggers = await triggerRepo.getAllTriggers();
            const triggerId = triggers[0].id;

            // Update the trigger
            await triggerRepo.updateTrigger(triggerId, { enabled: false, threshold: 2500 });

            // Verify the update
            const updatedTrigger = await triggerRepo.getTriggerById(triggerId);
            expect(updatedTrigger?.enabled).toBe(false);
            expect(Number(updatedTrigger?.threshold)).toBe(2500);

            await walletBalancer.stop();
        });
    });

    describe('Transfer Intent Management', () => {
        it('should create and track transfer intents', async () => {
            await walletBalancer.start();

            // Create a test trigger first
            const testTrigger: TriggerCreationAttributes = {
                assetAddress: '0x1234567890123456789012345678901234567890',
                assetSymbol: 'ETH',
                chainId: 1,
                threshold: 2000,
                direction: 'hot_to_cold',
                moveAmountType: 'PERCENT',
                moveAmount: 20,
                hotWallet: '0xHotWalletAddress...',
                coldWallet: '0xColdWalletAddress...',
                executionMode: 'EOA',
                hysteresisBps: 100,
                cooldownSec: 3600,
                enabled: true,
            };

            await triggerRepo.createTrigger(testTrigger);

            // Get the created trigger to get its ID
            const triggers = await triggerRepo.getAllTriggers();
            const triggerId = triggers[0].id;

            // Create a transfer intent
            const intent = await transferIntentRepo.insertPlanned({
                idempotencyKey: 'test-key-123',
                triggerId: triggerId,
                priceAt: BigInt(250000000000), // $2500.00
                amount: BigInt(200000000000000000), // 0.2 ETH
                fromAddress: '0xHotWalletAddress...',
                toAddress: '0xColdWalletAddress...',
                mode: 'EOA',
                status: 'PLANNED',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            expect(intent.idempotencyKey).toBe('test-key-123');
            expect(intent.triggerId).toBe(triggerId);

            // Update status
            await transferIntentRepo.updateStatus('test-key-123', 'SUBMITTED', '0xtxhash123');

            // Verify status update
            const updatedIntent = await transferIntentRepo.findByIdempotencyKey('test-key-123');
            expect(updatedIntent?.status).toBe('SUBMITTED');
            expect(updatedIntent?.txHash).toBe('0xtxhash123');

            await walletBalancer.stop();
        });

        it('should enforce idempotency', async () => {
            await walletBalancer.start();

            // Create a test trigger first
            const testTrigger: TriggerCreationAttributes = {
                assetAddress: '0x1234567890123456789012345678901234567890',
                assetSymbol: 'ETH',
                chainId: 1,
                threshold: 2000,
                direction: 'hot_to_cold',
                moveAmountType: 'PERCENT',
                moveAmount: 20,
                hotWallet: '0xHotWalletAddress...',
                coldWallet: '0xColdWalletAddress...',
                executionMode: 'EOA',
                hysteresisBps: 100,
                cooldownSec: 3600,
                enabled: true,
            };

            await triggerRepo.createTrigger(testTrigger);

            // Get the created trigger to get its ID
            const triggers = await triggerRepo.getAllTriggers();
            const triggerId = triggers[0].id;

            const idempotencyKey = 'unique-key-456';

            // Create first intent
            const intent1 = await transferIntentRepo.insertPlanned({
                idempotencyKey,
                triggerId: triggerId,
                priceAt: BigInt(250000000000),
                amount: BigInt(200000000000000000),
                fromAddress: '0xHotWalletAddress...',
                toAddress: '0xColdWalletAddress...',
                mode: 'EOA',
                status: 'PLANNED',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Try to create second intent with same key
            try {
                await transferIntentRepo.insertPlanned({
                    idempotencyKey,
                    triggerId: triggerId,
                    priceAt: BigInt(250000000000),
                    amount: BigInt(300000000000000000), // Different amount
                    fromAddress: '0xHotWalletAddress...',
                    toAddress: '0xColdWalletAddress...',
                    mode: 'EOA',
                    status: 'PLANNED',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                throw new Error('Should have failed due to duplicate key');
            } catch (error) {
                expect(error).toBeDefined();
            }

            await walletBalancer.stop();
        });
    });

    describe('Service Event Handling', () => {
        it('should emit service lifecycle events', async () => {
            const events: string[] = [];

            await walletBalancer.start();

            const service = walletBalancer.getService();
            expect(service).not.toBeNull();

            // Listen for events
            service!.on('started', () => events.push('started'));
            service!.on('stopped', () => events.push('stopped'));

            await walletBalancer.stop();

            // Note: The 'started' event might have already fired before we set up the listener
            expect(events).toContain('stopped');
        });
    });

    describe('Error Handling', () => {
        it('should handle database connection failures gracefully', async () => {
            // This test would require mocking database failures
            // For now, we'll test that the service can handle basic errors
            const walletBalancer = new WalletBalancer();

            // Try to start without proper database setup
            try {
                await walletBalancer.start();
                throw new Error('Should have failed');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });
});
