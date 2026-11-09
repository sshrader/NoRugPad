import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { getMarket, startSampler } from './market.mjs';
import { curveEnabled, verifyPool, poolVault } from './curve.mjs';
import { checkCoin } from './check.mjs';
import { applyGuards, checkNetwork, launchAllowed, launchesRestricted, walletAllowed } from './guard.mjs';
import { AiError, aiBudget, aiEnabled, makeConcept, makeMascot } from './ai.mjs';
import * as store from './store.mjs';

const PORT = Number(process.env.PORT || 8787);
const RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const PINATA_JWT = process.env.PINATA_JWT || '';
const IPFS_GATEWAY = (process.env.IPFS_GATEWAY || 'https://ipfs.io').replace(/\/$/, '');
// Uploaded images live next to the JSON store so they sit on the same persistent volume (DATA_DIR).
const UPLOAD_DIR = path.resolve(process.env.DATA_DIR || 'server/data', 'uploads');

// Show only the host of the RPC URL anywhere it is displayed or logged: the URL usually contains a secret API key.
const RPC_HOST = (() => {
  try {
    return new URL(RPC_URL).host;
  } catch {
    return 'unknown';
  }
})();
const connection = new Connection(RPC_URL, 'confirmed');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const IMAGE_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });

const app = express();
app.disable('x-powered-by');
applyGuards(app);
app.use(express.json({ limit: '50kb' }));

// Local mode only: files we saved ourselves. nosniff stops browsers from guessing a type.
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, { setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }),
);

const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);

// Optional social links. Each returns '' (empty), a clean https URL, or null (invalid).
const LINK_HOSTS = { twitter: ['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com'], telegram: ['t.me', 'telegram.me'] };
function cleanLink(kind, raw) {
  const v = clean(raw, 200);
  if (!v) return '';
  if (kind === 'website') {
    try {
      const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      if (u.protocol !== 'https:' || u.username || u.password || !u.hostname.includes('.')) return null;
      return u.href;
    } catch {
      return null;
    }
  }
  let handle = v.replace(/^@/, '');
  const asUrl = /^(www\.)?(x\.com|twitter\.com|t\.me|telegram\.me)\//i.test(v) ? `https://${v}` : v;
  if (/^https?:\/\//i.test(asUrl)) {
    try {
      const u = new URL(asUrl);
      if (!LINK_HOSTS[kind].includes(u.hostname.toLowerCase())) return null;
      handle = u.pathname.split('/').filter(Boolean)[0] || '';
    } catch {
      return null;
    }
  }
  const ok = kind === 'twitter' ? /^[A-Za-z0-9_]{1,15}$/ : /^[A-Za-z0-9_]{5,32}$/;
  if (!ok.test(handle)) return null;
  return kind === 'twitter' ? `https://x.com/${handle}` : `https://t.me/${handle}`;
}

/* ------------------------------ storage ------------------------------ */

async function pinFile(buffer, filename, type) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type }), filename);
  form.append('network', 'public');
  const r = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  });
  if (!r.ok) throw new Error(`Pinata upload failed (${r.status}): ${(await r.text()).slice(0, 200)}`);
  const json = await r.json();
  const cid = json?.data?.cid;
  if (!cid) throw new Error('Pinata did not return a CID.');
  return `${IPFS_GATEWAY}/ipfs/${cid}`;
}

async function saveLocal(buffer, filename) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `${PUBLIC_BASE_URL}/uploads/${filename}`;
}

/* ------------------------------ routes ------------------------------ */

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, rpc: RPC_HOST, storage: PINATA_JWT ? 'pinata' : 'local' });
});

// Step 1 of creating a coin: store the image and the metadata JSON, return the metadata link
// that goes on chain. Nothing is trusted from the client later; /api/coins reads this record back.
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    let creatorKey;
    try {
      creatorKey = new PublicKey(String(req.body.creator)).toBase58();
    } catch {
      return bad(res, 'Connect your wallet first.');
    }
    const blocked = launchAllowed(creatorKey); // beta allowlist + per-wallet daily limit
    if (blocked) return bad(res, blocked, 429);
    const name = clean(req.body.name, 32);
    const symbol = clean(req.body.symbol, 10).toUpperCase();
    const description = clean(req.body.description, 280);
    const links = {};
    for (const [kind, label] of [['website', 'Website'], ['twitter', 'X / Twitter'], ['telegram', 'Telegram']]) {
      const v = cleanLink(kind, req.body[kind]);
      if (v === null) return bad(res, `${label} link is not valid.`);
      if (v) links[kind] = v;
    }
    if (!name) return bad(res, 'Name is required (up to 32 characters).');
    if (!/^[A-Z0-9]{2,10}$/.test(symbol)) return bad(res, 'Ticker must be 2-10 letters or numbers.');
    if (!req.file) return bad(res, 'Choose an image.');
    const ext = IMAGE_TYPES[req.file.mimetype];
    if (!ext) return bad(res, 'Image must be PNG, JPEG, WebP or GIF.');

    const id = crypto.randomUUID();
    let imageUrl;
    let metadataUri;
    const metadataFor = (image) =>
      JSON.stringify({
        name,
        symbol,
        description,
        image,
        ...links,
        ...(Object.keys(links).length ? { extensions: links } : {}),
        properties: { files: [{ uri: image, type: req.file.mimetype }], category: 'image' },
      });

    if (PINATA_JWT) {
      imageUrl = await pinFile(req.file.buffer, `${id}.${ext}`, req.file.mimetype);
      metadataUri = await pinFile(Buffer.from(metadataFor(imageUrl)), `${id}.json`, 'application/json');
    } else {
      imageUrl = await saveLocal(req.file.buffer, `${id}.${ext}`);
      metadataUri = await saveLocal(Buffer.from(metadataFor(imageUrl)), `${id}.json`);
    }
    if (metadataUri.length > 200) return bad(res, 'Metadata link is too long for on-chain storage (200 max).', 500);

    const record = { id, creator: creatorKey, name, symbol, description, ...links, imageUrl, metadataUri, createdAt: Date.now() };
    await store.update('uploads.json', {}, (all) => ({ ...all, [id]: record }));
    res.json({ uploadId: id, metadataUri, imageUrl, storage: PINATA_JWT ? 'pinata' : 'local' });
  } catch (e) {
    console.error('upload failed', e);
    bad(res, e.message || 'Upload failed.', 500);
  }
});

