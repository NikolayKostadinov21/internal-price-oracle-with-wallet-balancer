import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TriggerEvaluator } from '../core/TriggerEvaluator';
import { TransferIntentRepository } from '../repositories/TransferIntentRepository';
import { Trigger, ConsolidatedPriceMsg, TriggerSignal } from '../types';

// Mock the repository
const mockTransferIntentRepo = {
    getIntentsByStatus: vi.fn(),
} as unknown as TransferIntentRepository;

describe('TriggerEvaluator', () => {
    let evaluator: TriggerEvaluator;
    let mockTrigger: Trigger;
    let mockPriceMsg: ConsolidatedPriceMsg;

    beforeEach(() => {
        evaluator = new TriggerEvaluator(mockTransferIntentRepo);

        // Set up default mock behavior
        vi.mocked(mockTransferIntentRepo.getIntentsByStatus).mockResolvedValue([]);

        mockTrigger = {
            id: 1,
            assetAddress: '0x1234567890123456789012345678901234567890',
            assetSymbol: 'ETH',
            chainId: 1,
            threshold: 2000, // $2000 USD
            direction: 'hot_to_cold',
            moveAmountType: 'PERCENT',
            moveAmount: 20, // 20%
            hotWallet: '0xHotWalletAddress...',
            coldWallet: '0xColdWalletAddress...',
            executionMode: 'EOA',
            hysteresisBps: 100, // 1% hysteresis
            cooldownSec: 3600, // 1 hour
            enabled: true,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
        };

        mockPriceMsg = {
            token: '0x1234567890123456789012345678901234567890',
            chainId: 1,
            price: BigInt(250000000000), // $2500.00 (8 decimals)
            priceDecimals: 8,
            at: Date.now(),
            mode: 'normal',
        };

        vi.clearAllMocks();
    });

    describe('evaluateTrigger', () => {
        it('should return null for disabled triggers', async () => {
            mockTrigger.enabled = false;

            const result = await evaluator.evaluateTrigger(mockTrigger, mockPriceMsg, 1000000000000000000n);

            expect(result).toBeNull();
        });

        it('should return null when cooldown period is active', async () => {
            const mockIntents = [
                {
                    triggerId: 1,
                    status: 'MINED_SUCCESS',
                    createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
                },
            ];

            vi.mocked(mockTransferIntentRepo.getIntentsByStatus).mockResolvedValue(mockIntents as any);

            const result = await evaluator.evaluateTrigger(mockTrigger, mockPriceMsg, 1000000000000000000n);

            expect(result).toBeNull();
        });

        it('should return null when price threshold is not met', async () => {
            // Price is $2500, threshold is $2000, but hysteresis prevents trigger
            // Hysteresis is 1% = $20, so trigger fires at $2020+
            mockPriceMsg.price = BigInt(199000000000); // $1990.00

            const result = await evaluator.evaluateTrigger(mockTrigger, mockPriceMsg, 1000000000000000000n);

            expect(result).toBeNull();
        });

        it('should return null when insufficient balance', async () => {
            mockTrigger.moveAmountType = 'ABSOLUTE';
            mockTrigger.moveAmount = 0.5; // 0.5 ETH
            const lowBalance = 100000000000000000n; // 0.1 ETH (insufficient for 0.5 ETH)

            const result = await evaluator.evaluateTrigger(mockTrigger, mockPriceMsg, lowBalance);

            expect(result).toBeNull();
        });

        it('should return trigger signal when all conditions are met', async () => {
            // Price is $2500, threshold is $2000, should trigger
            mockPriceMsg.price = BigInt(250000000000); // $2500.00

            const result = await evaluator.evaluateTrigger(mockTrigger, mockPriceMsg, 1000000000000000000n);

            expect(result).not.toBeNull();
            expect(result).toMatchObject({
                triggerId: 1,
                direction: 'hot_to_cold',
                executionMode: 'EOA',
                timestamp: mockPriceMsg.at,
            });
        });

        it('should handle cold_to_hot direction correctly', async () => {
            mockTrigger.direction = 'cold_to_hot';
            mockTrigger.threshold = 3000; // $3000 USD
            mockPriceMsg.price = BigInt(290000000000); // $2900.00 (below threshold)

            const result = await evaluator.evaluateTrigger(mockTrigger, mockPriceMsg, 1000000000000000000n);

            expect(result).not.toBeNull();
            expect(result?.direction).toBe('cold_to_hot');
        });

        it('should calculate absolute amounts correctly', async () => {
            mockTrigger.moveAmountType = 'ABSOLUTE';
            mockTrigger.moveAmount = 0.5; // 0.5 ETH

            const result = await evaluator.evaluateTrigger(mockTrigger, mockPriceMsg, 1000000000000000000n);

            expect(result).not.toBeNull();
            expect(result?.amount).toBe(BigInt(500000000000000000)); // 0.5 ETH in wei
        });

        it('should calculate percentage amounts correctly', async () => {
            mockTrigger.moveAmountType = 'PERCENT';
            mockTrigger.moveAmount = 25; // 25%
            const balance = 1000000000000000000n; // 1 ETH

            const result = await evaluator.evaluateTrigger(mockTrigger, mockPriceMsg, balance);

            expect(result).not.toBeNull();
            expect(result?.amount).toBe(BigInt(250000000000000000)); // 25% of 1 ETH
        });
    });

    describe('evaluateTriggers', () => {
        it('should evaluate multiple triggers and return all signals', async () => {
            const triggers = [
                { ...mockTrigger, id: 1, threshold: 2000 },
                { ...mockTrigger, id: 2, threshold: 3000 },
            ];

            mockPriceMsg.price = BigInt(350000000000); // $3500.00 (above both thresholds)

            const results = await evaluator.evaluateTriggers(triggers, mockPriceMsg, 1000000000000000000n);

            expect(results).toHaveLength(2);
            expect(results[0].triggerId).toBe(1);
            expect(results[1].triggerId).toBe(2);
        });

        it('should filter out triggers that do not fire', async () => {
            const triggers = [
                { ...mockTrigger, id: 1, threshold: 2000 },
                { ...mockTrigger, id: 2, threshold: 3000, enabled: false },
                { ...mockTrigger, id: 3, threshold: 4000 },
            ];

            mockPriceMsg.price = BigInt(250000000000); // $2500.00 (only triggers 1)

            const results = await evaluator.evaluateTriggers(triggers, mockPriceMsg, 1000000000000000000n);

            expect(results).toHaveLength(1);
            expect(results[0].triggerId).toBe(1);
        });
    });

    describe('error handling', () => {
        it('should handle repository errors gracefully', async () => {
            vi.mocked(mockTransferIntentRepo.getIntentsByStatus).mockRejectedValue(new Error('Database error'));

            const result = await evaluator.evaluateTrigger(mockTrigger, mockPriceMsg, 1000000000000000000n);

            expect(result).toBeNull();
        });

        it('should handle invalid price data gracefully', async () => {
            mockPriceMsg.price = BigInt(0);
            mockPriceMsg.priceDecimals = 0;

            const result = await evaluator.evaluateTrigger(mockTrigger, mockPriceMsg, 1000000000000000000n);

            expect(result).toBeNull();
        });
    });
});
