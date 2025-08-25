# Price Oracle Service

A production-ready service that provides accurate USD asset prices for cryptocurrency tokens using multiple oracle mechanisms with fallback capabilities.

## Overview

The Price Oracle Service aggregates price data from multiple sources to ensure reliability and accuracy. It implements a sophisticated fallback mechanism and supports real-time price streaming for production environments.

## Architecture

### Oracle Mechanisms

1. **Chainlink** - Centralized consensus-based oracle

   - Mechanism: Median price aggregation from multiple nodes
   - Use case: High-liquidity assets with established price feeds
   - Fallback: Primary oracle for major tokens

2. **Pyth Network** - Off-chain publisher network

   - Mechanism: Publisher consensus with on-chain verification
   - Use case: Real-time price updates with low latency
   - Fallback: Secondary oracle for rapid price changes

3. **Uniswap V3 TWAP** - On-chain DEX time-weighted average
   - Mechanism: Time-weighted average price from DEX liquidity
   - Use case: Decentralized price validation
   - Fallback: Tertiary oracle for price verification

### Price Aggregation Strategy

- **Primary**: Median calculation across all available sources
- **Fallback**: Degraded mode using available sources
- **Frozen**: Emergency mode when all sources fail

## Features

- Real-time price streaming via Server-Sent Events (SSE)
- Automatic fallback mechanism for oracle failures
- Redis caching for performance optimization
- Comprehensive health monitoring
- Production-ready error handling and logging

## API Endpoints

### Health Check

```
GET /health
```

Returns service status and uptime information.

### Price Query

```
GET /price/:token
```

Returns consolidated price data for the specified token.

**Response Format:**

```json
{
  "success": true,
  "data": {
    "source": "chainlink",
    "price": "4734265837000000000000",
    "priceDecimals": 18,
    "mode": "normal",
    "sourcesUsed": [
      {
        "source": "chainlink",
        "price": "4734265837000000000000",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

## Configuration

### Environment Variables

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=oracle_user
DB_PASSWORD=secure_password
DB_NAME=price_oracle

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Oracle API Keys
CHAINLINK_API_KEY=your_chainlink_key
PYTH_API_KEY=your_pyth_key

# Service Configuration
PORT=3000
NODE_ENV=production
```

### Token Configuration

Tokens are configured through the database with the following structure:

- **Asset Address**: Address of the token
- **Asset Symbol**: Human-readable symbol (e.g., ETH, BTC)
- **Chain ID**: Network identifier
- **Oracle Sources**: Priority-ordered list of oracle sources
- **Fallback Thresholds**: Price deviation limits for fallback triggers

## Deployment

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f price-oracle

# Stop services
docker-compose down
```

### Manual Deployment

```bash
# Install dependencies
yarn install

# Build the application
yarn build

# Start the service
yarn start
```

## Database Schema

### TokenConfig Table

```sql
CREATE TABLE TokenConfig (
  id INT PRIMARY KEY AUTO_INCREMENT,
  assetAddress VARCHAR(42) NOT NULL,
  assetSymbol VARCHAR(10) NOT NULL,
  chainId INT NOT NULL,
  oracleSources JSON NOT NULL,
  fallbackThresholds JSON,
  enabled BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### LastGoodStore Table

```sql
CREATE TABLE LastGoodStore (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tokenAddress VARCHAR(42) NOT NULL,
  lastGoodPrice VARCHAR(50) NOT NULL,
  lastGoodTimestamp TIMESTAMP NOT NULL,
  source VARCHAR(50) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Performance

- **Latency**: < 100ms for price queries
- **Throughput**: 1000+ requests per second
- **Cache Hit Rate**: > 95% for frequently accessed tokens
- **Uptime**: 99.9% availability target

## Monitoring

### Health Metrics

- Service uptime and response time
- Oracle source availability
- Cache performance metrics
- Database connection status

### Alerts

- Oracle source failures
- Price deviation anomalies
- Service unavailability
- Database connection issues

## Security

- Input validation and sanitization
- Rate limiting on API endpoints
- Secure database connections
- Environment variable protection
- CORS configuration for production

## Testing

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run specific test suite
yarn test tests/aggregator.integration.test.ts
```

## Troubleshooting

### Common Issues

1. **Oracle Source Failures**

   - Check API key validity
   - Verify network connectivity
   - Review rate limiting

2. **Database Connection Issues**

   - Verify database credentials
   - Check network connectivity
   - Review connection pool settings

3. **Cache Performance Issues**
   - Monitor Redis memory usage
   - Review cache expiration policies
   - Check Redis connection stability

## Development

### Local Development Setup

```bash
# Clone repository
git clone <repository-url>
cd price-oracle

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
yarn dev
```

### Code Structure

```
src/
├── app.ts               # Express application setup
├── index.ts             # Service entry point
├── config/              # Configuration management
├── models/              # Database models
├── services/            # Business logic
│   ├── cache/           # Redis caching
│   └── oracle/          # Oracle integrations
└── types/               # TypeScript type definitions
```

## Dependencies

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL/PostgreSQL with Sequelize ORM
- **Cache**: Redis
- **Testing**: Vitest
- **Build**: TypeScript
