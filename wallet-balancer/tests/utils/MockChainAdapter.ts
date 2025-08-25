export interface TestMocks {
    getBalance?: () => Promise<bigint>;
    sendNative?: () => Promise<string>;
    waitForReceipt?: () => Promise<{ success: boolean; blockNumber: number }>;
}

/**
 * Mock Chain Adapter for testing blockchain interactions
 */
export class MockChainAdapter {
    private mocks: TestMocks;

    constructor(mocks: TestMocks) {
        this.mocks = mocks;
    }

    async getBalance(address: string, token: string): Promise<bigint> {
        if (this.mocks.getBalance) {
            return await this.mocks.getBalance();
        }
        return 10n * 10n ** 18n; // Default: 10 ETH
    }

    async sendNative(to: string, amount: bigint): Promise<string> {
        if (this.mocks.sendNative) {
            return await this.mocks.sendNative();
        }
        return '0xmock_tx_hash';
    }

    async waitForReceipt(txHash: string): Promise<{ success: boolean; blockNumber: number }> {
        if (this.mocks.waitForReceipt) {
            return await this.mocks.waitForReceipt();
        }
        return { success: true, blockNumber: 12345 };
    }

    // Additional methods for comprehensive testing
    async estimateGas(to: string, amount: bigint): Promise<bigint> {
        return 21000n; // Standard ETH transfer gas
    }

    async getGasPrice(): Promise<bigint> {
        return 20n * 10n ** 9n; // 20 gwei
    }

    async getNonce(address: string): Promise<number> {
        return 0; // Mock nonce
    }
}
