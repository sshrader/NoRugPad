# Deploy on Railway (one service: site + API)

Railway runs `server/index.mjs`, which also serves the built website, so there is one app and one URL. Vercel is not needed.
Cost (Railway docs, check the page): Hobby plan $5/month including $5 of usage, 5 GB volume per service.

1. railway.com: sign in with GitHub, New Project, Deploy from GitHub repo, pick `sshrader/launchpad`. It reads `railway.json`.
2. Add a Volume to the service, mount path `/data`. Without it, coins and posts are wiped on every deploy.
3. Variables (Settings > Variables). The `VITE_` ones are read at BUILD time, so set them before the first build:
   - Always: `DATA_DIR=/data`, `PUBLIC_BASE_URL=https://<your-domain>`, `TRUST_PROXY=1`, `PINATA_JWT`, `LLM_API_KEY`, `LLM_DAILY_LIMIT`, `SOLANA_RPC_URL`, `DBC_CONFIG`, `VITE_DBC_CONFIG`, `VITE_RPC_URL`, `MARKET_MODE`
   - Devnet test deploy: `VITE_CLUSTER=devnet`, `MARKET_MODE=demo`
   - Mainnet: `VITE_CLUSTER=mainnet-beta`, `SOLANA_CLUSTER=mainnet-beta`, `MARKET_MODE=live`, `HSTS=1`, `LAUNCH_ALLOWLIST=<your wallet>`. See docs/MAINNET.md.
4. Settings > Networking > Generate Domain (or add your own). Open it, check `/api/health`.
5. Changing any `VITE_` variable needs a redeploy to take effect.

Never put secrets (`PINATA_JWT`, `LLM_API_KEY`, the server RPC key) in a `VITE_` variable. Those end up in the public website.
