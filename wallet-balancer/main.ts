import { WalletBalancer } from './index';

async function main() {
    console.log('[Main] Starting Wallet Balancer Service...');
    
    const walletBalancer = new WalletBalancer();
    
    try {
        // Start the wallet balancer
        await walletBalancer.start();
        
        console.log('[Main] Wallet Balancer Service started successfully');
        
        // Keep the process running
        process.on('SIGINT', async () => {
            console.log('[Main] Received SIGINT, shutting down...');
            await walletBalancer.stop();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            console.log('[Main] Received SIGTERM, shutting down...');
            await walletBalancer.stop();
            process.exit(0);
        });
        
        // Log status every 30 seconds
        setInterval(() => {
            const status = walletBalancer.getStatus();
            console.log('[Main] Service status:', status);
        }, 30000);
        
    } catch (error) {
        console.error('[Main] Failed to start Wallet Balancer Service:', error);
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('[Main] Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Main] Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the service
main().catch((error) => {
    console.error('[Main] Main function failed:', error);
    process.exit(1);
});
