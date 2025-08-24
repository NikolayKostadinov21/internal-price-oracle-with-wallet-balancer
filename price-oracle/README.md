# Nexo Oracle Aggregator

## 1. Purpose & Scope

The **Nexo Oracle Aggregator** produces a single, robust **USD price per token** by combining multiple oracle mechanisms:

- Chainlink
- Pyth
- Uniswap v3 TWAP
- API3

It:

- Queries all configured sources for a token.
- Validates each source (freshness, confidence, liquidity, pool allowlist).
- Aggregates valid values (median) with deterministic **modes**:
  - `normal` (≥2 valid),
  - `degraded` (1 valid),
  - `frozen` (0 valid → last-good).
- Persists the result as the new **last-good** price.
- Emits metadata for **auditability**.

This file does **not** run timers; it orchestrates adapters + config repositories.

---

## 2. Key Types

- **`PriceData`**: single-source reading (price `bigint`, `priceDecimals`, `at`, `source`, `meta?`).
- **`ConsolidatedPrice`**: final output with `source: 'nexo'`, `mode`, `sourcesUsed[]`.
- **`TokenConfig`**: per-token thresholds & TWAP settings.
- **`LastGoodStore`**: persistence interface.
- **`OracleSource`**: `'chainlink' | 'pyth' | 'uniswap_v3_twap' | 'api3' | 'nexo'`.

---

## 3. Flow

1. Load `TokenConfig`.
2. Gather candidates from adapters.
3. Validate (TTL per source, Pyth confidence, TWAP guards).
4. Aggregate:
   - 0 valid → **last-good**, mode = `frozen`.
   - 1 valid → **that one**, mode = `degraded`.
   - ≥2 valid → **median**, mode = `normal`.
5. Check divergence (bps vs median) → log only.
6. Persist consolidated to `LastGoodStore`.

## 4. Core Algorithms

### Median

$$
\text{median}(P) =
\begin{cases}
p_{\frac{n+1}{2}}, & n \text{ odd} \\
\frac{p_{\frac{n}{2}} + p_{\frac{n}{2}+1}}{2}, & n \text{ even}
\end{cases}
$$

---

### Basis Points Deviation

$$
\text{bps}(p_i) = \frac{|p_i - m|}{m} \times 10{,}000
$$

---

### Harmonic Mean Liquidity (HMLiq)

$$
\text{HMLiq} = \frac{W \cdot 2^{128}}{\text{spl}_t - \text{spl}_{t-W}}
$$

---

### Consolidated Price Decision Rule

$$
\text{ConsolidatedPrice}(C) =
\begin{cases}
\text{LastGood}, & |V| = 0 \quad (\text{frozen}) \\
V_1, & |V| = 1 \quad (\text{degraded}) \\
\text{median}(V), & |V| \geq 2 \quad (\text{normal})
\end{cases}
$$

---

## 5. Public Method

### `getConsolidatedPrice(token: string): Promise<ConsolidatedPrice>`

- **Input:** token identifier.
- **Output:** `ConsolidatedPrice` (`source: 'nexo'`, `mode`, `sourcesUsed[]`).
- **Side effects:** queries adapters, validates, aggregates, persists.

---

## 6. Internal Helpers

- **`gatherOraclePrices`** → calls Chainlink, Pyth, Uniswap v3 TWAP (first valid pool), API3.
- **`isValid`** → TTL, confidence (Pyth), TWAP liquidity/window/pool allowlist.
- **`checkDivergence`** → logs bps deviation; no rejection.
- **`medianPrice`** → rescale to 18 decimals, compute median.
- **`rescale`** → exact integer scaling via `10^(diff)`.

---

## 7. Modes

- **`normal`**: ≥2 valid → median.
- **`degraded`**: exactly 1 valid.
- **`frozen`**: 0 valid → last-good.

---

## 8. Adapter Contract

Each adapter must return:

```ts
interface PriceData {
  source: "chainlink" | "pyth" | "uniswap_v3_twap" | "api3";
  price: bigint;
  priceDecimals: number;
  at: number; // epoch seconds
  meta?: Record<string, unknown>;
}
```
