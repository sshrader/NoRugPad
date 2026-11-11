# Nested's Meteora DBC config (saved for reuse)

Source: config account `HDYnoXJEpuYNduHJAgTmdoKKyqXR5aotsaUEc5un6NFq` on mainnet (created by wallet
`E8aeH8DNcKXGDWHDvauPD81KXQvgnkUPvcKyxdL1a934`, create_config tx
`2z8daMmuityumyqFH5vuJjLMB86dqpJpjJjV5NjppUGvRFUCYj6QZVaX5jzd3QHGdSJafGDptdpzM8i1NumiLvqq`, 2026-11-11 00:34 UTC).
Read with `npm run dbc-check-pool -- HDYnoXJEpuYNduHJAgTmdoKKyqXR5aotsaUEc5un6NFq`.
It is probably the config for the NESTED token itself (nested.sh/launch lets creators pick fees, this config pays creators 0%).
Not confirmed that every coin on their site uses it.

## Values (decoded from the account)
| Setting | Nested | Orbit Pad now (`2TWtAE…`) |
|---|---|---|
| quoteMint | wrapped SOL | wrapped SOL |
| tokenType | 1 = Token-2022 | 0 = SPL |
| supply (6 decimals) | 100,000,000 | 1,000,000,000 |
| start market cap | ~144 SOL (sqrtStartPrice 699734819274987683) | 33 SOL |
| graduation market cap | ~719 SOL (migrationSqrtPrice 1564654622119360751) | 330 SOL |
| SOL raised to graduate (migrationQuoteThreshold) | 222.32 SOL | 79.28 SOL |
| tokens sold on curve (swapBaseAmount) | 69,098,300,504,197 raw (69%) | 759,746,913,835,568 raw (76%) |
| base fee | cliffFeeNumerator 500,000,000 (50%), 8 periods (firstFactor), 1 (secondFactor), 58,125,000 (thirdFactor), mode 0 linear => ends at 3.5% (35,000,000) | 10,000,000 (1%) flat |
| dynamic fee | off | ON |
| creatorTradingFeePercentage | 0 | 0 |
| migrationOption | 1 (DAMM v2) | 1 |
| migratedPoolFeeBps | 325 | 100 |
| migratedDynamicFee | 0 | 1 |
| LP after graduation | 100% permanently locked (partner) | same |
| enableFirstSwapWithMinFee | 1 | 1 |
| feeClaimer | 4j8Tzz8LhERdMrU7iDvahuRCBjt33VhATGLkw7HngdGH (burns NESTED, "buy and burn") | 9yjvPVhA8JM3KCaHduVtawW7xnvkXWuLJEMAnkSvpN8r |

## To copy it in `scripts/dbc-create-config.ts`
- `totalTokenSupply: 100_000_000`, `tokenType: TokenType.Token2022` (needs launch-flow changes, see below) or keep SPL
- `initialMarketCap: 144`, `migrationMarketCap: 719` (SDK rounds, so numbers come out close, not identical;
  for an exact copy pass the raw values above to `createConfig`)
- `baseFeeParams`: FeeSchedulerLinear, startingFeeBps 5000, endingFeeBps 350, numberOfPeriod 8, totalDuration 8
  (seconds, my reading of the schedule, UNVERIFIED)
- `dynamicFeeEnabled: false`, `creatorTradingFeePercentage: 0`
- `migratedPoolFee`: poolFeeBps 325, dynamicFee Disabled
- keep `partnerPermanentLockedLiquidityPercentage: 100`
- fee claimer: our own wallet (`DBC_FEE_CLAIMER`)

## Estimates (assumptions: SOL ~ $83, fee taken from the SOL input, Meteora keeps 20%)
- 1 SOL dev buy lifts market cap from ~144 SOL (~$11.9K) to ~145.5 SOL (~$12.1K); dev gets ~0.67% of supply at the 3.5% min fee
  (~0.35% if it pays the 50% opening fee).
- 1 dev buy + 10 buyers x 10 SOL (101 SOL) at 3.5% => ~3.54 SOL fees, ~2.83 SOL (~$235) to our fee claimer.
  Same volume at our current flat 1% => ~1.01 SOL fees, ~0.81 SOL to us (plus any dynamic fee).

## Cautions
- Token-2022 needs code changes (metadata, mint creation) and a devnet test. Copying only the economics on SPL is cheaper.
- The 50% opening fee hits early buyers, including a dev buy that is not in the same transaction as launch.
- 3.25% post-graduation fee is high next to our 1%.
- Our current config has the dynamic fee ON, so "1% fee" on How it works may be slightly low. Check before launch.
- A new config means a new address (`DBC_CONFIG` / `VITE_DBC_CONFIG`); it cannot be edited and old coins stay on the old one.
