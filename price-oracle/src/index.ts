import { config } from 'dotenv';
import { createContainer } from './services/container';
import { createApp } from './app';

// Load environment variables
config();

async function main() {
    try {
        // Create dependency injection container
        const container = await createContainer();

        // Create Express app
        const app = createApp(container);

        // Get port from environment or use default
        const port = process.env.PORT || 3000;

        // Start server
        app.listen(port, () => {
            console.log(`Price Oracle service started on port ${port}`);
            console.log(`Health check: http://localhost:${port}/health`);
            console.log(`Price endpoint: http://localhost:${port}/price/:token`);
        });
    } catch (error) {
        console.error('Failed to start Price Oracle service:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

// Start the application
main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
