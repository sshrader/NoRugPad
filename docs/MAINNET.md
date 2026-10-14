# Mainnet runbook

The code now supports mainnet (`VITE_CLUSTER=mainnet-beta`). Read `docs/GO_LIVE.md` first: the legal, moderation and security items there are not code and are not done.

## What the code now enforces
- The server refuses to start on mainnet unless `SOLANA_CLUSTER=mainnet-beta`, `MARKET_MODE=live`, `DBC_CONFIG`, `PINATA_JWT` and a non-public RPC are all set. It checks the real network from the RPC's genesis hash, so a devnet URL can't pass as mainnet and the reverse.
- Partner scripts (`dbc-config`, `dbc-fees`, `dbc-migrate`, `dbc-inspect`) print which network they are on. Anything that spends real SOL needs `--confirm-mainnet`.
- Beta controls: `LAUNCH_ALLOWLIST` (only listed wallets launch), `MAX_LAUNCHES_PER_WALLET_PER_DAY`, a per-IP API limit, optional `BLOCKED_COUNTRIES`, security headers, optional HSTS.
- Uploads are tied to the wallet that made them, and only that wallet can register the coin.
- The banner, footer and trade box switch to real-money warnings; the "Get test SOL" button is devnet only; explorer links drop `?cluster=`.

## Steps
1. **Two wallets.**
   - *Deployer:* a throwaway key file that only pays for creating the config. Save it OUTSIDE the repo, set `PARTNER_KEYPAIR=/path/to/file.json`, fund it with a little SOL.
   - *Fee claimer:* a hardware wallet (Ledger via Phantom) or multisig address. Set `DBC_FEE_CLAIMER=<address>` and `VITE_FEE_CLAIMER=<address>`. This wallet alone can claim fees and receive leftover tokens, FOREVER (it is written into the config). Back up its recovery phrase offline.
   - Fees are claimed by connecting the fee claimer wallet at `https://<your site>/#/admin` and clicking Claim all. The `dbc-fees` script only works when the claimer is the key-file wallet (devnet); otherwise use `--check` to look.
2. **RPC.** Get a paid mainnet RPC. Use one key for the server (`SOLANA_RPC_URL`) and a separate domain-restricted key for the browser (`VITE_RPC_URL`).
3. **Check the curve numbers.** `npm run dbc-config -- --check` with your real `DBC_INITIAL_MC`, `DBC_MIGRATION_MC`, `DBC_FEE_BPS`, `DBC_CREATOR_FEE_PCT`. Market caps are in SOL, so the dollar size moves with the SOL price. Confirm Meteora's current fee terms.
4. **Create the config.** Same command without `--check`, plus `--confirm-mainnet`. It is permanent. Put the printed key in both `DBC_CONFIG` and `VITE_DBC_CONFIG`.
5. **Server env (production).** `SOLANA_CLUSTER=mainnet-beta`, `MARKET_MODE=live`, `PINATA_JWT`, `LLM_API_KEY`, `LLM_DAILY_LIMIT`, `PUBLIC_BASE_URL=https://your-domain`, `TRUST_PROXY=1`, `HSTS=1`, `LAUNCH_ALLOWLIST=<your wallets>` for the beta.
6. **Build and run.** `VITE_CLUSTER=mainnet-beta VITE_RPC_URL=... VITE_DBC_CONFIG=... npm run build`, then `node server/index.mjs` behind HTTPS (Caddy, nginx, or Cloudflare). The server serves `dist/`.
7. **Smoke test with your own wallet and tiny amounts.** Launch one coin, buy, sell, run `npm run dbc-fees -- --check`, open the coin in Phantom. Then check whether it shows on the terminals you care about.
8. **Open up** by clearing `LAUNCH_ALLOWLIST` only after the checklist items you consider required are done.

## Still not done in code
- Postgres (the JSON file store is fine for a small beta only; back up `server/data/`). Hosts with ephemeral disks lose it on redeploy: use a persistent volume.
- Image moderation, report/hide, reserved-name blocking, output filter on pet text.
- Terms of service, privacy policy, geoblock list: need your lawyer.
- Rate limits and the launch counter are in memory; they reset on restart and don't span multiple server instances.
- No in-app trading after graduation (the coin trades on Jupiter and other DEXs).
