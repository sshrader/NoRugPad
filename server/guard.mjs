// Production safety for the API: network check, headers, region blocking, beta allowlist, launch limits.
import fs from 'node:fs';
import path from 'node:path';
import { rateLimit } from './limits.mjs';

const MAINNET_GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

const BLOCKED = list(process.env.BLOCKED_COUNTRIES).map((c) => c.toUpperCase()); // e.g. US,KP,IR (ISO codes)
const ALLOWLIST = list(process.env.LAUNCH_ALLOWLIST); // beta: only these wallets can launch. Empty = everyone.
const MAX_LAUNCHES = Number(process.env.MAX_LAUNCHES_PER_WALLET_PER_DAY || 3);

/** Reads the visitor's country from the CDN header (Cloudflare: CF-IPCountry, others: X-Vercel-IP-Country, CloudFront). */
const countryOf = (req) =>
  String(req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || req.headers['cloudfront-viewer-country'] || '').toUpperCase();

export function applyGuards(app) {
  // Behind a proxy/CDN set TRUST_PROXY=1 so rate limits see the real visitor IP instead of the proxy's.
  if (process.env.TRUST_PROXY) app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.HSTS) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Region block for the API. Needs a CDN that sets a country header; with none, blocking cannot work (warned at startup).
  if (BLOCKED.length) {
    app.use('/api', (req, res, next) => {
      if (req.path === '/health') return next();
      if (BLOCKED.includes(countryOf(req))) return res.status(451).json({ error: 'Pawpad is not available in your region.' });
      next();
    });
  }

  // Cheap global limit per IP so scripts cannot hammer the API.
  app.use('/api', (req, res, next) => {
    if (!rateLimit(`api:${req.ip}`, Number(process.env.API_PER_MINUTE || 240), 60_000)) {
      return res.status(429).json({ error: 'Too many requests. Slow down.' });
    }
    next();
  });
}

/** Checks for creating a coin. Returns an error string, or null when allowed. */
export function launchAllowed(wallet) {
  if (ALLOWLIST.length && !ALLOWLIST.includes(wallet)) return 'Launching is limited to invited wallets during the beta.';
  if (!rateLimit(`launch:${wallet}`, MAX_LAUNCHES, 24 * 3_600_000)) return `Launch limit reached (${MAX_LAUNCHES} per day per wallet).`;
  return null;
}
export const launchesRestricted = () => ALLOWLIST.length > 0;

/** Refuses unsafe mainnet setups. Call once at startup. Returns the network name. */
export async function checkNetwork(connection) {
  const mainnet = (await connection.getGenesisHash().catch(() => '')) === MAINNET_GENESIS;
  const wanted = (process.env.SOLANA_CLUSTER || '').toLowerCase(); // set to "mainnet-beta" on the real deployment
  if (wanted === 'mainnet-beta' && !mainnet) throw new Error('SOLANA_CLUSTER=mainnet-beta but SOLANA_RPC_URL is not a mainnet RPC.');
  if (mainnet && wanted !== 'mainnet-beta') throw new Error('SOLANA_RPC_URL is MAINNET but SOLANA_CLUSTER is not set to mainnet-beta. Set it on purpose.');
  if (mainnet) {
    const problems = [];
    if (process.env.MARKET_MODE !== 'live') problems.push('MARKET_MODE must be "live" (demo shows fake prices).');
    if (!process.env.DBC_CONFIG) problems.push('DBC_CONFIG is empty (mainnet needs the curve config).');
    // Images need a public home: either IPFS (PINATA_JWT) or this site's own https address (PUBLIC_BASE_URL, files kept on the DATA_DIR volume).
    const base = process.env.PUBLIC_BASE_URL || '';
    const publicHttps = /^https:\/\//i.test(base) && !/localhost|127\.0\.0\.1/i.test(base);
    if (!process.env.PINATA_JWT && !publicHttps) problems.push('Images have nowhere public to live: set PINATA_JWT (IPFS) or set PUBLIC_BASE_URL to your https site address.');
    if (!process.env.PINATA_JWT && publicHttps && !process.env.DATA_DIR) problems.push('PUBLIC_BASE_URL is used for images, so DATA_DIR must point at a persistent volume (e.g. /data), or uploads vanish on redeploy.');
    if (/api\.mainnet-beta\.solana\.com/.test(process.env.SOLANA_RPC_URL || '')) problems.push('Use a paid RPC, not the public mainnet endpoint.');
    // The data folder must be on a mounted volume, not the container's throwaway disk (everything would vanish on redeploy).
    if (process.env.ALLOW_EPHEMERAL_DATA !== '1') {
      try {
        const dir = path.resolve(process.env.DATA_DIR || 'server/data');
        fs.mkdirSync(dir, { recursive: true });
        if (fs.statSync(dir).dev === fs.statSync(path.parse(dir).root).dev) {
          problems.push(`DATA_DIR (${dir}) is not on a mounted volume, so coins and images would be erased on every redeploy. Attach a volume at that path (set ALLOW_EPHEMERAL_DATA=1 only if your host keeps this disk).`);
        }
      } catch (e) {
        problems.push(`Cannot use DATA_DIR: ${e.message}`);
      }
    }
    if (problems.length) throw new Error('Mainnet config problems:\n - ' + problems.join('\n - '));
    if (BLOCKED.length === 0) console.warn('WARNING: BLOCKED_COUNTRIES is empty. Ask your lawyer whether you need to block regions.');
    if (!process.env.TRUST_PROXY) console.warn('WARNING: TRUST_PROXY is not set. Behind a proxy, rate limits will see one IP for everyone.');
  }
  return mainnet ? 'mainnet-beta' : 'devnet/testnet';
}
