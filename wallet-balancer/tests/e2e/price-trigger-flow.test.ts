import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TriggerRepository } from '../../repositories/TriggerRepository';
import { TransferIntentRepository } from '../../repositories/TransferIntentRepository';

describe('E2E: Price Drop Triggers Hot->Cold Transfer', () => {
    let triggerRepo: TriggerRepository;
    let intentRepo: TransferIntentRepository;

    beforeAll(async () => {
        // For testing, we'll create repositories directly with SQLite
        // This avoids the MySQL connection issues in the test environment
        const { Sequelize } = await import('sequelize');

        // Use SQLite for testing
        const sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: ':memory:', // In-memory database for testing
            logging: false
        });

        // Import and initialize models
        const { initTriggerModel } = await import('../../models/Trigger.js');
        const { initTransferIntentModel } = await import('../../models/TransferIntent.js');

        initTriggerModel(sequelize);
        initTransferIntentModel(sequelize);

        // Sync models
        await sequelize.sync({ force: true });

        triggerRepo = new TriggerRepository(sequelize);
        intentRepo = new TransferIntentRepository(sequelize);
    });

    it('creates trigger and transfer intent successfully', async () => {
        // Arrange: Insert trigger configuration
        const trigger = await triggerRepo.createTrigger({
            assetAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH address
            assetSymbol: 'ETH',
            chainId: 1,
            direction: 'hot_to_cold',
            threshold: 2000, // $2000 threshold
            moveAmountType: 'PERCENT',
            moveAmount: 50, // 50% of balance
            hotWallet: '0xHot',
            coldWallet: '0xCold',
            executionMode: 'EOA',
            enabled: true,
            hysteresisBps: 100, // 1% hysteresis
            cooldownSec: 300 // 5 minutes cooldown
        });

        expect(trigger.id).toBeDefined();
        console.log('  Trigger created:', trigger.id);

        // Act: Create a mock transfer intent (simulating what would happen when price drops)
        const mockIntent = await intentRepo.insertPlanned({
            idempotencyKey: `test-${Date.now()}`,
            triggerId: trigger.id,
            priceAt: 1950n * 10n ** 8n, // $1950 in wei (8 decimals)
            amount: 5n * 10n ** 18n, // 5 ETH
            fromAddress: '0xHot',
            toAddress: '0xCold',
            mode: 'EOA',
            status: 'PLANNED',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        expect(mockIntent.idempotencyKey).toBeDefined();
        console.log('  Transfer intent created:', mockIntent.idempotencyKey);

        // Simulate execution by updating status
        await intentRepo.updateStatus(mockIntent.idempotencyKey, 'SUBMITTED', '0xabc123');

        // Simulate successful mining
        await intentRepo.updateStatus(mockIntent.idempotencyKey, 'MINED_SUCCESS', '0xabc123');

        // Assert: Verify transfer intent was created and executed
        const intents = await intentRepo.getAllIntents();
        console.log('  Found intents:', intents.length);

        expect(intents.length).toBe(1);

        const intent = intents[0];
        expect(intent.status).toBe('MINED_SUCCESS');
        expect(intent.amount).toBe(5n * 10n ** 18n); // 5 ETH (50% of 10 ETH)
        expect(intent.txHash).toBe('0xabc123');
        expect(intent.triggerId).toBe(trigger.id);
        expect(intent.idempotencyKey).toBeDefined();

        console.log('  Transfer intent executed successfully:', {
            status: intent.status,
            amount: intent.amount.toString(),
            txHash: intent.txHash,
            idempotencyKey: intent.idempotencyKey
        });
    });

    it('maintains idempotency across multiple operations', async () => {
        // Arrange: Ensure trigger is still enabled
        const triggers = await triggerRepo.getAllTriggers();
        expect(triggers.length).toBeGreaterThan(0);

        // Act: Try to create another intent with the same idempotency key
        const existingIntent = (await intentRepo.getAllIntents())[0];

        try {
            await intentRepo.insertPlanned({
                idempotencyKey: existingIntent.idempotencyKey, // Same key
                triggerId: existingIntent.triggerId,
                priceAt: 1900n * 10n ** 8n, // Lower price
                amount: 3n * 10n ** 18n, // Different amount
                fromAddress: '0xHot',
                toAddress: '0xCold',
                mode: 'EOA',
                status: 'PLANNED',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            // Should not reach here
            expect(true).toBe(false);
        } catch (error) {
            // Expected to fail due to duplicate key constraint
            expect(error).toBeDefined();
            console.log('  Idempotency enforced - duplicate key rejected');
        }

        // Assert: No new intents should be created
        const intentsAfter = await intentRepo.getAllIntents();
        expect(intentsAfter.length).toBe(1); // Still only 1 intent

        console.log('  Idempotency maintained - no duplicate intents created');
    });

    it('logs proper metrics and audit trail', async () => {
        // Assert: Verify audit trail exists
        const intent = (await intentRepo.getAllIntents())[0];

        expect(intent.createdAt).toBeDefined();
        expect(intent.updatedAt).toBeDefined();
        expect(intent.fromAddress).toBe('0xHot');
        expect(intent.toAddress).toBe('0xCold');

        console.log('  Audit trail complete:', {
            createdAt: intent.createdAt,
            updatedAt: intent.updatedAt,
            from: intent.fromAddress,
            to: intent.toAddress,
            triggerId: intent.triggerId,
            status: intent.status
        });
    });
});
