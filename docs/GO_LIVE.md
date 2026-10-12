# Going live: checklist

Not legal advice. Costs are rough estimates unless a source is named.

## 1. Decide and get advice (before spending on anything else)
- [ ] Talk to a lawyer who knows crypto. Ask: can you operate, where, and what must you avoid (securities, gambling, money transmission, consumer protection)? Taking trading fees is what usually makes a launchpad a regulated business.
- [ ] Terms of service, risk disclosure, privacy policy. Geoblock regions your lawyer says to.
- [ ] Set up an entity (for example an LLC) and a business bank/accounting setup.

## 2. Safety of what users see
- [ ] Image moderation: scan or review uploads before they are shown. Block illegal content.
- [ ] Report and hide button, plus a takedown process (copyright complaints).
- [ ] Reserved names: block well-known brands, people, and "official" lookalikes.
- [ ] Output filter on cat chat and lore (they publish text under your brand). Keep the AI label. Never give price predictions or advice.
- [ ] Per-wallet limits on launches and chat to stop spam.

## 3. Money and keys
- [ ] Use a NEW partner wallet for mainnet, not `.devnet-keypair.json`. Hardware wallet or a multisig (for example Squads) if you can.
- [ ] Create the mainnet config with `npm run dbc-config` against a mainnet RPC. Decide the numbers deliberately (they cannot be edited later): start and graduation market cap, fee, creator share.
- [ ] Check Meteora's current terms, fees, audit report, and who runs graduation for third-party configs. The audit link is on the Meteora DBC GitHub page.
- [ ] Test claiming fees: `npm run dbc-fees`.
- [ ] Test graduation end to end (see below) on devnet.

## 4. Infrastructure
- [ ] Paid RPC (Helius Developer is $49 per month). Server and browser get separate keys; restrict the browser key by domain.
- [ ] Postgres instead of the JSON file store, with backups.
- [ ] HTTPS, domain, strict CORS, a trusted-proxy setting so rate limits see real visitor IPs.
- [ ] Hosting with logs, error alerts, uptime monitoring.
- [ ] Paid Pinata plan, or your own IPFS pinning.
- [x] Mainnet support is in the code; follow `docs/MAINNET.md` for the steps and env vars (`VITE_CLUSTER=mainnet-beta`, `SOLANA_CLUSTER`, `MARKET_MODE=live`).
- [ ] Set `LLM_DAILY_LIMIT` against real cost.

## 5. Security review
- [ ] Third-party review of the server and the launch/trade flow. (No curve audit needed if you stay on Meteora's audited program.)
- [ ] Optional bug bounty.

## 6. Rollout
1. Mainnet beta: allowlisted wallets, tiny limits, watch closely.
2. Fix what breaks. Re-check costs and abuse.
3. Open up gradually.

## Testing graduation on devnet
1. In `.env` temporarily set small values such as `DBC_INITIAL_MC=1` and `DBC_MIGRATION_MC=3` (run `npm run dbc-config -- --check` first: it prints how much SOL of buys fills the curve), then run `npm run dbc-config`, and point `DBC_CONFIG` and `VITE_DBC_CONFIG` at the NEW config. Restart.
2. Launch a coin and buy until the progress bar reaches 100%.
3. Wait a few minutes for Meteora's service, or run `npm run dbc-migrate -- <mint>` (or use https://migrator.meteora.ag).
4. The coin page should then say the coin moved to a DEX.
5. Change `.env` back to your real config afterwards.
