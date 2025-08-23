# internal-price-oracle-with-wallet-balancer

Internal Price Oracle with Wallet Balancer

# Oracle Aggregator Formulas

---

## Median

$$
\text{median}(P) =
\begin{cases}
p_{\frac{n+1}{2}}, & n \text{ odd} \\
\frac{p_{\frac{n}{2}} + p_{\frac{n}{2}+1}}{2}, & n \text{ even}
\end{cases}
$$

---

## Basis Points Deviation

$$
\text{bps}(p_i) = \frac{|p_i - m|}{m} \times 10{,}000
$$

---

## Harmonic Mean Liquidity (HMLiq)

$$
\text{HMLiq} = \frac{W \cdot 2^{128}}{\text{spl}_t - \text{spl}_{t-W}}
$$

---

## Consolidated Price Decision Rule

$$
\text{ConsolidatedPrice}(C) =
\begin{cases}
\text{LastGood}, & |V| = 0 \quad (\text{frozen}) \\
V_1, & |V| = 1 \quad (\text{degraded}) \\
\text{median}(V), & |V| \geq 2 \quad (\text{normal})
\end{cases}
$$
