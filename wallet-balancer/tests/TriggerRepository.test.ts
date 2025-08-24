import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TriggerRepository } from '../repositories/TriggerRepository';
import { TriggerModel } from '../models/Trigger';
import { Trigger } from '../types';

// Mock the Sequelize model
vi.mock('../models/Trigger', () => ({
    TriggerModel: {
        create: vi.fn(),
        findByPk: vi.fn(),
        findAll: vi.fn(),
        update: vi.fn(),
        destroy: vi.fn(),
    },
}));

describe('TriggerRepository', () => {
    let repository: TriggerRepository;
    let mockSequelize: any;
    let mockTrigger: Trigger;

    beforeEach(() => {
        mockSequelize = {};
        repository = new TriggerRepository(mockSequelize);

        mockTrigger = {
            id: 1,
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
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
        };

        vi.clearAllMocks();
    });

    describe('createTrigger', () => {
        it('should create a trigger successfully', async () => {
            const mockCreatedTrigger = {
                dataValues: {
                    id: 1,
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
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01'),
                },
            };

            vi.mocked(TriggerModel.create).mockResolvedValue(mockCreatedTrigger as any);

            const result = await repository.createTrigger(mockTrigger);

            expect(TriggerModel.create).toHaveBeenCalledWith({
                assetAddress: mockTrigger.assetAddress,
                assetSymbol: mockTrigger.assetSymbol,
                chainId: mockTrigger.chainId,
                threshold: mockTrigger.threshold,
                direction: mockTrigger.direction,
                moveAmountType: mockTrigger.moveAmountType,
                moveAmount: mockTrigger.moveAmount,
                hotWallet: mockTrigger.hotWallet,
                coldWallet: mockTrigger.coldWallet,
                executionMode: mockTrigger.executionMode,
                hysteresisBps: mockTrigger.hysteresisBps,
                cooldownSec: mockTrigger.cooldownSec,
                enabled: mockTrigger.enabled,
            });

            expect(result).toEqual(mockTrigger);
        });

        it('should handle creation errors', async () => {
            const error = new Error('Database error');
            vi.mocked(TriggerModel.create).mockRejectedValue(error);

            await expect(repository.createTrigger(mockTrigger)).rejects.toThrow('Database error');
        });
    });

    describe('getTriggerById', () => {
        it('should return trigger when found', async () => {
            const mockDbTrigger = {
                dataValues: {
                    id: 1,
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
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01'),
                },
            };

            vi.mocked(TriggerModel.findByPk).mockResolvedValue(mockDbTrigger as any);

            const result = await repository.getTriggerById(1);

            expect(TriggerModel.findByPk).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockTrigger);
        });

        it('should return null when trigger not found', async () => {
            vi.mocked(TriggerModel.findByPk).mockResolvedValue(null);

            const result = await repository.getTriggerById(999);

            expect(result).toBeNull();
        });

        it('should handle errors gracefully', async () => {
            const error = new Error('Database error');
            vi.mocked(TriggerModel.findByPk).mockRejectedValue(error);

            const result = await repository.getTriggerById(1);

            expect(result).toBeNull();
        });
    });

    describe('getAllTriggers', () => {
        it('should return all triggers', async () => {
            const mockDbTriggers = [
                {
                    dataValues: {
                        id: 1,
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
                        createdAt: new Date('2024-01-01'),
                        updatedAt: new Date('2024-01-01'),
                    },
                },
                {
                    dataValues: {
                        id: 2,
                        assetAddress: '0x0987654321098765432109876543210987654321',
                        assetSymbol: 'BTC',
                        chainId: 1,
                        threshold: 50000,
                        direction: 'cold_to_hot',
                        moveAmountType: 'ABSOLUTE',
                        moveAmount: 0.1,
                        hotWallet: '0xHotWalletAddress...',
                        coldWallet: '0xColdWalletAddress...',
                        executionMode: 'SAFE_PROPOSE',
                        hysteresisBps: 200,
                        cooldownSec: 7200,
                        enabled: false,
                        createdAt: new Date('2024-01-02'),
                        updatedAt: new Date('2024-01-02'),
                    },
                },
            ];

            vi.mocked(TriggerModel.findAll).mockResolvedValue(mockDbTriggers as any);

            const result = await repository.getAllTriggers();

            expect(TriggerModel.findAll).toHaveBeenCalledWith();
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(1);
            expect(result[1].id).toBe(2);
        });

        it('should return empty array on error', async () => {
            const error = new Error('Database error');
            vi.mocked(TriggerModel.findAll).mockRejectedValue(error);

            const result = await repository.getAllTriggers();

            expect(result).toEqual([]);
        });
    });

    describe('getEnabledTriggersByTokenChain', () => {
        it('should return enabled triggers for specific token and chain', async () => {
            const mockDbTriggers = [
                {
                    dataValues: {
                        id: 1,
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
                        createdAt: new Date('2024-01-01'),
                        updatedAt: new Date('2024-01-01'),
                    },
                },
            ];

            vi.mocked(TriggerModel.findAll).mockResolvedValue(mockDbTriggers as any);

            const result = await repository.getEnabledTriggersByTokenChain(
                '0x1234567890123456789012345678901234567890',
                1
            );

            expect(TriggerModel.findAll).toHaveBeenCalledWith({
                where: {
                    assetAddress: '0x1234567890123456789012345678901234567890',
                    chainId: 1,
                    enabled: true,
                },
            });

            expect(result).toHaveLength(1);
            expect(result[0].assetAddress).toBe('0x1234567890123456789012345678901234567890');
        });
    });

    describe('updateTrigger', () => {
        it('should update trigger successfully', async () => {
            const updates = { threshold: 2500, enabled: false };
            vi.mocked(TriggerModel.update).mockResolvedValue([1] as any);

            await repository.updateTrigger(1, updates);

            expect(TriggerModel.update).toHaveBeenCalledWith(
                { threshold: 2500, enabled: false },
                { where: { id: 1 } }
            );
        });

        it('should throw error when trigger not found', async () => {
            vi.mocked(TriggerModel.update).mockResolvedValue([0] as any);

            await expect(repository.updateTrigger(999, { threshold: 2500 })).rejects.toThrow(
                'Trigger 999 not found'
            );
        });

        it('should handle update errors', async () => {
            const error = new Error('Database error');
            vi.mocked(TriggerModel.update).mockRejectedValue(error);

            await expect(repository.updateTrigger(1, { threshold: 2500 })).rejects.toThrow('Database error');
        });
    });

    describe('deleteTrigger', () => {
        it('should delete trigger successfully', async () => {
            vi.mocked(TriggerModel.destroy).mockResolvedValue(1 as any);

            await repository.deleteTrigger(1);

            expect(TriggerModel.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
        });

        it('should throw error when trigger not found', async () => {
            vi.mocked(TriggerModel.destroy).mockResolvedValue(0 as any);

            await expect(repository.deleteTrigger(999)).rejects.toThrow('Trigger 999 not found');
        });
    });
});
