// Debug helper: shows what the Meteora SDK returns for a coin's pool.  npm run dbc-inspect -- <mint>
import 'dotenv/config';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const mint = process.argv[2];
if (!mint) throw new Error('Usage: npm run dbc-inspect -- <mint address>');
const c = new DynamicBondingCurveClient(new Connection(process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'), 'confirmed'), 'confirmed');
const pool = await c.state.getPoolByBaseMint(mint);
console.log('pool found:', !!pool);
if (pool) {
  console.log('pool address:', pool.publicKey.toBase58());
  console.log('account keys:', Object.keys(pool.account));
  const f: any = (pool.account as any).poolState ?? pool.account;
  console.log('config:', f.config?.toBase58?.(), ' creator:', f.creator?.toBase58?.(), ' isMigrated:', f.isMigrated);
}
