# Pawpad (devnet starter)

Wallet connection, real token creation on Solana devnet, and a small API that stores coins and pairs each one with a cat. This is steps 1 and 2 of the plan. The bonding curve and the AI cats come later.

> **Status:** written without being able to install or compile it (the build environment blocked the npm registry). Treat the first `npm install` / `npm run dry-run` as the test. If anything fails, paste the error and it is a quick fix.

## 1. Prepare Phantom (devnet)

1. Create a **separate Phantom account just for development**. Never use one that holds real funds.
2. Phantom → Settings → Developer Settings → turn on **Testnet Mode** → choose **Solana Devnet**.
3. You will get test SOL with the **Get test SOL** button in the app, or at https://faucet.solana.com.

## 2. Run it

Requires Node 20 or newer.

```bash
npm install
cp .env.example .env     # optional for a first run
npm run dry-run          # offline: checks the transaction is built correctly
npm run dry-run -- --send   # online: sends a real test coin to devnet with a throwaway keypair
npm run dev              # API on :8787, site on :5173
```

Open http://localhost:5173, connect Phantom, click **Get test SOL**, fill in the form, **Launch coin**. Phantom asks you to approve one transaction.

Run `npm run dry-run -- --send` first if you can. It tests the on-chain part with no wallet or browser involved, so if something fails later you know it is the browser or wallet layer.

## What happens when you click Launch

1. **Upload.** The browser sends the image, name, ticker and description to `POST /api/upload`. The server stores the image and a metadata JSON file and returns the metadata link.
2. **One transaction** (`src/lib/createCoin.ts`), signed in Phantom: create mint, initialise (6 decimals), create your token account, mint 1,000,000,000 tokens, attach the metadata, revoke mint authority, revoke freeze authority. All or nothing.
3. **Register.** The browser sends the mint and signature to `POST /api/coins`. The server does not trust it. It reads the chain itself and rejects the coin unless the mint exists, both authorities are revoked, and the transaction succeeded and was paid by the creator. It then pairs a cat by hashing the mint address, so the pairing looks random but cannot be rerolled.

## Metadata storage

- **Local mode (default).** Files go to `server/uploads/`. The flow works, but the image link is `http://localhost…`, so Phantom and explorers cannot load it and the picture will not show.
- **Pinata mode.** Create a free Pinata account, make an API key (JWT), put it in `.env` as `PINATA_JWT`. Images and metadata then go to IPFS and show up everywhere. The upload call is in `server/index.mjs` (`pinFile`). If Pinata changed its API, that function is the only place to edit.

## Files

```
server/index.mjs        API: upload, register (verifies on chain), list
server/cats.mjs         the cat roster
server/store.mjs        JSON-file storage (swap for a real database later)
src/lib/createCoin.ts   the transaction. Start reading here.
src/lib/api.ts          client calls to the API
src/components/         create form, coin list
src/App.tsx             header, wallet button, balance, test-SOL button
scripts/dry-run.ts      tests the transaction without a browser
```

## Known limits (on purpose, for now)

- **The creator receives the whole supply.** That is the starter model, not a launchpad. In the next step an Anchor program holds the supply and sells it along a bonding curve.
- Metadata is **immutable** (`isMutable: false`), so a typo in the name is permanent. Fine on devnet.
- No rate limiting, accounts, or spam protection on the API.
- JSON-file storage, no database.
- Not audited. Do not use on mainnet without a security review and legal advice.

## Switching to testnet

Set `VITE_CLUSTER=testnet` and `SOLANA_RPC_URL=https://api.testnet.solana.com`, and switch Phantom to Solana Testnet. Devnet is the better choice for development: testnet is meant for validator testing and is less stable.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `Buffer is not defined` in the browser | `src/polyfills.ts` must be the first import in `main.tsx` |
| Phantom does not appear in the wallet list | Phantom not installed or locked in this browser profile |
| Transaction is simulated and fails in Phantom | Wrong network: Phantom must be on Devnet, and the site's RPC must match |
| Airdrop fails | The public faucet is rate limited. Use https://faucet.solana.com |
| "Unknown upload" on register | The API restarted between upload and register. Launch again |
| Register says authority not revoked | The transaction did not include the two revoke steps. It should not happen unless the code was edited |
