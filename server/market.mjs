// Market cap data for a coin.
//   MARKET_MODE=demo  (default) a made-up, randomly moving market cap, for testing.
//   MARKET_MODE=live  real numbers from DexScreener, looked up by the coin's mint address (CA).
// DexScreener only lists coins that trade on a DEX on mainnet, so devnet coins have no live data.
import crypto from 'node:crypto';
import * as store from './store.mjs';
import { curveState, solUsd } from './curve.mjs';

const mode = () => (process.env.MARKET_MODE === 'live' ? 'live' : 'demo');
const STEP = 5 * 60_000; // one chart point per 5 minutes
const POINTS = 288; // 24 hours

// Deterministic noise in (-1, 1) for a given coin and step.
function noise(mint, k) {
  const h = crypto.createHash('sha256').update(`${mint}:${k}`).digest();
  return h.readUInt32BE(0) / 0xffffffff * 2 - 1;
}

function demo(mint) {
  const now = Date.now();
  const n = Math.floor(now / STEP);
  const base = 20_000 + (crypto.createHash('sha256').update(mint).digest().readUInt32BE(4) % 380_000);
  // Mean-reverting random walk, so the line wanders but stays plausible.
  let x = 0;
  const xs = [];
  for (let k = n - POINTS - 200; k <= n; k++) {
    x = x * 0.97 + noise(mint, k) * 0.09;
    if (k > n - POINTS) xs.push({ t: k * STEP, x });
  }
  const history = xs.map((p) => ({ t: p.t, mc: Math.round(base * Math.exp(p.x)) }));
  // The newest point wiggles every few seconds so the page visibly moves.
  const tick = Math.floor(now / 5000);
  const mc = Math.round(base * Math.exp(xs[xs.length - 1].x + noise(mint, `live${tick}`) * 0.012));
  history.push({ t: now, mc });
  return { source: 'demo', mc, history, change24h: ((mc - history[0].mc) / history[0].mc) * 100 };
}

const cache = new Map();
async function dexscreener(mint) {
  const hit = cache.get(mint);
  if (hit && Date.now() - hit.at < 15_000) return hit.pair;
  const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mint)}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`DexScreener ${res.status}`);
  const body = await res.json();
  const pairs = (body.pairs || []).filter((p) => p.baseToken?.address === mint);
  pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
  const pair = pairs[0] || null;
  cache.set(mint, { at: Date.now(), pair });
  return pair;
}

async function live(mint) {
  let pair;
  try {
    pair = await dexscreener(mint);
  } catch (e) {
    return { source: 'error', message: e.message, history: [] };
  }
  const prior = (await store.get('market.json', {}))[mint] || [];
  if (!pair) return { source: 'none', history: prior };
  const mc = pair.marketCap ?? pair.fdv;
  if (!mc) return { source: 'none', history: prior };

  // DexScreener has no free history endpoint, so we record a point each time we look.
  let history = prior;
  const last = prior[prior.length - 1];
  if (!last || Date.now() - last.t >= 30_000) {
    const next = await store.update('market.json', {}, (all) => {
      all[mint] = [...(all[mint] || []), { t: Date.now(), mc }].slice(-2000);
      return all;
    });
    history = next[mint];
  }
  return {
    source: 'dexscreener',
    mc,
    priceUsd: Number(pair.priceUsd) || null,
    change24h: pair.priceChange?.h24 ?? null,
    pairUrl: pair.url,
    history,
  };
}

// Coins on the bonding curve: the market cap comes from the curve's own price.
// After the coin graduates to a DEX, DexScreener takes over (live mode only).
async function curve(mint, poolAddress, connection) {
  let st;
  try {
    st = await curveState(connection, poolAddress);
  } catch (e) {
    return { source: 'error', message: e.message, history: [] };
  }
  if (!st) return { source: 'none', history: [] };
  if (st.migrated && mode() === 'live') return live(mint);
  const usd = await solUsd();
  const mc = st.mcSol * usd;
  const prior = (await store.get('market.json', {}))[mint] || [];
  let history = prior;
  const last = prior[prior.length - 1];
  if (!last || Date.now() - last.t >= 30_000) {
    const next = await store.update('market.json', {}, (all) => {
      all[mint] = [...(all[mint] || []), { t: Date.now(), mc }].slice(-2000);
      return all;
    });
    history = next[mint];
  }
  const first = history[0]?.mc || mc;
  return {
    source: 'curve',
    mc,
    mcSol: st.mcSol,
    progress: st.progress,
    migrated: st.migrated,
    change24h: first ? ((mc - first) / first) * 100 : 0,
    history: history.length > 1 ? history : [{ t: Date.now() - 1, mc }, { t: Date.now(), mc }],
  };
}

export async function getMarket(mint, coin, connection) {
  if (coin?.curve && coin.pool && connection) return curve(mint, coin.pool, connection);
  return mode() === 'live' ? live(mint) : demo(mint);
}
export const marketMode = mode;