async function retry(fn, tries = 8, ms = 1000) {
  for (let i = 0; i < tries; i++) {
    const v = await fn();
    if (v) return v;
    await sleep(ms);
  }
  return null;
}

// Step 3: after the wallet signed and the transaction confirmed, the client registers the coin.
// The server checks the chain itself instead of believing the client.
app.post('/api/coins', async (req, res) => {
  try {
    const { mint, signature, creator, uploadId } = req.body ?? {};
    let mintKey, creatorKey;
    try {
      mintKey = new PublicKey(String(mint));
      creatorKey = new PublicKey(String(creator));
    } catch {
      return bad(res, 'mint and creator must be valid Solana addresses.');
    }
    if (typeof signature !== 'string' || signature.length < 60 || signature.length > 100) return bad(res, 'Missing transaction signature.');

    const uploads = await store.get('uploads.json', {});
    const up = uploads[String(uploadId)];
    if (!up) return bad(res, 'Unknown upload. Upload the image again.', 404);
    if (up.creator && up.creator !== creatorKey.toBase58()) return bad(res, 'This upload belongs to a different wallet.', 403);

    const existing = await store.get('coins.json', []);
    if (existing.some((c) => c.mint === mintKey.toBase58())) return bad(res, 'This coin is already registered.', 409);

    // 1. The mint exists. Plain mode: nobody can mint more or freeze holders.
    //    Curve mode: the mint has a pool made from our config by this creator.
    const acct = await retry(async () => (await connection.getParsedAccountInfo(mintKey, 'confirmed')).value);
    const data = acct?.data;
    if (!data || data.parsed?.type !== 'mint') return bad(res, 'That address is not a token mint on this network yet.');
    let pool = null;
    if (curveEnabled()) {
      let v;
      for (let i = 0; i < 8; i++) {
        v = await verifyPool(connection, mintKey.toBase58(), creatorKey.toBase58()).catch((e) => ({ error: e.message }));
        if (!v.error) break;
        await sleep(1000); // the pool can take a moment to show up
      }
      if (v.error) return bad(res, v.error);
      pool = v.pool;
      if (data.parsed.info.mintAuthority === creatorKey.toBase58()) return bad(res, 'The creator still controls minting, so this coin is not accepted.');
    } else {
      if (data.program !== 'spl-token') return bad(res, 'That address is not a token mint on this network yet.');
      if (data.parsed.info.mintAuthority !== null) return bad(res, 'Mint authority is not revoked, so this coin is not accepted.');
      if (data.parsed.info.freezeAuthority !== null) return bad(res, 'Freeze authority is not revoked, so this coin is not accepted.');
    }

    // 2. The transaction succeeded, was paid for by the creator, and involved this mint.
    const tx = await retry(() =>
      connection.getParsedTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 }),
    );
    if (!tx || tx.meta?.err) return bad(res, 'Transaction not found or it failed.');
    const keys = tx.transaction.message.accountKeys;
    if (keys[0].pubkey.toBase58() !== creatorKey.toBase58()) return bad(res, 'Creator does not match the transaction payer.');
    if (!keys.some((k) => k.pubkey.toBase58() === mintKey.toBase58())) return bad(res, 'Transaction does not involve this mint.');

    // Block-zero dev buy, read from the chain (never taken from the browser): the tokens the creator holds
    // right after the launch transaction, which can only come from a buy in that same transaction.
    let devBuy = null;
    if (pool) {
      const bal = (tx.meta?.postTokenBalances || []).find((b) => b.mint === mintKey.toBase58() && b.owner === creatorKey.toBase58());
      const tokens = Number(bal?.uiTokenAmount?.uiAmount || 0);
      if (tokens > 0) devBuy = { tokens, pct: Math.round((tokens / Number(process.env.DBC_SUPPLY || 1_000_000_000)) * 10_000) / 100 };
    }

    const coin = {
      mint: mintKey.toBase58(),
      creator: creatorKey.toBase58(),
      signature,
      name: up.name,
      symbol: up.symbol,
      description: up.description,
      ...(up.website ? { website: up.website } : {}),
      ...(up.twitter ? { twitter: up.twitter } : {}),
      ...(up.telegram ? { telegram: up.telegram } : {}),
      imageUrl: up.imageUrl,
      metadataUri: up.metadataUri,
      createdAt: Date.now(),
      ...(pool ? { curve: true, pool } : {}),
      ...(devBuy ? { devBuy } : {}),
    };
    await store.update('coins.json', [], (all) => [coin, ...all]);
    res.status(201).json(coin);
  } catch (e) {
    console.error('register failed', e);
    bad(res, e.message || 'Could not register the coin.', 500);
  }
});

