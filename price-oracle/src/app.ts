import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AwilixContainer } from 'awilix';
import { PriceOracleAggregator } from './services/oracle/aggregator';

export function createApp(container: AwilixContainer) {
    const app = express();

    // Security middleware
    app.use(helmet());

    // CORS configuration
    app.use(cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true
    }));

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check endpoint
    app.get('/health', (req: any, res: any) => {
        res.json({
            status: 'healthy',
            service: 'price-oracle',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    });

    // Price endpoint
    app.get('/price/:token', async (req: any, res: any) => {
        try {
            const { token } = req.params;

            if (!token) {
                return res.status(400).json({ error: 'Token parameter is required' });
            }

            const priceOracle = container.resolve('priceOracleAggregator') as PriceOracleAggregator;
            const price = await priceOracle.getConsolidatedPrice(token);

            res.json({
                success: true,
                data: price
            });
        } catch (error) {
            console.error(`Error fetching price for ${req.params.token}:`, error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch price',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    // 404 handler - simplified
    app.use((req: any, res: any) => {
        res.status(404).json({
            error: 'Endpoint not found',
            availableEndpoints: [
                'GET /health',
                'GET /price/:token'
            ]
        });
    });

    // Global error handler
    app.use((error: any, req: any, res: any, next: any) => {
        console.error('Unhandled error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    });

    return app;
}
