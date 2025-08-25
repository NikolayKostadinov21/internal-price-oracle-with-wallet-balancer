# Wallet Balancer Service

A production-ready service that automatically triggers wallet operations based on price movements, implementing sophisticated trigger evaluation and execution logic for secure fund management.

## Overview

The Wallet Balancer Service monitors cryptocurrency prices and automatically executes fund movements between hot and cold wallets when predefined thresholds are breached. It provides idempotent, auditable, and retry-safe operations for production environments.

## Architecture

### Core Components

1. **Trigger Evaluator** - Monitors price movements and evaluates trigger conditions
2. **Execution Engine** - Handles on-chain transactions and wallet operations
3. **Repository Layer** - Manages triggers and transfer intents with persistence
4. **Service Layer** - Orchestrates the complete workflow

### Trigger Logic

- **Price Thresholds**: Configurable USD price levels for hot-to-cold and cold-to-hot movements
- **Hysteresis**: Prevents rapid back-and-forth movements
- **Cooldown Periods**: Enforces minimum time between executions
- **Amount Types**: Absolute amounts or percentage-based movements

### Execution Modes

1. **EOA (Externally Owned Account)** - Direct wallet transfers
2. **Safe Propose** - Multisig wallet proposal creation
3. **Safe Execute** - Multisig wallet execution (future enhancement)

## Features

- Real-time price monitoring via price-oracle integration
- Configurable trigger thresholds and execution parameters
- Idempotent operations with unique idempotency keys
- Comprehensive audit trail and logging
- Production-ready error handling and retry mechanisms
- Support for multiple blockchain networks

## Configuration

### Environment Variables

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=balancer_user
DB_PASSWORD=secure_password
DB_NAME=wallet_balancer

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Price Oracle Integration
PRICE_ORACLE_URL=http://localhost:3000

# Blockchain Configuration
CHAIN_ID=1
RPC_URL=https://mainnet.infura.io/v3/your_project_id

# Wallet Configuration
HOT_WALLET_PRIVATE_KEY=your_private_key
COLD_WALLET_ADDRESS=0x...
SAFE_WALLET_ADDRESS=0x... # For multisig operations

