export type Direction = 'hot_to_cold' | 'cold_to_hot';

export type ExecutionMode = 'EOA' | 'SAFE_PROPOSE' | 'SAFE_EXECUTE';

export type TransferIntentStatus = 'PLANNED' | 'PROPOSED' | 'SUBMITTED' | 'MINED_SUCCESS' | 'MINED_FAILED';

export interface Trigger {
    id: number;
    assetAddress: string;
    assetSymbol: string;
    chainId: number;
    threshold: number; // Price threshold in USD
    direction: Direction;
    moveAmountType: 'ABSOLUTE' | 'PERCENT';
    moveAmount: number; // Absolute amount or percentage
    hotWallet: string;
    coldWallet: string;
    executionMode: ExecutionMode;
    hysteresisBps: number; // Hysteresis in basis points
    cooldownSec: number; // Minimum time between triggers
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type TriggerCreationAttributes = Omit<Trigger, 'id' | 'createdAt' | 'updatedAt'>;

export interface TransferIntentPlan {
    idempotencyKey: string;
    triggerId: number;
    priceAt: bigint; // Price when trigger fired
    amount: bigint; // Scaled amount to transfer
    fromAddress: string;
    toAddress: string;
    mode: ExecutionMode;
    status: TransferIntentStatus;
    safeTxHash?: string; // For Safe transactions
    txHash?: string; // For EOA transactions
    createdAt: Date;
    updatedAt: Date;
}

export interface ConsolidatedPriceMsg {
    token: string;
    chainId: number;
    price: bigint;
    priceDecimals: number;
    at: number;
    mode: 'normal' | 'degraded' | 'frozen';
}

export interface TriggerSignal {
    triggerId: number;
    price: bigint;
    priceDecimals: number;
    direction: Direction;
    amount: bigint;
    executionMode: ExecutionMode;
    timestamp: number;
}
