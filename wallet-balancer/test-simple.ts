import { WalletBalancer } from './index';

async function testBasicFunctionality() {
    console.log('🧪 Testing Wallet Balancer Basic Functionality...\n');

    const walletBalancer = new WalletBalancer();

    try {
        // Start the wallet balancer
        console.log('1️⃣ Starting wallet balancer...');
        await walletBalancer.start();
        console.log('✅ Wallet balancer started successfully\n');

        // Get service instance
        const service = walletBalancer.getService();
        if (!service) {
            throw new Error('Service not available');
        }

        // Test status
        console.log('2️⃣ Checking service status...');
        const status = service.getStatus();
        console.log('📊 Service Status:', status);
        console.log('✅ Status check completed\n');

        // Stop the service
        console.log('3️⃣ Stopping service...');
        await walletBalancer.stop();
        console.log('✅ Service stopped successfully\n');

        console.log('🎉 Basic functionality test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);

        // Ensure service is stopped on error
        try {
            await walletBalancer.stop();
        } catch (stopError) {
            console.error('Failed to stop service:', stopError);
        }

        throw error;
    }
}

// Run the test
if (require.main === module) {
    testBasicFunctionality()
        .then(() => {
            console.log('✅ All tests passed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Tests failed:', error);
            process.exit(1);
        });
}

export { testBasicFunctionality };

