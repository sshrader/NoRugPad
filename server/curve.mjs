// Meteora Dynamic Bonding Curve helpers (server side): check a new pool, and read its price.
import { PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient, getPriceFromSqrtPrice } from '@meteora-ag/dynamic-bonding-curve-sdk';

export const dbcConfig = () => (process.env.DBC_CONFIG || process.env.VITE_DBC_CONFIG || '').trim();
export const curveEnabled = () => dbcConfig().length > 0;

const BASE_DECIMALS = 6;
const QUOTE_DECIMALS = 9;
const SUPPLY = () => Number(process.env.DBC_SUPPLY || 1_000_000_000);

// Some SDK versions wrap the pool fields in .poolState; accept both shapes.
const fields = (account) => account?.poolState ?? account;

const clients = new WeakMap();
function client(connection) {
  if (!clients.has(connection)) clients.set(connection, new DynamicBondingCurveClient(connection, 'confirmed'));
  return clients.get(connection);
}

/** Returns { pool } when the mint has a pool made from OUR config and created by `creator`, else { error }. */
export async function verifyPool(connection, mint, creator) {
  const pool = await client(connection).state.getPoolByBaseMint(new PublicKey(mint));
  if (!pool) return { error: 'No bonding-curve pool exists for this mint yet.' };
  const f = fields(pool.account);
  if (!f?.config || !f?.creator) return { error: `Unexpected pool data from the SDK (keys: ${Object.keys(pool.account || {}).join(', ')}).` };
  if (f.config.toBase58() !== dbcConfig()) return { error: 'This pool was not made with the Pawpad curve config.' };
  if (f.creator.toBase58() !== creator) return { error: 'Pool creator does not match the wallet.' };
  return { pool: pool.publicKey.toBase58() };
}

let sol = { at: 0, usd: null };
export async function solUsd() {
  if (Date.now() - sol.at < 60_000 && sol.usd) return sol.usd;
  try {
    const r = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112', {
      signal: AbortSignal.timeout(6000),
    });
    const pairs = ((await r.json()).pairs || []).filter((p) => p.baseToken?.address === 'So11111111111111111111111111111111111111112');
    pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    const usd = Number(pairs[0]?.priceUsd);
    if (usd > 0) sol = { at: Date.now(), usd };
  } catch {
    // fall through to the last known value or the fallback
  }
  return sol.usd || Number(process.env.SOL_USD_FALLBACK || 150);
}

const states = new Map();

/** Current state of a curve pool: market cap in SOL, curve progress, and whether it has graduated.
 *  Looks up the pool by its address (cheap) and caches for 10 seconds, so polling pages do not hammer the RPC. */
export async function curveState(connection, poolAddress) {
  const hit = states.get(poolAddress);
  if (hit && Date.now() - hit.at < 10_000) return hit.value;
  const c = client(connection);
  const raw = await c.state.getPool(poolAddress);
  const account = raw?.account ?? raw;
  if (!account) return null;
  const f = fields(account);
  const priceSol = getPriceFromSqrtPrice(f.sqrtPrice, BASE_DECIMALS, QUOTE_DECIMALS).toNumber();
  const progress = await c.state.getPoolQuoteTokenCurveProgress(poolAddress).catch(() => 0);
  const value = { mcSol: priceSol * SUPPLY(), priceSol, progress, migrated: f.isMigrated !== 0 };
  states.set(poolAddress, { at: Date.now(), value });
  return value;
}
