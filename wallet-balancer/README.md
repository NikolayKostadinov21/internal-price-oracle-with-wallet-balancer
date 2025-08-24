# Wallet Balancer Service

A standalone, production-ready wallet balancing service that automatically transfers assets between hot and cold wallets based on price triggers.

## Features

- **Price-Based Triggers**: Automatically execute transfers when asset prices cross configured thresholds
- **Hysteresis Support**: Prevents rapid-fire triggers with configurable hysteresis
- **Cooldown Periods**: Enforce minimum time between transfers
- **Multiple Execution Modes**: Support for EOA and Safe multisig wallets
- **Idempotency**: Prevents duplicate transfers with unique idempotency keys
- **Audit Trail**: Complete tracking of all transfer intents and their status
- **Database Persistence**: SQLite (dev) / PostgreSQL (prod) with Sequelize ORM
- **Event-Driven Architecture**: Built-in event system for monitoring and integration

## Architecture

```
wallet-balancer/
├── config/           # Configuration and database setup
├── models/           # Sequelize database models
├── repositories/     # Data access layer
├── core/            # Core business logic services
├── adapters/        # External service integrations
├── __tests__/       # Comprehensive test suite
├── examples/        # Usage examples and integration patterns
├── types.ts         # TypeScript type definitions
└── index.ts         # Main entry point
```

## Prerequisites

- Node.js 18+
- npm or yarn
- SQLite (development) or PostgreSQL (production)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd wallet-balancer

# Install dependencies
yarn install

# Set up environment variables
cp env.example .env
# Edit .env with your configuration

# Build the project
yarn build
```

## Configuration

Create a `.env` file with the following variables:

```env
# Database
DB_URL=postgresql://user:password@localhost:5432/wallet_balancer
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=wallet_balancer

# Ethereum
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ETHEREUM_CHAIN_ID=1
HOT_WALLET_PRIVATE_KEY=your_private_key_here

# Safe Service (optional)
SAFE_SERVICE_URL=https://safe-transaction.gnosis.io

# Server
PORT=3001
NODE_ENV=development
```

## Usage

### Basic Usage

```typescript
import { WalletBalancer } from "./index";

const walletBalancer = new WalletBalancer();

// Start the service
await walletBalancer.start();

// Get service instance
const service = walletBalancer.getService();

// Process price messages
await service.processPriceMessage({
  token: "0x1234...",
  chainId: 1,
  price: BigInt(250000000000), // $2500.00
  priceDecimals: 8,
  at: Date.now(),
  mode: "normal",
});

// Stop the service
await walletBalancer.stop();
```

### Creating Triggers

```typescript
import { TriggerRepository } from "./repositories/TriggerRepository";

const triggerRepo = new TriggerRepository(sequelize);

const trigger = await triggerRepo.createTrigger({
  assetAddress: "0x1234...",
  assetSymbol: "ETH",
  chainId: 1,
  threshold: 2000, // $2000 USD
  direction: "hot_to_cold",
  moveAmountType: "PERCENT",
  moveAmount: 20, // 20%
  hotWallet: "0xHotWallet...",
  coldWallet: "0xColdWallet...",
  executionMode: "EOA",
  hysteresisBps: 100, // 1% hysteresis
  cooldownSec: 3600, // 1 hour
  enabled: true,
});
```

## Testing

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with UI
yarn test:ui

# Generate coverage report
yarn test:coverage
```

## Database Schema

### Triggers Table

- `id`: Primary key
- `asset_address`: Token contract address
- `asset_symbol`: Token symbol (ETH, BTC, etc.)
- `chain_id`: Ethereum chain ID
- `threshold`: Price threshold in USD
- `direction`: Transfer direction (hot_to_cold, cold_to_hot)
- `move_amount_type`: Amount type (ABSOLUTE, PERCENT)
- `move_amount`: Amount to transfer
- `hot_wallet`: Hot wallet address
- `cold_wallet`: Cold wallet address
- `execution_mode`: Execution mode (EOA, SAFE_PROPOSE, SAFE_EXECUTE)
- `hysteresis_bps`: Hysteresis in basis points
- `cooldown_sec`: Minimum seconds between triggers
- `enabled`: Whether trigger is active

### Transfer Intents Table

- `id`: Primary key
- `idempotency_key`: Unique key to prevent duplicates
- `trigger_id`: Reference to the trigger that fired
- `price_at`: Price when trigger fired
- `amount`: Amount to transfer (BigInt as string)
- `from_address`: Source wallet address
- `to_address`: Destination wallet address
- `mode`: Execution mode
- `status`: Current status (PLANNED, PROPOSED, SUBMITTED, MINED_SUCCESS, MINED_FAILED)
- `safe_tx_hash`: Safe transaction hash (for multisig)
- `tx_hash`: Ethereum transaction hash

## Development

```bash
# Start development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start

# Clean build artifacts
yarn clean
```

## 📈 Monitoring & Events

The service emits events for monitoring:

```typescript
service.on("started", () => console.log("Service started"));
service.on("stopped", () => console.log("Service stopped"));
service.on("error", (error) => console.error("Service error:", error));
service.on("transferError", ({ signal, error }) => {
  console.error(`Transfer error for trigger ${signal.triggerId}:`, error);
});
```

## 🔒 Security Features

- **Idempotency**: Prevents duplicate transfers
- **Hysteresis**: Prevents rapid-fire triggers
- **Cooldown Periods**: Enforces minimum time between transfers
- **Audit Trail**: Complete transfer history
- **Environment-based Configuration**: Secure credential management

## Deployment

### Docker (Recommended)

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY .env ./

EXPOSE 3001
CMD ["npm", "start"]
```

### Manual Deployment

```bash
# Build the project
yarn build

# Set environment variables
export NODE_ENV=production
export DB_URL=your_production_db_url

# Start the service
yarn start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

Internal use only - not for external distribution.

## 🆘 Support

For internal support, contact the development team or create an issue in the repository.
