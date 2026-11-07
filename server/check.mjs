// Safety checks for a coin, read from the chain (and RugCheck when on mainnet). Nothing here is taken from the browser.
// These are facts and third-party signals, not a verdict: a coin that passes can still lose value.
import { PublicKey } from '@solana/web3.js';

const cache = new Map();
const TTL = 60_000;
const RUGCHECK_TTL = 5 * 60_000;

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 10000) / 100 : 0);

/** Mint and freeze authority, straight from the mint account. */
async function authorities(connection, mint) {
  const acc = await connection.getParsedAccountInfo(new PublicKey(mint));
  const info = acc?.value?.data?.parsed?.info;
  if (!info) return null;
  return {
    mintAuthority: info.mintAuthority ?? null,
    freezeAuthority: info.freezeAuthority ?? null,
    supply: Number(info.supply) / 10 ** info.decimals,
    rawSupply: Number(info.supply),
    decimals: info.decimals,
  };
}

/** Top holders by wallet. Token accounts owned by programs (off the ed25519 curve) and the curve's own vault are listed apart,
 *  because they are not people. Concentration is measured over the whole supply. */
async function holders(connection, mint, auth, vault, creator) {
  const largest = (await connection.getTokenLargestAccounts(new PublicKey(mint))).value;
  const owners = await connection.getMultipleParsedAccounts(largest.map((l) => l.address));
  const rows = largest.map((l, i) => {
    const owner = owners.value[i]?.data?.parsed?.info?.owner ?? null;
    const isVault = vault && l.address.toBase58() === vault;
    let program = false;
    try {
      program = owner ? !PublicKey.isOnCurve(new PublicKey(owner).toBytes()) : false;
    } catch {
      program = false;
    }
    return {
      account: l.address.toBase58(),
      owner,
      amount: Number(l.amount),
      pct: pct(Number(l.amount), auth.rawSupply),
      kind: isVault ? 'curve' : program ? 'program' : 'wallet',
      creator: owner != null && owner === creator,
    };
  });
  const wallets = rows.filter((r) => r.kind === 'wallet').sort((a, b) => b.amount - a.amount);
  const top10 = wallets.slice(0, 10).reduce((s, r) => s + r.pct, 0);
  return {
    top10Pct: Math.round(top10 * 100) / 100,
    top1Pct: wallets[0]?.pct ?? 0,
    creatorPct: wallets.find((r) => r.creator)?.pct ?? 0,
    holders: rows.slice(0, 10),
    curvePct: rows.filter((r) => r.kind === 'curve').reduce((s, r) => s + r.pct, 0),
    programPct: Math.round(rows.filter((r) => r.kind === 'program').reduce((s, r) => s + r.pct, 0) * 100) / 100,
  };
}

const rc = new Map();
/** RugCheck's public report. Only meaningful on mainnet. Returns null when unavailable, never throws. */
export async function rugcheck(mint, fetchImpl = fetch) {
  const hit = rc.get(mint);
  if (hit && Date.now() - hit.at < RUGCHECK_TTL) return hit.value;
  let value = null;
  try {
    const r = await fetchImpl(`https://api.rugcheck.xyz/v1/tokens/${encodeURIComponent(mint)}/report/summary`, { signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const j = await r.json();
      value = {
        score: typeof j.score_normalised === 'number' ? j.score_normalised : typeof j.score === 'number' ? j.score : null,
        risks: (Array.isArray(j.risks) ? j.risks : []).slice(0, 8).map((x) => ({
          name: String(x.name ?? '').slice(0, 80),
          level: String(x.level ?? 'info'),
          description: String(x.description ?? '').slice(0, 200),
        })),
        lpLockedPct: typeof j.lpLockedPct === 'number' ? Math.round(j.lpLockedPct * 100) / 100 : null,
        url: `https://rugcheck.xyz/tokens/${mint}`,
      };
    }
  } catch {
    value = null;
  }
  rc.set(mint, { at: Date.now(), value });
  return value;
}

/** Everything the coin page shows in its safety panel. `vault` is the curve's base-token vault, when known. */
export async function checkCoin(connection, coin, { vault, mainnet, fetchImpl } = {}) {
  const hit = cache.get(coin.mint);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const auth = await authorities(connection, coin.mint);
  if (!auth) throw new Error('Mint account not found.');
  const [h, r] = await Promise.all([
    holders(connection, coin.mint, auth, vault, coin.creator).catch(() => null),
    mainnet ? rugcheck(coin.mint, fetchImpl) : Promise.resolve(null),
  ]);
  const value = {
    checkedAt: Date.now(),
    mintRevoked: auth.mintAuthority === null,
    freezeRevoked: auth.freezeAuthority === null,
    mintAuthority: auth.mintAuthority,
    freezeAuthority: auth.freezeAuthority,
    supply: auth.supply,
    holders: h,
    rugcheck: r,
    rugcheckNote: mainnet ? (r ? null : 'RugCheck has no report for this coin yet.') : 'RugCheck only covers mainnet.',
  };
  cache.set(coin.mint, { at: Date.now(), value });
  return value;
}
