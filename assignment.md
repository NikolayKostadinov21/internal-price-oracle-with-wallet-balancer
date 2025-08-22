# Internal Price Oracle with Wallet Balancer

## 1. Overview

Create two **production-ready back-end services** that:

- **Track accurate USD asset prices**
- **Automatically trigger wallet operations** based on price movements

## 2. `price-oracle`

**Description:**  
Streams live USD prices for up to **5 crypto tokens** across multiple chains with diverse liquidity (≥ $100 M to ≤ $1 M).

**Responsibilities:**

1. **Oracle Selection**

   - Research major oracles: Chainlink, Pyth, API3 and etc.
   - Understand mechanisms:
     - **TWAP** (time-weighted average price)
     - **VWAP** (volume-weighted average price)
     - Median, direct publisher, etc.

2. **Token‑Oracle Mapping**

   - Showcase up to **3 different oracle mechanisms** fitting liquidity/attack risk.
   - Implement a fallback mechanism when primary oracle stalls or returns anomalies.

3. **Integration**

   - Use official SDK/API for each chosen oracle.
   - Expose endpoints to **manage token–oracle pairs** (e.g., create/update).

4. **Documentation**
   - Detail token–oracle choices and rationales

## 3. `wallet-balancer`

**Description:**  
Monitors a configurable “trigger asset?€? price and **moves funds between wallets** (hot ↔ cold) when thresholds are breached.

**Responsibilities:**

- Subscribe to `price-oracle` feed
- Auto-trigger moves funds on-chain (hot → cold)
- Hot wallets **may** support multisig (≥ N-of-M) it is up to you.
- Design as idempotent, auditable, retry-safe

## 4. Bonus Features

- **On-chain price feed contract**: Create on-chain price feed. Push or pull price updates on-chain. Select the correct service to do the updates depending on the mechanism. Ownership can be simple role-based.
- **Cold-to-Hot proposal**: Prepare transaction proposals for multisig wallets on price triggers ( API or On-chain ).
- **CI / Infra:** Docker image build, CI workflows, load testing scripts
- **Security:** Secret management (e.g., vault)
- **Observability:** Structured logging, Prometheus/Grafana dashboards

## 5. Stack & Environment

- **Language & Frameworks:** TS/JS, Node.js (v20), Express, Awilix DI, Axios, Sequelize and other packages if needed.
- **Database:** MySQL or PostgreSQL
- **Blockchain:** Forked or live EVM chain using SDK/JSON-RPC (Ethers.js, Viem or similar/ Provider of your choice)
- **Smart Contracts** Solidity/Viper
- **Infrastructure:** Docker Compose setup
- **Testing:** Jest or similar

## 5. What we are looking for

- Use of the proper tools for the proper task
- Clean Code
- High Security
- Code Architecture/Structure
- Database Segregation
- Other Design Principles