# Service Configuration
PORT=3001
NODE_ENV=production
```

### Trigger Configuration

Triggers are configured through the database with the following parameters:

- **Asset Address**: Token contract address
- **Asset Symbol**: Human-readable symbol (e.g., ETH, BTC)
- **Chain ID**: Network identifier
- **Threshold**: USD price level that triggers movement
- **Direction**: hot_to_cold or cold_to_hot
- **Move Amount Type**: ABSOLUTE or PERCENT
- **Move Amount**: Amount to move (in wei or percentage)
- **Hysteresis BPS**: Basis points for hysteresis calculation
- **Cooldown Seconds**: Minimum time between executions
- **Execution Mode**: EOA, SAFE_PROPOSE, or SAFE_EXECUTE

## API Endpoints

### Health Check

```
GET /health
```

Returns service status and uptime information.

### Trigger Management

```
POST /triggers
```

Creates a new price trigger.

**Request Body:**

```json
{
  "assetAddress": "0x...",
  "assetSymbol": "ETH",
  "chainId": 1,
  "threshold": 2000,
  "direction": "hot_to_cold",
  "moveAmountType": "PERCENT",
  "moveAmount": 10,
  "hysteresisBps": 100,
  "cooldownSec": 3600,
  "executionMode": "EOA"
}
```

### Transfer Intent Status

```
GET /intents/:id
```

Returns the status of a transfer intent.

## Database Schema

### Trigger Table

```sql
CREATE TABLE Trigger (
  id INT PRIMARY KEY AUTO_INCREMENT,
  assetAddress VARCHAR(42) NOT NULL,
  assetSymbol VARCHAR(10) NOT NULL,
  chainId INT NOT NULL,
  threshold DECIMAL(20,2) NOT NULL,
  direction ENUM('hot_to_cold', 'cold_to_hot') NOT NULL,
  moveAmountType ENUM('ABSOLUTE', 'PERCENT') NOT NULL,
  moveAmount DECIMAL(20,8) NOT NULL,
  hysteresisBps INT DEFAULT 100,
  cooldownSec INT DEFAULT 3600,
  hotWallet VARCHAR(42) NOT NULL,
  coldWallet VARCHAR(42) NOT NULL,
  executionMode ENUM('EOA', 'SAFE_PROPOSE', 'SAFE_EXECUTE') DEFAULT 'EOA',
  enabled BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### TransferIntent Table

```sql
CREATE TABLE TransferIntent (
  id INT PRIMARY KEY AUTO_INCREMENT,
  idempotencyKey VARCHAR(255) UNIQUE NOT NULL,
  triggerId INT NOT NULL,
  priceAt BIGINT NOT NULL,
  amount VARCHAR(50) NOT NULL,
  fromAddress VARCHAR(42) NOT NULL,
  toAddress VARCHAR(42) NOT NULL,
  mode ENUM('EOA', 'SAFE_PROPOSE', 'SAFE_EXECUTE') NOT NULL,
  status ENUM('PLANNED', 'PROPOSED', 'SUBMITTED', 'MINED_SUCCESS', 'MINED_FAILED') DEFAULT 'PLANNED',
  transactionHash VARCHAR(66),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (triggerId) REFERENCES Trigger(id)
);
```

## Mathematical Formulas

### Hysteresis Calculation

```
Hysteresis Range = Threshold ± (Threshold × Hysteresis BPS / 10,000)
```

**Example:**

- Threshold: $2000
- Hysteresis BPS: 100 (1%)
- Hysteresis Range: $1980 - $2020

### Percentage Amount Calculation

```
Move Amount = Balance × (Move Amount Percentage / 100)
```

### Cooldown Enforcement

```
Time Since Last Execution = Current Time - Last Execution Time
Can Execute = Time Since Last Execution >= Cooldown Seconds
```

## Deployment

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f wallet-balancer

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

## Performance

- **Trigger Evaluation**: < 50ms response time
- **Execution Latency**: < 5 seconds for EOA operations
- **Throughput**: 100+ trigger evaluations per second
- **Database Operations**: < 10ms for CRUD operations
- **Uptime**: 99.9% availability target

## Monitoring

### Health Metrics

- Service uptime and response time
- Trigger evaluation frequency
- Execution success rates
- Database connection status
- Price oracle integration health

### Alerts

- Trigger evaluation failures
- Execution engine errors
- Database connection issues
- Price oracle integration failures
- Wallet balance anomalies

## Security

- Private key management and encryption
- Input validation and sanitization
- Rate limiting on API endpoints
- Secure database connections
- Environment variable protection
- Idempotency key validation

## Testing

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run E2E tests
yarn test tests/e2e/real-e2e.test.ts
```

## Troubleshooting

### Common Issues

1. **Trigger Evaluation Failures**

   - Check price oracle connectivity
   - Verify trigger configuration
   - Review database connections

2. **Execution Engine Errors**

   - Verify wallet private keys
   - Check RPC connectivity
   - Review gas estimation

3. **Database Connection Issues**
   - Verify database credentials
   - Check network connectivity
   - Review connection pool settings

## Development

### Local Development Setup

```bash
# Clone repository
git clone <repository-url>
cd wallet-balancer

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
├── index.ts              # Service entry point
├── config/               # Configuration management
├── core/                 # Core business logic
│   ├── EOAExecutionEngine.ts
│   ├── TriggerEvaluator.ts
│   └── WalletBalancerService.ts
├── models/               # Database models
├── repositories/         # Data access layer
└── types.ts             # TypeScript type definitions
```

## Dependencies

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL/PostgreSQL with Sequelize ORM
- **Cache**: Redis
- **Blockchain**: Ethers.js
- **Testing**: Vitest
- **Build**: TypeScript
