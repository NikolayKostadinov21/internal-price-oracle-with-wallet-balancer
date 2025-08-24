import { WalletBalancer } from '../index';
import { ConsolidatedPriceMsg } from '../types';

/**
 * Example: Integrating Wallet Balancer with Price Oracle
 * 
 * This example shows how to:
 * 1. Start the wallet balancer service
 * 2. Create price triggers
 * 3. Process price messages from the oracle
 * 4. Monitor transfer execution
 */

async function integrationExample() {
    console.log('🚀 Wallet Balancer Integration Example\n');

    const walletBalancer = new WalletBalancer();

    try {
        // 1. Start the wallet balancer service
        console.log('1️⃣ Starting wallet balancer service...');
        await walletBalancer.start();
        console.log('✅ Service started successfully\n');

        const service = walletBalancer.getService();
        if (!service) {
            throw new Error('Service not available');
        }

        // 2. Set up event listeners for monitoring
        service.on('transferError', ({ signal, error }) => {
            console.log(`❌ Transfer error for trigger ${signal.triggerId}:`, error.message);
        });

        // 3. Example: Process a price message from the oracle
        console.log('2️⃣ Processing example price message...');

        const examplePriceMessage: ConsolidatedPriceMsg = {
            token: '0xA0b86a33E6441b8c4C8C7C4C8C7C4C8C7C4C8C7C', // Example ETH address
            chainId: 1,
            price: BigInt(250000000000), // $2500.00 (8 decimals)
            priceDecimals: 8,
            at: Date.now(),
            mode: 'normal'
        };

        await service.processPriceMessage(examplePriceMessage);
        console.log('✅ Price message processed\n');

        // 4. Example: Manual trigger (for testing)
        console.log('3️⃣ Testing manual trigger...');
        try {
            // This will fail without existing triggers, but demonstrates the flow
            await service.manualTrigger(1);
        } catch (error) {
            console.log('⚠️ Manual trigger failed (expected without setup):', error instanceof Error ? error.message : String(error));
        }
        console.log('✅ Manual trigger test completed\n');

        // 5. Get service status
        console.log('4️⃣ Service status:');
        const status = service.getStatus();
        console.log('📊 Status:', status);
        console.log('✅ Status check completed\n');

        // 6. Stop the service
        console.log('5️⃣ Stopping service...');
        await walletBalancer.stop();
        console.log('✅ Service stopped successfully\n');

        console.log('🎉 Integration example completed successfully!');

    } catch (error) {
        console.error('❌ Integration example failed:', error);

        // Ensure service is stopped on error
        try {
            await walletBalancer.stop();
        } catch (stopError) {
            console.error('Failed to stop service:', stopError);
        }

        throw error;
    }
}

/**
 * Example: Setting up a price trigger
 * 
 * This shows how to create a trigger that moves 20% of ETH to cold storage
 * when the price goes above $2500
 */
async function createExampleTrigger() {
    console.log('🔧 Creating example trigger...');

    // This would typically be done through a management API
    // For now, we'll just show the structure

    const exampleTrigger = {
        assetAddress: '0xA0b86a33E6441b8c4C8C7C4C8C7C4C8C7C4C8C7C',
        assetSymbol: 'ETH',
        chainId: 1,
        threshold: 2500, // $2500 USD
        direction: 'hot_to_cold' as const,
        moveAmountType: 'PERCENT' as const,
        moveAmount: 20, // 20%
        hotWallet: '0xHotWalletAddress...',
        coldWallet: '0xColdWalletAddress...',
        executionMode: 'EOA' as const,
        hysteresisBps: 100, // 1% hysteresis
        cooldownSec: 3600, // 1 hour cooldown
        enabled: true
    };

    console.log('📋 Example trigger configuration:');
    console.log(JSON.stringify(exampleTrigger, null, 2));
    console.log('✅ Example trigger configuration created\n');
}

// Run examples if this file is executed directly
if (require.main === module) {
    (async () => {
        try {
            await createExampleTrigger();
            await integrationExample();
        } catch (error) {
            console.error('Example execution failed:', error);
            process.exit(1);
        }
    })();
}

export { integrationExample, createExampleTrigger };
