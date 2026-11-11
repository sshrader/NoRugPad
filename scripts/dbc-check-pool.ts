/**
 * Read-only: show which Meteora Dynamic Bonding Curve config a coin (or a config address) uses, and print the curve
 * settings so two configs can be compared. Spends nothing, needs no wallet.
 *
 *   npm run dbc-check-pool -- <coin mint OR config address> [<second mint or config to compare>]
 *
 * Set SOLANA_RPC_URL to a MAINNET RPC (for example your Helius URL) in .env first.
 * Note: a coin that has graduated (moved to a DAMM v2 pool) may no longer be found by its mint.
 * In that case pass the config address instead (found on Solscan: the create_config transaction).
 */
import 'dotenv/config';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const MAINNET_GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const OURS = process.env.DBC_CONFIG_KEY || '2TWtAE9TG6KiCta64ActWJ2u8QZXK1MrmsiExTDLLJE8';

// Turn BN / PublicKey / nested objects into plain printable values, so field names do not matter.
function plain(v: any): any {
  if (v === null || v === undefined) return v;
  if (v instanceof PublicKey) return v.toBase58();
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'object' && typeof v.toString === 'function' && v.constructor?.name === 'BN') return v.toString();
  if (Array.isArray(v)) return v.map(plain);
  if (typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
}

async function loadConfig(client: DynamicBondingCurveClient, input: string) {
  const key = new PublicKey(input);
  // 1) maybe it is a config address
  try {
    const cfg = await client.state.getPoolConfig(key);
    if (cfg) return { configKey: key.toBase58(), cfg, via: 'config address' };
  } catch {
    /* fall through */
  }
  // 2) maybe it is a coin mint
  const pool: any = await client.state.getPoolByBaseMint(key);
  if (!pool) throw new Error(`${input}: not a DBC config and no bonding-curve pool found for it as a mint (graduated coins often are not found; use the config address).`);
  const configKey = pool.account.config as PublicKey;
  const cfg = await client.state.getPoolConfig(configKey);
  return { configKey: configKey.toBase58(), cfg, via: `pool ${pool.publicKey.toBase58()}`, pool: plain(pool.account) };
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!args[0]) throw new Error('Usage: npm run dbc-check-pool -- <coin mint or config address> [<another to compare>]');
  const url = process.env.SOLANA_RPC_URL;
  if (!url) throw new Error('Set SOLANA_RPC_URL to a mainnet RPC address in .env first.');
  const connection = new Connection(url, 'confirmed');
  if ((await connection.getGenesisHash()) !== MAINNET_GENESIS && !process.argv.includes('--allow-devnet')) {
    throw new Error('SOLANA_RPC_URL is not mainnet. In PowerShell: $env:SOLANA_RPC_URL = "<your mainnet RPC URL>" and run again.');
  }
  const client = new DynamicBondingCurveClient(connection, 'confirmed');

  const targets = args.length > 1 ? args.slice(0, 2) : [args[0], OURS];
  const loaded: any[] = [];
  for (const t of targets) {
    const r = await loadConfig(client, t);
    const flat = plain(r.cfg);
    loaded.push({ ...r, flat });
    console.log(`\n=== ${t} ===`);
    console.log(`Found as: ${r.via}`);
    console.log(`Config:   ${r.configKey}${r.configKey === OURS ? '   <-- this is Orbit Pad\'s config' : ''}`);
    console.log(JSON.stringify(flat, null, 2));
  }

  const [a, b] = loaded;
  console.log('\n=== Differences (first vs second) ===');
  if (a.configKey === b.configKey) {
    console.log('Same config address. Identical curve.');
    return;
  }
  const sa = JSON.stringify(a.flat);
  const sb = JSON.stringify(b.flat);
  if (sa === sb) console.log('Different addresses but every setting is identical.');
  else {
    const keys = new Set([...Object.keys(a.flat), ...Object.keys(b.flat)]);
    for (const k of keys) {
      const x = JSON.stringify(a.flat[k]);
      const y = JSON.stringify(b.flat[k]);
      if (x !== y) console.log(`${k}:\n  first:  ${x?.slice(0, 400)}\n  second: ${y?.slice(0, 400)}`);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