// Images we stored ourselves are shown from this site's own /uploads path, so a link saved with
// the wrong host (e.g. http://localhost:8787 on a deployed site) still loads.
const localImage = (c) => ({ ...c, imageUrl: String(c.imageUrl || '').replace(/^https?:\/\/[^/]+(?=\/uploads\/)/, '') });

app.get('/api/coins', async (_req, res) => {
  const coins = await store.get('coins.json', []);
  res.json(coins.slice(0, 100).map(localImage));
});

/* ------------------------------ coins and market ------------------------------ */

const findCoin = async (mint) => (await store.get('coins.json', [])).find((c) => c.mint === mint);

app.get('/api/coins/:mint', async (req, res) => {
  const coin = await findCoin(req.params.mint);
  if (!coin) return bad(res, 'Unknown coin.', 404);
  res.json(localImage(coin));
});

// Market cap for every coin (no history), for the Explore page.
app.get('/api/market', async (_req, res) => {
  const coins = await store.get('coins.json', []);
  const out = {};
  await Promise.all(
    coins.map(async (c) => {
      const { history, ...m } = await getMarket(c.mint, c, connection).catch(() => ({ source: 'error' }));
      out[c.mint] = m;
    }),
  );
  res.json(out);
});

app.get('/api/coins/:mint/market', async (req, res) => {
  const coin = await findCoin(req.params.mint);
  if (!coin) return bad(res, 'Unknown coin.', 404);
  res.json(await getMarket(coin.mint, coin, connection));
});

// AI helpers for the launch page. Both need a valid wallet that is allowed to launch, and are rate limited and capped per day.
app.get('/api/ai/status', (_req, res) => res.json({ enabled: aiEnabled() }));

function aiRoute(kind, work) {
  return async (req, res) => {
    try {
      if (!aiEnabled()) return bad(res, 'The generator is not set up on this server.', 503);
      let wallet;
      try {
        wallet = new PublicKey(String(req.body.creator)).toBase58();
      } catch {
        return bad(res, 'Connect your wallet first.');
      }
      if (!walletAllowed(wallet)) return bad(res, 'Launching is limited to invited wallets during the beta.', 403);
      aiBudget(kind, req.ip, wallet);
      res.json(await work(String(req.body.text ?? '')));
    } catch (e) {
      if (e instanceof AiError) return bad(res, e.message, e.status);
      console.error('ai route failed', e);
      bad(res, 'Something went wrong. Try again.', 500);
    }
  };
}
app.post('/api/ai/concept', aiRoute('text', (t) => makeConcept(t)));
app.post('/api/ai/mascot', aiRoute('image', (t) => makeMascot(t)));

// On-chain safety facts for the coin page: authorities, holder concentration, and RugCheck on mainnet.
app.get('/api/coins/:mint/check', async (req, res) => {
  const coin = await findCoin(req.params.mint);
  if (!coin) return bad(res, 'Unknown coin.', 404);
  try {
    const vault = coin.pool ? await poolVault(connection, coin.pool).catch(() => null) : null;
    res.json(await checkCoin(connection, coin, { vault, mainnet: (process.env.SOLANA_CLUSTER || '').toLowerCase() === 'mainnet-beta' }));
  } catch (e) {
    bad(res, `Could not run the checks: ${e.message}`, 502);
  }
});

// In production, serve the built client from the same process.
const DIST = path.resolve('dist');
if (await fs.stat(DIST).then(() => true, () => false)) {
  app.use(express.static(DIST));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return bad(res, err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 2 MB.' : err.message);
  console.error(err);
  bad(res, 'Server error.', 500);
});

const network = await checkNetwork(connection).catch((e) => {
  console.error('\nRefusing to start:', e.message);
  process.exit(1);
});

if (curveEnabled() && process.env.MARKET_SAMPLER !== 'off') startSampler(connection, Math.max(2000, Number(process.env.MARKET_SAMPLE_MS) || 5000));

await store.resetIfRequested();

app.listen(PORT, () => {
  console.log(`Network: ${network}${launchesRestricted() ? ' (launches limited to the allowlist)' : ''}`);
  console.log(`Meme Factory API on http://localhost:${PORT}  (rpc: ${RPC_HOST}, storage: ${PINATA_JWT ? 'pinata' : 'local'})`);
});
